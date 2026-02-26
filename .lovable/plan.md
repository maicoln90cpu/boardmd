
## Auditoria completa (Push / envio de mensagens / templates) + Plano de correção do “efeito debandada” no iOS

### Escopo do pedido
Você relatou que **ao abrir o app no iOS** chegam **30–40 notificações de uma vez**, muitas repetidas, e que o sistema **não respeita regras/templates**.

Pelo que encontrei no código + nos logs do backend (tabela `push_logs` e logs da função `send-onesignal`), isso está acontecendo por uma combinação de **arquitetura atual (client-side scheduler)** + **falta de deduplicação global (backend)** + **alguns pontos do app ainda enviando push sem respeitar template**.

---

## 1) Como o sistema está HOJE (mapa de disparos)

### 1.1. Push via OneSignal (backend function `send-onesignal`)
- **Quem chama:** o app (frontend) chama `oneSignalNotifier.send(...)`, que invoca a função `send-onesignal`.
- **Entrega multi-device:** a notificação é enviada para todos os devices do usuário.
- **Fallback:** se falhar por `external_id`, tenta por **tag `user_id`** (isso já está ativo).
- **Problema atual:** **não existe deduplicação global** no backend. Se 2 devices abrirem o app, ambos podem “re-disparar” os mesmos pushes.

### 1.2. Alertas de prazo (principal causa da “debandada”)
**Arquivo:** `src/hooks/useDueDateAlerts.ts`  
**Onde roda:** `src/pages/Index.tsx` chama `useDueDateAlerts(state.allTasks)` (sempre que você entra na home `/` logado).

Comportamento atual:
- Ao montar, ele roda **imediatamente** `checkDueDates()` (linha ~413–415).
- Para **cada tarefa atrasada** ele pode disparar:
  - toast (UI)
  - browser notification
  - push (OneSignal) via `sendOneSignalPush('due_overdue', ...)`

Evidência do problema:
- No seu backend há **26 tarefas atrasadas abertas**.
- Nos logs, há minutos com **40+ `due_overdue`** em 1 minuto.
- Também há duplicatas do MESMO `taskId + due_overdue` na MESMA janela de minuto (ex.: `c=2`), o que indica **mais de um “emissor” concorrente** (ex.: mais de um device/sessão rodando o mesmo scheduler).

### 1.3. “Tarefa concluída” ainda tem um ponto enviando push sem respeitar template
**Arquivo:** `src/hooks/tasks/useTasks.ts` (função `updateTask`)  
Trecho encontrado: quando `updates.is_completed === true`, ele chama:
```ts
oneSignalNotifier.send({
  user_id: user.id,
  title: '✅ Tarefa Concluída!',
  body: `"${task?.title || ''}" foi concluída`,
  notification_type: 'task_completed',
  ...
})
```
Isso **ignora totalmente** o `template.enabled`. Mesmo que o template esteja OFF, aqui ainda envia push.

> Isso explica casos onde “template desativado” ainda disparava.

### 1.4. Conquistas/gamificação também ignoram templates
**Arquivo:** `src/hooks/useUserStats.ts`  
Ele chama `oneSignalNotifier.sendAchievement(...)`, que usa `notification_type: 'achievement'` e **não verifica template**.

### 1.5. Templates desativados não bloqueiam “todos os canais”
Mesmo no `useDueDateAlerts.ts`, hoje a checagem de template é aplicada **apenas** para o envio de push via OneSignal (dentro de `sendOneSignalPush`).  
Os **toasts e browser notifications** ainda são exibidos mesmo que o template esteja OFF.

Você confirmou que quer:
- **Template desativado = bloquear push + toast + browser**.

---

## 2) Causas raiz (por que acontece a “debandada” e duplicatas)

### Causa A — O app dispara backlog inteiro ao abrir
Como você tem muitas tarefas atrasadas (26), o hook `useDueDateAlerts` faz um loop e dispara push **por tarefa**. Isso por si só já gera um “pacote” grande ao abrir o app.

### Causa B — Sem deduplicação global, múltiplos devices duplicam
Se você abre no iOS e também tem outro device/sessão (ou até o próprio iOS em mais de um contexto) executando o scheduler, cada um chama o backend, e o backend envia push novamente — **globalmente**.

Os dados confirmam isso: há `taskId` com **2 envios do mesmo template no mesmo minuto**.

### Causa C — Alguns disparos não respeitam templates
`useTasks.updateTask` e `useUserStats` ainda disparam push sem checar template.

---

