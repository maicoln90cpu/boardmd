
# Plano: 3 Correcoes - Tarefas Recorrentes, Templates Push, Remover VAPID

## 1. Corrigir tarefas recorrentes sumindo ao riscar (filtro de data)

### Diagnostico
O problema esta no filtro de data em `KanbanBoard.tsx` (linhas 219 e 222). Quando o filtro "atrasadas" ou "hoje + atrasadas" esta ativo:

```
case "overdue":
  return taskDueDate && isBefore(...) && !t.is_completed;  // linha 219
case "overdue_today":
  const isOverdueTask = isBefore(...) && !t.is_completed;  // linha 222
```

O `!t.is_completed` exclui tarefas concluidas do filtro de data. A protecao para recorrentes (linha 257) so e avaliada DEPOIS, no bloco `hideCompletedTasks` - mas a tarefa ja foi eliminada pelo filtro de data antes de chegar la.

**Fluxo atual (bugado):**
1. Tarefa recorrente atrasada, `is_completed = true`
2. Filtro "overdue" verifica: `!t.is_completed` = `false` -> tarefa EXCLUIDA
3. Nunca chega ao bloco de protecao de recorrentes na linha 257

**Fluxo corrigido:**
1. Tarefa recorrente atrasada, `is_completed = true`
2. Filtro "overdue" verifica: tem `recurrence_rule`? Sim -> incluir mesmo concluida
3. Tarefa aparece riscada ate o reset

### Alteracao
No `KanbanBoard.tsx`, nos cases "overdue" e "overdue_today", permitir tarefas recorrentes concluidas:

```
case "overdue":
  return taskDueDate && isBefore(startOfDay(taskDueDate), today) && (!t.is_completed || !!t.recurrence_rule);
case "overdue_today":
  const isOverdueTask = isBefore(startOfDay(taskDueDate), today) && (!t.is_completed || !!t.recurrence_rule);
```

### Risco: Baixo | Complexidade: 1/10

---

## 2. Conectar templates de push ao OneSignal

### Diagnostico
Dos 12 templates em `defaultNotificationTemplates.ts`, apenas 4 (due_overdue, due_urgent, due_warning, due_early) sao disparados via `usePushNotifications.ts`. Os outros 8 templates existem mas NUNCA sao chamados.

O `oneSignalNotifier.ts` ja tem funcoes prontas (`sendAchievement`, `sendPomodoroComplete`, `sendDailyReminder`) mas nenhum hook as invoca.

### Templates a conectar

| Template | Onde conectar | Hook/Arquivo |
|----------|--------------|--------------|
| `task_completed` | Ao marcar tarefa como concluida | `src/hooks/tasks/useTasks.ts` |
| `achievement_streak` | Ao incrementar streak | `src/hooks/useUserStats.ts` |
| `achievement_milestone` | Ao atingir marco | `src/hooks/useUserStats.ts` |
| `achievement_level` | Ao subir de nivel | `src/hooks/useUserStats.ts` |

### Templates que NAO faz sentido conectar (manter como editaveis apenas)
- `task_created` - o usuario acabou de criar, nao precisa push
- `task_assigned` - sistema single-user
- `system_backup` / `system_sync` - operacoes silenciosas
- `system_update` - ja tem `UpdateNotification` visual

### Alteracoes
- `src/hooks/tasks/useTasks.ts` - ao completar tarefa, chamar `oneSignalNotifier.send()` com template `task_completed`
- `src/hooks/useUserStats.ts` - ao registrar conquista, chamar `oneSignalNotifier.sendAchievement()`
- Cada chamada verificara `settings.notifications` antes de enviar

### Risco: Baixo | Complexidade: 3/10

---

## 3. Remover VAPID Push

### Diagnostico
VAPID nao e usado e nao funciona. Esta isolado e nao interfere com OneSignal.

### Arquivos a REMOVER completamente
- `src/hooks/useVapidPush.ts`
- `supabase/functions/send-vapid-push/index.ts`
- `scripts/generate-vapid-keys.js`

### Arquivos a MODIFICAR
- `src/components/PushProviderSelector.tsx` - remover todo o card VAPID (linhas 90-129), remover import e uso de `useVapidPush`, remover handlers VAPID. Manter apenas o card OneSignal
- `supabase/functions/health-check/index.ts` - remover referencias a VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL

### Arquivos que NAO serao tocados
- `public/manifest.json` - intacto
- `public/sw-push.js` - intacto
- `src/hooks/useOneSignal.ts` - intacto
- `src/lib/push/oneSignalProvider.ts` - intacto
- `supabase/functions/send-onesignal/index.ts` - intacto
- `.env` (VITE_VAPID_PUBLIC_KEY pode permanecer, nao causa problema)

### Risco: Zero | Complexidade: 2/10

---

## Ordem de Execucao

1. Corrigir filtro de tarefas recorrentes (mais critico)
2. Remover VAPID (simples, zero risco)
3. Conectar templates ao OneSignal

---

## Analise de Impacto Total

| Item | Risco | Complexidade |
|------|-------|-------------|
| Filtro recorrentes | Baixo | 1 |
| Remover VAPID | Zero | 2 |
| Conectar templates | Baixo | 3 |
| **Total** | **Baixo** | **6/30 - Abaixo do limite seguro** |

---

## Checklist de Testes Manuais

### Filtro de tarefas recorrentes:
- [ ] Com filtro "hoje + atrasadas" ativo, riscar tarefa recorrente atrasada
- [ ] Confirmar que a tarefa permanece visivel e riscada (nao some)
- [ ] Usar botao "desmarcar tarefas" na coluna para resetar
- [ ] Confirmar que apos reset a tarefa volta ao estado normal (nao riscada, nova data)
- [ ] Riscar tarefa NAO recorrente atrasada - confirmar que some normalmente (comportamento existente)

### VAPID removido:
- [ ] Abrir configuracoes de push - so deve aparecer card OneSignal
- [ ] Testar notificacao push via OneSignal - deve funcionar normalmente
- [ ] Verificar que nenhum erro no console relacionado a VAPID

### Templates conectados:
- [ ] Completar uma tarefa e verificar se push "Tarefa Concluida" chega (se push ativo)
- [ ] Verificar que templates respeitam preferencias do usuario
