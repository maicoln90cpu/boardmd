

# Correção: Reset de Tarefas Recorrentes

## Diagnóstico

### Problema 1: Botão "Resetar Recorrentes" não faz nada
O botão e o cron filtram apenas `is_completed = true`. Existem **15+ tarefas recorrentes com `due_date` no passado e `is_completed = false`** — nunca foram completadas, então nunca entram no reset. Exemplos:
- "Lavar Sofa" — due_date **Janeiro 2026**
- "Correr" — due_date **Janeiro 2026**
- "C - 2h/dia" — due_date **21 Março**
- "Works Workana" — due_date **28 Março**

### Problema 2: Cron funciona mas incompleto
O cron às 02:59 UTC funciona (logs mostram execuções), mas sofre do mesmo filtro — só reseta tarefas completadas.

### Problema 3: Falta de invalidação do cache
Após o reset, `onBoardRefresh` apenas incrementa uma key de re-render mas **não invalida o cache do TanStack Query**, então a UI não reflete mudanças sem F5.

## Solução

### Passo 1: Expandir `handleResetRecurrentTasks` em `useTaskReset.ts`
Além de tarefas completadas, buscar também tarefas recorrentes com `due_date < agora` e `is_completed = false`. Para essas, atualizar apenas o `due_date` para a próxima ocorrência (sem tocar em `is_completed`).

### Passo 2: Adicionar invalidação de cache
Passar `queryClient` (ou callback `fetchTasks`) para o hook e chamar `queryClient.invalidateQueries({ queryKey: ["tasks"] })` após o reset.

### Passo 3: Atualizar Edge Function `reset-recurring-tasks`
Mesma lógica: buscar tarefas recorrentes com due_date passado independente de `is_completed`.

### Passo 4: Corrigir wiring em `Index.tsx`
Passar o `queryClient` ou usar invalidação direta no `onBoardRefresh`.

## Alterações por arquivo

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/tasks/useTaskReset.ts` | Expandir query para incluir tarefas com due_date passado; adicionar invalidação de cache |
| `src/pages/Index.tsx` | Passar `fetchTasks` como callback no hook |
| `supabase/functions/reset-recurring-tasks/index.ts` | Expandir query para due_date passado |

## Vantagens
- Tarefas recorrentes nunca ficam "presas" no passado
- UI atualiza imediatamente sem F5
- Cron mantém due_dates sempre atualizados

## Desvantagens
- Tarefas intencionalmente não-completadas terão due_date avançado automaticamente (comportamento esperado para recorrentes)

## Checklist manual
- [ ] Verificar que existem tarefas com due_date passado antes do reset
- [ ] Clicar "Resetar Recorrentes" — toast deve mostrar quantidade > 0
- [ ] Confirmar que due_dates foram atualizados para próxima ocorrência
- [ ] Navegar pelo sidebar e voltar — estado mantido sem F5

## Risco: 4/10 — lógica de recorrência já testada, expansão do filtro é segura