## 3) Sua preferência (confirmada pelas respostas)
- **Muitas atrasadas:** “Resumo único”
- **Deduplicação:** “Global no backend”
- **Template desativado:** “Bloquear todos canais”

Vamos desenhar a correção exatamente em cima disso.

---

## 4) Plano de correção (execução real em etapas)

### Etapa 1 — Deduplicação GLOBAL no backend (a correção mais importante)
**Arquivo:** `supabase/functions/send-onesignal/index.ts`

**Objetivo:** se a notificação já foi enviada recentemente, o backend **não envia de novo**, mesmo que 2 devices tentem ao mesmo tempo.

**Como:**
1) Padronizar um `dedup_key` (chave única):
   - Para prazo: `due_overdue:<taskId>` / `due_warning:<taskId>` etc.
   - Para evento: `task_completed:<taskId>`
   - Para resumo: `due_overdue_summary:<date>` (ou com janela de 4h)
2) Antes de enviar ao OneSignal, consultar `push_logs` buscando:
   - `user_id = payload.user_id`
   - `data->>'dedup_key' = <dedup_key>`
   - `timestamp > now() - interval '4 hours'` (mesma janela usada hoje no client)
   - `status in ('sent','sent_fallback')` (ou equivalentes)
3) Se existir, **retornar success** sem enviar (e opcionalmente logar `status='dedup_skipped'`).

**Por que isso resolve:**
- Mesmo que o iOS dispare “tudo” ao abrir, **não terá repetição** ao abrir de novo.
- Mesmo que 2 devices abram juntos, só o primeiro passa; o segundo será bloqueado.

**Impacto:** alto benefício, risco baixo (mudança contida no backend de push).

---

### Etapa 2 — Resumo único de atrasadas (para parar os 30–40 pushes)
**Arquivo:** `src/hooks/useDueDateAlerts.ts` + `src/lib/defaultNotificationTemplates.ts` + UI de templates

**Comportamento novo:**
- Se houver “muitas” atrasadas (ex.: `>= 5`, configurável), ao invés de mandar 1 push por tarefa:
  - enviar **1 push resumo**: “Você tem 26 tarefas atrasadas. Abra o app para revisar.”
  - **não enviar** `due_overdue` individual para cada uma nesse ciclo
- E esse resumo também fica protegido pela dedup global (Etapa 1), então não repete.

**Detalhes técnicos:**
- Adicionar template `due_overdue_summary` (categoria reminder).
- Implementar coleta:
  - `overdueTasks = tasks.filter(isOverdue && !completed && !excludedColumn)`
  - Se `overdueTasks.length >= threshold`:
    - enviar `due_overdue_summary` com variáveis `count` + (opcional) top 3 títulos
    - retornar antes do loop de `due_overdue` individuais
- Manter alertas `urgent/warning/early` como estão (mas também protegidos por dedup global).

---

### Etapa 3 — “Template OFF bloqueia TUDO” (push + toast + browser)
**Arquivo:** `src/hooks/useDueDateAlerts.ts`

Hoje o `enabled` só corta o push.
Vamos ajustar para:
- Antes de exibir toast / browser notification / push, checar template:
  - se `enabled === false`: não fazer nada (nenhum canal)

Isso alinha com o que você pediu.

---

### Etapa 4 — Respeitar template no `task_completed` em 100% dos lugares
**Arquivos:**
- `src/hooks/tasks/useTasks.ts` (corrigir o envio hardcoded em `updateTask`)
- `src/hooks/useUserStats.ts` (conquistas respeitarem templates)
- (opcional) padronizar um helper único pra enviar push respeitando templates.

**Correção específica do bug atual:**
- Substituir o push hardcoded de `updateTask` por:
  - pegar template do settings
  - checar `enabled`
  - formatar conteúdo pelo template
  - enviar via `oneSignalNotifier.send(...)` incluindo `dedup_key`

---

### Etapa 5 — Auditoria/observabilidade (para nunca mais ficar “cego”)
**Sem mudar schema (só payload em `data` do push_logs):**
- Sempre incluir em `payload.data`:
  - `dedup_key`
  - `trigger_source` (`due_date`, `task_completed`, `achievement`, `template_test`)
  - `client_instance_id` (um UUID salvo em localStorage no device)
  - `app_route` (rota atual ao disparar)
Isso permite rastrear *qual device/contexto* causou disparos e confirmar se o dedup global está funcionando.

---

## 5) Viabilidade (banco / código / regras)

### Mudança em banco de dados (schema)?
- **Não é obrigatório.** Dá para fazer tudo usando:
  - consulta à tabela existente `push_logs`
  - `data` (jsonb) para armazenar `dedup_key` e metadados
