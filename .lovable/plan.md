
# Plano de Implementação - 3 Correções

## 1. Sugestão de Subtarefas com IA ao Editar Tarefas

### Problema Identificado
O componente `AISubtasksSuggester` só é exibido quando **não existe** uma tarefa (criação), conforme a condição na linha 386-393 do `TaskModal.tsx`:

```typescript
{/* AI Subtasks Suggester */}
{!task && (  // <-- Esta condição impede a exibição ao editar
  <AISubtasksSuggester
    taskTitle={title}
    taskDescription={description}
    existingSubtasks={subtasks}
    onAddSubtasks={setSubtasks}
  />
)}
```

### Correção
Remover a condição `!task` para que o componente seja exibido tanto na criação quanto na edição.

### Arquivo a Modificar
| Arquivo | Alteração | Risco |
|---------|-----------|-------|
| `src/components/TaskModal.tsx` | Remover condição `!task` do AISubtasksSuggester | Baixo |

### Código Atual vs. Proposto

**Antes (linhas 385-393):**
```typescript
{/* AI Subtasks Suggester */}
{!task && (
  <AISubtasksSuggester
    taskTitle={title}
    taskDescription={description}
    existingSubtasks={subtasks}
    onAddSubtasks={setSubtasks}
  />
)}
```

**Depois:**
```typescript
{/* AI Subtasks Suggester */}
<AISubtasksSuggester
  taskTitle={title}
  taskDescription={description}
  existingSubtasks={subtasks}
  onAddSubtasks={setSubtasks}
/>
```

---

## 2. Excluir Tarefas da Coluna "Recorrente" dos Insights de IA

### Problema Identificado
O Dashboard busca **todas** as tarefas e envia para o componente `ProductivityInsights` sem filtrar as tarefas da coluna "Recorrente". A coluna "Recorrente" não representa produtividade de trabalho realizado, apenas tarefas de rotina aguardando próximo ciclo.

### Correção
1. Buscar as colunas do usuário no Dashboard
2. Identificar o ID da coluna "Recorrente" (case-insensitive)
3. Filtrar tarefas dessa coluna antes de enviar para o componente `ProductivityInsights`

### Arquivos a Modificar
| Arquivo | Alteração | Risco |
|---------|-----------|-------|
| `src/pages/Dashboard.tsx` | Adicionar filtro de colunas recorrentes antes de enviar para ProductivityInsights | Baixo |

### Código Proposto

```typescript
// No Dashboard.tsx, após fetch de tasks
const [columns, setColumns] = useState<any[]>([]);

useEffect(() => {
  const fetchData = async () => {
    const { data: tasksData } = await supabase.from("tasks").select("*");
    const { data: columnsData } = await supabase.from("columns").select("id, name");
    setTasks(tasksData || []);
    setColumns(columnsData || []);
  };
  fetchData();
}, []);

// Filtrar tarefas excluindo coluna "Recorrente" para insights
const tasksForInsights = useMemo(() => {
  const recurrentColumnIds = columns
    .filter(col => col.name.toLowerCase() === "recorrente" || col.name.toLowerCase() === "recorrentes")
    .map(col => col.id);
  
  return tasks.filter(task => !recurrentColumnIds.includes(task.column_id));
}, [tasks, columns]);

// Uso no widget:
component: <ProductivityInsights stats={stats} tasks={tasksForInsights} />
```

---

## 3. Preservar Rastreamento de Conclusão ao Marcar Tarefa como Feita

### Problema Identificado
Ao examinar o código, o problema pode estar no comportamento do reset imediato de tarefas recorrentes em `TaskCard.tsx`. Quando o `immediateRecurrentReset` está habilitado, a atualização da tarefa NÃO está resetando `track_metrics` ou `track_comments` diretamente.

Porém, há outro cenário possível: se a tarefa for uma **tarefa espelhada** (mirror), a sincronização bidirecional pode estar afetando os campos. Entretanto, analisando o código, os updates de mirrors só modificam `is_completed` e `due_date`.

