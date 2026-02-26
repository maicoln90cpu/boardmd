

# Plano: Refatorar Sistema de Notificações Push (Simplificação Total)

## Diagnóstico dos Dados Reais (push_logs)

Analisei os logs do backend nas últimas 48h:

- **154 `due_overdue` enviados em 25/Feb** — todos com `dedup_key: null` (código antigo ainda ativo, sem dedup no backend)
- **14 pushes individuais disparados no MESMO SEGUNDO** (23:49:28) — e depois MAIS 14 nos próximos 24 segundos (23:49:52) — total de 28 em 24 segundos para as mesmas tarefas
- **Após o fix (26/Feb)**: apenas 2 `due_overdue_summary` + 2 `due_early` + 1 `due_urgent` = 5 pushes em 24h — corretamente deduplicados, porém agora quase silencioso demais
- **Colunas excluídas ESTÃO funcionando** — nenhuma tarefa da coluna "Recorrente" aparece nos logs (o filtro funciona). As 154 notificações eram todas de tarefas na coluna "PRIORIDADE"

### Causa raiz dos 3 problemas:

1. **"Quase não avisa mais"**: O resumo único + dedup de 4h = máximo 6 pushes/dia. Correto tecnicamente, mas o intervalo é longo demais
2. **"Envia tudo de uma vez ao abrir"**: O hook roda `checkDueDates()` imediatamente no mount. Se o localStorage do device está vazio (iOS limpa cache), tudo dispara junto
3. **"Colunas excluídas não funcionam"**: Na verdade funcionam — os logs confirmam. Mas como você tem 14+ tarefas atrasadas em "PRIORIDADE", parece que vem de tudo

### Problema arquitetural:
O sistema tem **5 camadas de dedup sobrepostas** (notifiedTasksRef, pushTimestampsRef, pendingPushesRef, localStorage, backend dedup_key), cada uma com regras diferentes. Isso gera bugs imprevisíveis e torna impossível debugar.

---

## Plano: Simplificar para 3 Regras Claras

### Regra de Ouro
Se a tarefa tem lembretes configurados individualmente (`notification_settings.reminders`), esses são a ÚNICA fonte de notificação para aquela tarefa. Nenhum alerta global interfere.

### Regra Global (fallback)
Para tarefas SEM lembretes individuais, o sistema usa os thresholds globais (dueDateHours). Mas com uma lógica mais simples.

### Regra de Dedup
Dedup acontece em **UM lugar só**: o backend (Edge Function). Remove toda a complexidade de localStorage.

---

## Alterações

### 1. Reescrever `useDueDateAlerts.ts` (simplificação radical)

**Remover:**
- `loadNotifiedSet` / `saveNotifiedSet` / `STORAGE_KEY` (localStorage de toasts)
- `loadPushTimestamps` / `savePushTimestamps` / `PUSH_STORAGE_KEY` (localStorage de push)
- `pendingPushesRef` / `pushTimestampsRef`
- Toda a lógica dual de dedup (local + push)

**Manter:**
- `notifiedTasksRef` como Set simples em memória (só previne re-toast na mesma sessão)
- `checkInterval` para controlar frequência de verificação
- Verificação de `excludedColumns`
- Verificação de template `enabled`
- Overdue summary (>= 5 atrasadas = 1 resumo)

**Novo fluxo por tarefa:**
```
1. Tarefa em coluna excluída? → SKIP
2. Tarefa concluída ou em "Concluído"? → SKIP  
3. Tarefa tem lembretes individuais? → Usar SÓ esses
4. Senão → Usar thresholds globais
5. Já notificou nesta sessão? (memória) → SKIP toast/browser
6. Push → sendPushWithTemplate (backend faz dedup)
```

### 2. Remover push duplicado de `TaskCard.tsx` e `MobileKanbanView.tsx`

Atualmente, ao concluir uma tarefa, o push é enviado de **3 lugares**:
- `TaskCard.tsx` linha 319 (recorrente) — `oneSignalNotifier.send()` direto, sem dedup_key
- `TaskCard.tsx` linha 381 (normal) — `oneSignalNotifier.send()` direto, sem dedup_key  
- `useTasks.ts` linha 357 — `sendPushWithTemplate()` com dedup_key

**Ação**: Remover os 2 envios do TaskCard e do MobileKanbanView. O `useTasks.updateTask` já faz o envio correto via `sendPushWithTemplate`.

### 3. Ajustar janela de dedup no backend

Reduzir de 4h para **2h** para que as notificações legítimas cheguem com mais frequência, sem causar spam.

### 4. Simplificar menu de Preferências

Remover configurações que causam confusão:
- **Remover "Soneca"** (snoozeMinutes) — irrelevante agora que o dedup é no backend
- Manter: toggle on/off, antecedência (dueDateHours), frequência de verificação, colunas excluídas

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---|---|
| `src/hooks/useDueDateAlerts.ts` | Reescrever com lógica simplificada (remover 5 camadas de dedup, manter 1 em memória) |
| `src/components/TaskCard.tsx` | Remover envio direto de push task_completed (2 locais) |
| `src/components/kanban/MobileKanbanView.tsx` | Remover envio direto de push task_completed |
| `supabase/functions/send-onesignal/index.ts` | Reduzir janela dedup de 4h para 2h |
| `src/components/notifications/NotificationPreferences.tsx` | Remover campo "Soneca" |

## Análise de Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Reescrever useDueDateAlerts | 4 | 6 |
| Remover push duplicado TaskCard/Mobile | 2 | 2 |
| Ajustar dedup backend | 1 | 1 |
| Simplificar Preferências | 1 | 1 |
| **Total** | **8** | **10 — Abaixo do limite 28** |

### Antes vs Depois

**Antes**: 5 camadas de dedup, 3 locais de envio de task_completed, localStorage que corrompe entre devices, push com e sem dedup_key misturados, máximo 5 pushes/dia

**Depois**: 1 dedup (backend), 1 local de envio por evento, Set em memória só para toasts na sessão, todos os pushes com dedup_key, ~12 pushes/dia (janela 2h)

### Vantagens
- Sistema previsível e debugável
- Lembretes individuais da tarefa (regra de ouro) sempre funcionam
- Sem dependência de localStorage entre devices
- Menos código = menos bugs

### Desvantagens
- Toasts podem repetir se você ficar com o app aberto por muito tempo (mas push não repete)

## Checklist de Testes Manuais

- [ ] Abrir app no iOS com tarefas atrasadas → deve receber 1 push resumo (não 30+)
- [ ] Fechar e reabrir em menos de 2h → NÃO deve receber push repetido
- [ ] Concluir tarefa → deve receber APENAS 1 push (não 2 ou 3)
- [ ] Desativar template → nenhuma notificação (push, toast, browser)
- [ ] Tarefa em coluna "Recorrente" (excluída) → ZERO notificações
- [ ] Tarefa com lembrete individual de 2h → receber push exatamente 2h antes
- [ ] Tarefa SEM lembrete individual → usar threshold global (dueDateHours)