- (Opcional futuro) criar índice em `push_logs (user_id, (data->>'dedup_key'), timestamp)` para performance em escala.

### Mudança em código-fonte?
- Sim:
  - `send-onesignal` (backend)
  - `useDueDateAlerts.ts`
  - `useTasks.ts`
  - `useUserStats.ts`
  - `defaultNotificationTemplates.ts` + editor para mostrar novo template

### Mudança de regra de negócio?
- Sim (por sua escolha):
  - atrasadas viram **resumo único**
  - templates OFF bloqueiam **todos os canais**
  - dedup global vira “fonte da verdade”

---

## 6) Análise de impacto (antes x depois)

### Antes
- Abrir o app com muitas atrasadas:
  - dispara N pushes (N = nº de tarefas atrasadas)
- Se abrir em 2 devices:
  - duplica (pode virar 2N)
- Template OFF:
  - ainda pode disparar em pontos que ignoram template
  - ainda pode mostrar toast/browser mesmo OFF

### Depois
- Abrir o app com muitas atrasadas:
  - dispara **1** push resumo
- Abrir em 2 devices:
  - backend bloqueia repetição (dedup global)
- Template OFF:
  - bloqueia push + toast + browser
- Logs ficam explicáveis via `dedup_key` e `trigger_source`

---

## 7) Risco estimado + complexidade (com notas)

Vou usar “limite seguro” = **28 pontos** (soma de risco + complexidade por item, onde cada nota é 0–10).

| Item | Risco (0-10) | Complexidade (0-10) | Pontos |
|---|---:|---:|---:|
| Dedup global no backend (send-onesignal) | 3 | 5 | 8 |
| Resumo único de atrasadas | 4 | 6 | 10 |
| Template OFF bloqueia todos canais | 2 | 4 | 6 |
| Corrigir `task_completed` hardcoded + conquistas | 3 | 4 | 7 |
| Observabilidade (metadados em data json) | 2 | 3 | 5 |
| **Total** |  |  | **36 (acima do limite 28)** |

**Interpretação:** é um conjunto grande (vale a pena), mas para manter segurança operacional eu executaria em 2 releases:

- **Release 1 (mais urgente / menor risco):**
  1) Dedup global no backend  
  2) Corrigir `useTasks.updateTask` respeitando templates  
  3) Template OFF bloqueia todos canais (pelo menos nos alertas de prazo)  
  **Estimativa:** ~21 pontos

- **Release 2:**
  4) Resumo único de atrasadas  
  5) Observabilidade completa + conquistas/templates  
  **Estimativa:** ~15 pontos

---

## 8) Checklist de testes manuais (simulação do “mundo real”)

### A) Anti-debandada no iOS
1. No iOS, feche o app (swipe para matar).
2. Abra o app.
3. **Esperado:** chega no máximo **1 push** de resumo (se houver muitas atrasadas).
4. Abra de novo em menos de 4 horas.
5. **Esperado:** não chega push repetido (dedup global).

### B) Duplicação multi-device
1. Deixe um device A (desktop) logado no app.
2. Abra o app no iOS (device B).
3. **Esperado:** nenhum template “duplica” no minuto; push_logs mostra `dedup_skipped` quando o segundo device tenta.

### C) Template OFF bloqueia tudo
1. Desative `due_overdue` e `due_warning` nos templates.
2. Abra o app com tarefas vencidas.
3. **Esperado:** sem push, sem toast, sem browser notification.

### D) `task_completed` OFF
1. Deixe `task_completed` desativado.
2. Conclua uma tarefa por:
   - clique no card (desktop)
   - swipe (mobile)
3. **Esperado:** não envia push nem toast/browser (se aplicável ao evento).

### E) Regressão geral
- Confirmar que “Testar template” ainda envia (somente se template estiver ON).
- Confirmar que histórico `/notifications > histórico` continua carregando e mostrando status corretamente.

---

## 9) Arquivos que serão mexidos (quando você autorizar a execução)
- `supabase/functions/send-onesignal/index.ts` (dedup global + logging)
- `src/hooks/useDueDateAlerts.ts` (resumo único + template OFF bloqueia tudo + dedup_key)
- `src/hooks/tasks/useTasks.ts` (respeitar template no task_completed)
- `src/hooks/useUserStats.ts` (respeitar template para conquistas / ou bloquear conforme configuração)
- `src/lib/defaultNotificationTemplates.ts` (novo template de resumo)
- `src/components/NotificationTemplatesEditor.tsx` (garantir que o novo template apareça corretamente)