**Causa mais provável:** O problema está no **reset manual** ou no **cron job**. Os updates em batch no `useTaskReset.ts` (linhas 88-94) atualizam apenas `is_completed` e `due_date`, NÃO sobrescrevem outros campos.

Após análise detalhada, encontrei o potencial problema: quando uma tarefa é **criada via duplicação** ou **através de templates**, os campos `track_metrics` e `track_comments` podem não estar sendo copiados. Mas isso não explica a perda após marcar como feita.

**Segunda análise:** Ao verificar o TaskModal, ao salvar uma tarefa (handleSave), os campos são incluídos corretamente:

```typescript
const taskData: Partial<Task> = {
  // ...
  track_metrics: trackMetrics,
  metric_type: trackMetrics ? metricType : null,
  track_comments: trackComments,
  // ...
};
```

**Possível causa:** O usuário pode estar confundindo com o comportamento visual. Vou verificar se o problema está no `executeToggleCompleted` sobrescrevendo campos.

Analisando `TaskCard.tsx` linha 335-340:
```typescript
const { error } = await supabase
  .from("tasks")
  .update({ is_completed: checked })  // Apenas is_completed!
  .eq("id", task.id);
```

Isso está CORRETO - não sobrescreve outros campos.

**Diagnóstico final:** O problema pode estar na **sincronização de mirrors** ou num **bug de refetch** onde os dados retornam incorretos. Preciso adicionar logs para confirmar.

No entanto, baseado no relato do usuário, vou verificar se existe algum trigger ou função de banco que reseta esses campos.

**Alternativa mais provável:** O problema pode ser de **cache local ou state React** que não está refletindo corretamente os valores do banco. A verificação na comparação de props (`arePropsEqual`) inclui esses campos.

### Correção Proposta
Adicionar os campos `track_metrics`, `track_comments` e `metric_type` explicitamente no select de tarefas e garantir que a atualização não os sobrescreva. Como medida preventiva, vou modificar o reset de recorrentes para preservar explicitamente esses campos.

### Arquivos a Modificar
| Arquivo | Alteração | Risco |
|---------|-----------|-------|
| `src/hooks/tasks/useTaskReset.ts` | Verificar e preservar campos de rastreamento no update | Baixo |

### Análise Adicional Necessária
Preciso verificar se o problema está:
1. No banco de dados (trigger que reseta campos)
2. No código de update (improvável - apenas is_completed é atualizado)
3. No refetch/realtime que traz dados incorretos

**OBSERVAÇÃO IMPORTANTE:** Analisando novamente o código, NÃO encontrei nenhum lugar que reseta `track_metrics` ou `track_comments`. O problema pode ser:
- Um bug no Realtime subscription que não inclui esses campos
- Um problema de sincronização no `useTasks` hook

Vou recomendar adicionar uma verificação extra no update para garantir que esses campos não sejam perdidos durante o reset de recorrentes.

---

## Resumo de Alterações

| # | Problema | Arquivo | Complexidade |
|---|----------|---------|--------------|
| 1 | AI Subtasks ao editar | `src/components/TaskModal.tsx` | 1/10 |
| 2 | Excluir recorrentes dos insights | `src/pages/Dashboard.tsx` | 3/10 |
| 3 | Preservar rastreamento | `src/hooks/tasks/useTaskReset.ts` + investigação | 4/10 |

**Pontuação Total de Risco: 8/25** - Dentro do limite seguro.

---

## Checklist de Testes Manuais

Após implementação, validar:

- [ ] Abrir modal de edição de tarefa existente → botão "Sugerir subtarefas com IA" aparece
- [ ] Gerar insights no Dashboard → verificar se tarefas da coluna "Recorrente" não são contadas
- [ ] Criar tarefa com rastreamento habilitado → marcar como concluída → verificar se rastreamento permanece ativado
- [ ] Resetar tarefas recorrentes → verificar se configuração de rastreamento é preservada
