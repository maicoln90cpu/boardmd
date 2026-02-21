

# Plano: 3 Correções no Sistema de Notificações

## Problema 1: Filtro de Colunas nas Notificações Push

### Situação Atual
Todas as tarefas com prazo recebem notificações push, independentemente da coluna em que estão. Não existe configuração para filtrar quais colunas devem gerar alertas.

### Solução
Adicionar campo `excludedPushColumnIds` (array de UUIDs) em `settings.notifications`, similar ao `excluded_column_ids` já usado nos templates de WhatsApp. Na UI de Preferências de Notificações, exibir multiselect com as colunas do usuário para que ele escolha quais colunas NÃO devem gerar alertas push. No `useDueDateAlerts.ts`, verificar se a coluna da tarefa está na lista de excluídas antes de disparar qualquer notificação.

### Arquivos a modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/data/useSettings.ts` | Adicionar `excludedPushColumnIds: string[]` ao tipo `notifications` com default `[]` |
| `src/components/notifications/NotificationPreferences.tsx` | Adicionar multiselect de colunas usando `useColumns()` dentro do card "Alertas de Prazo" |
| `src/hooks/useDueDateAlerts.ts` | No início do `forEach`, verificar se `task.column_id` está em `settings.notifications.excludedPushColumnIds` e pular se estiver |

---

## Problema 2: Botão "Salvar" Some em 500ms

### Causa Raiz
Em `NotificationPreferences.tsx`, o botão "Salvar" aparece quando `isDirty === true`. Porém, `updateSettings()` no `useSettings.ts` chama `scheduleBatchSave()` automaticamente, que após 500ms executa `flushPendingChanges()` e seta `isDirty = false`. Resultado: o botão aparece por ~500ms e desaparece sozinho.

### Solução
Nas Preferências de Notificações, NÃO usar o `updateSettings()` com auto-save. Em vez disso, manter um estado local das alterações e só chamar `saveSettings()` (save imediato) quando o usuário clicar em "Salvar". Isso garante que o botão permanece visível até o clique.

### Arquivos a modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/components/notifications/NotificationPreferences.tsx` | Usar `useState` local para mudanças pendentes, exibir botão baseado no estado local (não em `isDirty`), chamar `updateSettings()` + `saveSettings()` apenas no clique do botão |

---

## Problema 3: Notificações Duplicadas via OneSignal

### Causa Raiz
O `useEffect` em `useDueDateAlerts.ts` tem dependência `[tasks, toast, settings.notifications]`. Como `toast` é uma referência nova a cada render e `tasks` muda frequentemente (realtime, eventos customizados), o efeito re-executa constantemente. Cada execução chama `checkDueDates()` imediatamente. Embora o sistema de snooze via `localStorage` deveria prevenir duplicatas, há uma race condition: quando duas execuções do efeito iniciam quase simultaneamente, ambas carregam o mesmo estado do `localStorage` (sem a key da tarefa), ambas enviam o push, e ambas salvam a key depois.

Evidência: a tarefa "Correr" recebeu 6 pushes `due_overdue` hoje, incluindo dois com apenas 2 minutos de diferença (13:58 e 14:00).

Adicionalmente, 137 registros de `due_overdue` foram criados em apenas um dia - claramente multiplicado por cada re-render.

### Solução
1. Remover `toast` da dependência do `useEffect` (usar ref)
2. Mover a verificação de snooze para ANTES do envio push, e usar o `notifiedTasksRef` como fonte primária (memória) com localStorage apenas como persistência secundária
3. Adicionar guard de envio: usar um `Set` de "pushes em andamento" para evitar que duas chamadas simultâneas enviem para a mesma task/nível
4. Separar o toast local do push OneSignal: o toast local é controlado pelo snooze normalmente; o push OneSignal deve ter um controle independente mais conservador (ex: não reenviar se já enviou nas últimas 4 horas para o mesmo task+nível)

### Arquivos a modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useDueDateAlerts.ts` | (1) Usar `useRef` para `toast` e remover da dep array, (2) Adicionar `pendingPushesRef` (Set) para evitar race condition, (3) Adicionar dedup por timestamp no localStorage para push OneSignal (mínimo 4h entre reenvios do mesmo nível), (4) Verificar dedup ANTES de chamar `sendOneSignalPush` |

### Detalhe técnico da correção de race condition
```text
ANTES (bugado):
  Effect re-run -> loadNotifiedSet() -> forEach tasks -> has(key)? NO -> send push -> add(key) -> save
  Effect re-run (simultâneo) -> loadNotifiedSet() -> forEach tasks -> has(key)? NO -> send push -> add(key) -> save

DEPOIS (corrigido):
  Effect re-run -> loadNotifiedSet() (apenas 1x no mount) -> forEach tasks -> 
    has(key)? NO -> pendingPushes.has(key)? NO -> add to pendingPushes -> send push -> add(key) -> save -> remove from pendingPushes
```

---

## Análise de Impacto

| Item | Risco | Complexidade |
|------|-------|-------------|
| Filtro de colunas nas notificações | Baixo | 3/10 |
| Botão salvar persistente | Baixo | 2/10 |
| Correção de duplicatas OneSignal | Médio | 5/10 |
| **Total** | **Médio** | **10/30 - Dentro do limite seguro** |

### Vantagens
- Controle granular sobre quais colunas geram push
- UX corrigida no salvamento de preferências
- Redução drástica de pushes duplicados (de 137/dia para ~15 estimados)

### Desvantagens
- Nenhuma funcionalidade existente é removida
- Complexidade adicional mínima no controle de dedup

---

## Checklist de Testes Manuais

### Filtro de colunas:
- [ ] Ir em Notificações > Preferências > Alertas de Prazo
- [ ] Verificar se aparece lista de colunas para excluir
- [ ] Excluir uma coluna (ex: "Recorrente")
- [ ] Criar tarefa com prazo nessa coluna excluída
- [ ] Confirmar que NÃO recebe push para essa tarefa
- [ ] Criar tarefa com prazo em coluna não excluída
- [ ] Confirmar que recebe push normalmente

### Botão Salvar:
- [ ] Ir em Notificações > Preferências
- [ ] Alterar qualquer configuração (ex: desativar som)
- [ ] Verificar que o botão "Salvar" aparece e PERMANECE visível
- [ ] Clicar em "Salvar" e confirmar toast de sucesso
- [ ] Recarregar a página e verificar que a alteração foi persistida

### Duplicatas:
- [ ] Recarregar a página principal
- [ ] Aguardar 5 minutos
- [ ] Verificar na tabela `push_logs` se cada tarefa tem NO MÁXIMO 1 registro por nível (overdue/warning/etc) nesse período
- [ ] Navegar entre páginas e voltar ao kanban
- [ ] Confirmar que não gera novos registros duplicados no `push_logs`

