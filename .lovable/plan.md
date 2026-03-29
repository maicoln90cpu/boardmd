

# Correção: Reset deve afetar APENAS tarefas completadas (riscadas)

## Problema
O reset está buscando e processando tarefas recorrentes com `due_date` no passado mesmo que **não estejam completadas**. Isso avança a data de tarefas atrasadas que o usuário ainda não fez.

## Correção

O botão "Resetar Recorrentes" deve afetar **apenas** tarefas com `is_completed = true` e `recurrence_rule` não nulo. Remover completamente a segunda query (`pastDueRes`) que busca tarefas não-completadas com due_date passado.

### Arquivo 1: `src/hooks/tasks/useTaskReset.ts`
- Remover a query `pastDueRes` (linhas 49-53)
- Remover o merge/deduplica (linhas 63-67)
- Usar apenas `completedRes.data` diretamente
- Simplificar: todo task processado tem `is_completed = true`, então sempre setar `is_completed: false`

### Arquivo 2: `supabase/functions/reset-recurring-tasks/index.ts`
- Mesma correção: remover a query de tarefas não-completadas com due_date passado
- Cron deve resetar apenas tarefas completadas

### Antes vs Depois
| Antes | Depois |
|-------|--------|
| Reseta completadas + atrasadas não-feitas | Reseta **apenas** completadas (riscadas) |
| Avança due_date de tarefas atrasadas pendentes | Tarefas atrasadas pendentes ficam intactas |

### Vantagens
- Respeita o fluxo do usuário: tarefas não-feitas permanecem com a data original
- Comportamento previsível: só reseta o que está riscado

### Desvantagens
- Tarefas recorrentes não-completadas com due_date passado ficarão "atrasadas" até serem completadas manualmente (comportamento esperado pelo usuário)

### Checklist manual
- [ ] Verificar que tarefas riscadas (completadas) são resetadas ao clicar o botão
- [ ] Verificar que tarefas NÃO riscadas com due_date passado **não são alteradas**
- [ ] Navegar pelo sidebar após reset — estado refletido sem F5

### Risco: 2/10 — reverter para lógica anterior mais simples

