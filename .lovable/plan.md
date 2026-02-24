
# Plano: Corrigir Notificações Ignorando Templates Desativados + Cascata

## Problema 1: Template "Tarefa Concluída" desativado mas push é enviado

### Causa raiz
Os 3 locais que enviam push de `task_completed` chamam `oneSignalNotifier.send()` DIRETAMENTE, sem verificar se o template está habilitado (`enabled`). O código simplesmente envia o push hardcoded sem consultar os templates do usuário.

**Locais afetados:**
- `src/components/TaskCard.tsx` linha 314 (tarefa recorrente)
- `src/components/TaskCard.tsx` linha 371 (tarefa normal)
- `src/components/kanban/MobileKanbanView.tsx` linha 94 (swipe mobile)

Nenhum desses verifica `getTemplateById(userTemplates, 'task_completed')?.enabled`.

### Solucao
Criar uma funcao helper que verifica o template antes de enviar, e substituir todas as 3 chamadas diretas por essa funcao.

### Arquivos a modificar:
- `src/components/TaskCard.tsx`: Verificar template antes de enviar push (2 locais)
- `src/components/kanban/MobileKanbanView.tsx`: Verificar template antes de enviar push (1 local)

---

## Problema 2: Cascata - Ao concluir tarefa, TODAS as notificacoes de prazo disparam novamente

### Causa raiz
Quando uma tarefa e concluida:
1. O `TaskCard` dispara `window.dispatchEvent(new CustomEvent("task-updated"))` (linha 337/380)
2. Isso causa re-fetch das tasks pelo hook `useTasks`
3. A lista `tasks` muda (nova referencia de array)
4. O `useEffect` em `useDueDateAlerts` (dependencia: `[tasks, ...]`) re-executa
5. O `notifiedTasksRef` e recarregado do `localStorage` com `loadNotifiedSet(snoozeMinutes)`
6. **MAS** o `saveNotifiedSet` salva TODOS os items com `timestamp: now` - ou seja, ao salvar, reescreve os timestamps

O problema real: na linha 170-171, TODA VEZ que o efeito re-executa, ele recarrega o set do localStorage com o snooze. Se o snooze e 30 minutos e o usuario completou uma tarefa ha menos de 30 min, os items ja notificados PERMANECEM. Porem, o `saveNotifiedSet` na linha 77-81 REESCREVE todos os timestamps para `Date.now()`, o que efetivamente "renova" o cooldown.

Na verdade, o bug da cascata e mais sutil: quando o efeito re-executa (porque `tasks` mudou), ele chama `checkDueDates()` imediatamente (linha 396). Mas as chaves de dedup dos pushes usam `pendingPushesRef` que e limpo entre execucoes, e `pushTimestampsRef` com dedup de 4 horas. Entao os pushes NAO deveriam re-disparar...

A menos que o push de `task_completed` NAO use esse mecanismo de dedup (e realmente nao usa - ele chama `oneSignalNotifier.send()` diretamente, sem dedup). E como o `task_completed` atualiza o banco, isso causa o re-fetch, que causa o re-run do efeito de due dates, que chama `checkDueDates()` imediatamente.

O `checkDueDates` deveria estar protegido pelo `notifiedTasksRef`, mas na linha 170-171 ele FAZ RELOAD do localStorage. Vamos investigar se o reload preserva os items...

Sim, `loadNotifiedSet` filtra por `snoozeMs` - os items salvos recentemente (< 30 min) sao mantidos. Entao os items ja notificados NAO deveriam ser re-notificados.

**Possivel causa real da cascata**: O push de 4h dedup funciona, MAS os toasts e browser notifications NAO tem esse dedup. Eles usam apenas o `notifiedTasksRef` que e recarregado do localStorage. Se o localStorage foi corrompido ou limpo, TUDO dispara novamente.

**Conclusao**: O mecanismo de dedup local funciona, mas o re-load na linha 170-171 pode ter um timing issue. Mais importante: o `snoozeMinutes` padrao e 30 min, entao se ja passou 30 min desde a ultima notificacao, TUDO e re-notificado (toasts + browser + push). O push tem o dedup de 4h, mas toasts e browser nao tem.

### Solucao
1. Separar o dedup de toasts/browser do push - usar o mesmo `pushTimestampsRef` para toasts tambem (evitar re-exibir toasts dentro de 4h)
2. NAO recarregar `notifiedTasksRef` do localStorage toda vez que o efeito re-executa. Carregar apenas no mount e manter em memoria.

---

## Resumo de Alteracoes

| Arquivo | Alteracao |
|---|---|
| `src/components/TaskCard.tsx` | Verificar `template.enabled` antes de enviar push task_completed (2 locais) |
| `src/components/kanban/MobileKanbanView.tsx` | Verificar `template.enabled` antes de enviar push task_completed (1 local) |
| `src/hooks/useDueDateAlerts.ts` | Mover load do localStorage para fora do efeito (apenas no mount); evitar re-notificar toasts/browser dentro do periodo de dedup |

## Analise de Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Verificar template.enabled no TaskCard | Baixo | 2/10 |
| Verificar template.enabled no MobileKanbanView | Baixo | 2/10 |
| Corrigir reload do notifiedTasksRef | Medio | 4/10 |
| **Total** | **Baixo-Medio** | **8/30 - Abaixo do limite seguro** |

### Vantagens
- Templates desativados serao respeitados em TODOS os locais de disparo
- Nao havera cascata de re-notificacoes ao concluir uma tarefa
- Dedup unificado para toasts, browser e push

### Desvantagens
- Nenhuma significativa

## Checklist de Testes Manuais

- [ ] Desativar template "Tarefa Concluida" nos Templates
- [ ] Concluir uma tarefa no Kanban - NAO deve receber push de "Tarefa Concluida"
- [ ] Verificar que NAO houve cascata de notificacoes de prazo apos concluir
- [ ] Reativar template e concluir outra tarefa - DEVE receber push
- [ ] Concluir tarefa no mobile (swipe) - verificar mesmo comportamento
- [ ] Aguardar 15 min e verificar que notificacoes de prazo continuam funcionando normalmente
