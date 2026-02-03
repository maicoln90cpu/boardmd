
# Plano de Correção: 3 Pontos de Melhoria

## Resumo dos Problemas Identificados

---

## 1. Cards de Cursos - Mostrar Módulos IA em vez de Ep. 0/1

### Problema
Quando um curso tem `modules_checklist` gerado por IA, o card ainda mostra "Ep. 0/1" em vez de mostrar o progresso dos módulos gerados.

### Análise Técnica
**Arquivo:** `src/components/courses/CourseCard.tsx`

O card atual usa apenas `current_episode/total_episodes` e `current_module/total_modules` (campos numéricos). Quando há `modules_checklist` (array de módulos com `completed: true/false`), o sistema deveria:
1. Calcular o progresso baseado em `modules_checklist.filter(m => m.completed).length`
2. Mostrar "Módulo X de Y" baseado nos módulos da IA

### Solução Proposta
Modificar o `CourseCard.tsx` para:
- Verificar se `modules_checklist` existe e tem itens
- Se sim, usar o progresso baseado nos módulos da IA
- Mostrar nome do módulo atual ou próximo a concluir
- Manter compatibilidade com cursos sem checklist de IA

---

## 2. Reformular Modal dos Cursos - Priorizar Módulos IA

### Problema
O modal atual tem muitos campos e o upload de módulos por IA está no final. Deveria ser mais destacado.

### Análise Técnica
**Arquivo:** `src/components/courses/CourseModal.tsx`

O modal atual tem a seguinte ordem:
1. Nome do Curso
2. Autor/Instrutor
3. Plataforma/Categoria
4. URL
5. Preço
6. Módulo Atual/Total Módulos (manual)
7. Ep. Atual/Total Eps (manual)
8. Status/Prioridade/Data
9. Anotações
10. **Upload IA (no final)**

### Solução Proposta
Reorganizar para:
1. Nome do Curso
2. Autor/Instrutor  
3. Plataforma/Categoria
4. **📸 Módulos do Curso (via IA) - DESTAQUE**
   - Seção expandida com upload de imagem
   - Checklist interativo
5. Status/Prioridade/Data (linha compacta)
6. URL
7. Preço
8. Anotações
9. **Campos numéricos manuais (collapsed por padrão)**
   - Módulo Atual/Total (só se não usar IA)
   - Ep. Atual/Total (só se não usar IA)

---

## 3. Erros na Função de Riscar Tarefas Recorrentes

### Problema Principal
As 3 tarefas do projeto MDAccula ficaram riscadas e não resetaram, mesmo com `immediateRecurrentReset: true`.

### Análise do Banco de Dados
```
MDAccula - Disparos + Eventos: is_completed=true, recurrence: daily/1
MDAccula - Emails Semana: is_completed=true, recurrence: daily/2  
Revisar Campanhas Meta ADS: is_completed=true, recurrence: weekdays=[2]
```

### **ERRO 1: Modal de Métricas Interrompe o Fluxo**

**Arquivo:** `src/components/TaskCard.tsx` - Linha 380-397

```typescript
const handleToggleCompleted = async (checked: boolean) => {
  const shouldTrackMetrics = task.track_metrics || task.track_comments;
  
  // Se está marcando como concluída e tem rastreamento habilitado
  if (checked && shouldTrackMetrics) {
    setPendingComplete(true);
    setCompletionModalOpen(true);
    return; // <-- PROBLEMA: Retorna ANTES de verificar reset imediato!
  }
  // ...
}
```

Quando `track_metrics` ou `track_comments` está habilitado, o código abre o modal de métricas e **NÃO** chama `executeToggleCompleted`. Depois, em `handleCompletionConfirm`:

```typescript
const handleCompletionConfirm = async () => {
  // ...
  if (!isRecurrentColumn && completedColumnId && onMoveToCompleted) {
    setConfirmCompleteOpen(true); // Abre OUTRO modal
  } else {
    await executeToggleCompleted(true); // Só aqui chama!
  }
}
```

Se a tarefa não está na coluna "Recorrente" MAS tem `completedColumnId`, abre mais um modal e pode não executar o reset.

### **ERRO 2: Condição de Coluna Recorrente Incorreta**

**Arquivo:** `src/components/TaskCard.tsx` - Linha 406-412

```typescript
const isRecurrentColumn = columnName?.toLowerCase() === "recorrente";
if (!isRecurrentColumn && completedColumnId && onMoveToCompleted) {
  setConfirmCompleteOpen(true);
} else {
  await executeToggleCompleted(true);
}
```

A lógica depende de `columnName === "recorrente"`, mas:
1. As tarefas MDAccula estão na coluna "Recorrente" (maiúsculo) 
2. A comparação usa `.toLowerCase()` então isso deveria funcionar
3. **MAS** o `completedColumnId` pode estar vindo como `undefined` em alguns casos

### **ERRO 3: handleConfirmComplete NÃO Respeita immediateRecurrentReset**

**Arquivo:** `src/components/TaskCard.tsx` - Linha 420-424

```typescript
const handleConfirmComplete = async (moveToCompleted: boolean) => {
  setConfirmCompleteOpen(false);
  await executeToggleCompleted(true, moveToCompleted); // Passa true sempre
}
```

Quando o usuário confirma no modal "Mover para Concluído", o código chama `executeToggleCompleted(true)`. Isso deveria funcionar, MAS...

O problema está em `executeToggleCompleted`:
```typescript
if (checked && isRecurrent && settings.kanban.immediateRecurrentReset) {
  // Reset imediato - is_completed = false
}
```

O fluxo deveria ser:
1. Usuário marca checkbox ✓
2. Modal de métricas abre (se habilitado)
3. Usuário preenche métricas
4. `executeToggleCompleted(true)` é chamado
5. **Deveria** resetar se `immediateRecurrentReset === true`

**O problema real**: Os modais intermediários estão quebrando a cadeia de execução. Em certos caminhos do código, a tarefa é marcada como `is_completed = true` no banco ANTES de `executeToggleCompleted` ser chamado.

### **ERRO 4 (Raiz): Atualização Direta do Banco no Modal de Métricas**

Ao investigar mais profundamente, o `addLog` pode estar atualizando o banco de dados com `is_completed = true` antes de `executeToggleCompleted` ter chance de fazer o reset:

**Arquivo:** `src/hooks/useTaskCompletionLogs.ts` - Função `addLog`

Se esse hook atualiza `is_completed` para `true` no banco como efeito colateral, o Realtime subscription atualiza o estado local, e quando `executeToggleCompleted` roda, o estado já está dessincronizado.

---

## Solução Proposta para os 3 Erros

### Correção 1: Unificar Lógica de Reset Antes dos Modais

Modificar `handleToggleCompleted` para verificar `immediateRecurrentReset` PRIMEIRO:

```typescript
const handleToggleCompleted = async (checked: boolean) => {
  const isRecurrent = !!task.recurrence_rule;
  const shouldTrackMetrics = task.track_metrics || task.track_comments;
  
  // CORREÇÃO: Se é recorrente e reset imediato está habilitado, fazer reset ANTES de qualquer modal
  if (checked && isRecurrent && settings.kanban.immediateRecurrentReset) {
    // Se precisa registrar métricas, abrir modal MAS passar flag de "já resetou"
    if (shouldTrackMetrics) {
      // Primeiro: fazer o reset
      await executeImmediateReset();
      // Depois: abrir modal de métricas (sem marcar is_completed novamente)
      setCompletionModalOpen(true);
    } else {
      await executeImmediateReset();
    }
    return;
  }
  
  // Fluxo normal para tarefas não-recorrentes ou sem reset imediato
  if (checked && shouldTrackMetrics) {
    setPendingComplete(true);
    setCompletionModalOpen(true);
    return;
  }
  
  // ...resto do código
};
```

### Correção 2: Criar Função Dedicada para Reset Imediato

```typescript
const executeImmediateReset = async () => {
  triggerConfetti();
  
  const nextDueDate = calculateNextRecurrenceDate(
    task.due_date, 
    task.recurrence_rule as RecurrenceRule
  );
  
  const { error } = await supabase
    .from("tasks")
    .update({ 
      is_completed: false,
      due_date: nextDueDate 
    })
    .eq("id", task.id);
    
  if (error) {
    toast.error("Erro ao resetar tarefa");
    return;
  }
  
  if (onAddPoints) onAddPoints();
  
  toast.success("✓ Tarefa concluída e resetada", {
    description: `Próxima: ${formatDateTimeBR(new Date(nextDueDate))}`
  });
  
  // Sync mirrors
  if (task.mirror_task_id) {
    await supabase
      .from("tasks")
      .update({ is_completed: false, due_date: nextDueDate })
      .eq("id", task.mirror_task_id);
  }
  
  window.dispatchEvent(new CustomEvent("task-updated", { detail: { taskId: task.id } }));
};
```

### Correção 3: Modificar handleCompletionConfirm

```typescript
const handleCompletionConfirm = async (metricValue: number | null, comment: string | null) => {
  setCompletionModalOpen(false);
  
  // Salvar log de conclusão
  await addLog(task.id, metricValue, task.metric_type, comment);
  
  // Se já foi resetada (reset imediato), não fazer mais nada
  if (task.recurrence_rule && settings.kanban.immediateRecurrentReset) {
    setPendingComplete(false);
    return;
  }
  
  // Verificar se deve mover para coluna de concluídos
  const isRecurrentColumn = columnName?.toLowerCase() === "recorrente";
  if (!isRecurrentColumn && completedColumnId && onMoveToCompleted) {
    setConfirmCompleteOpen(true);
  } else {
    await executeToggleCompleted(true);
    setPendingComplete(false);
  }
};
```

---

## Resumo de Arquivos a Modificar

| # | Problema | Arquivo | Risco | Complexidade |
|---|----------|---------|-------|--------------|
| 1 | Cards com módulos IA | `src/components/courses/CourseCard.tsx` | Baixo | 4/10 |
| 2 | Modal cursos reorganizado | `src/components/courses/CourseModal.tsx` | Médio | 5/10 |
| 3 | Reset recorrentes | `src/components/TaskCard.tsx` | Médio | 6/10 |

**Pontuação Total de Risco: 15/25** - Dentro do limite seguro.

---

## Checklist de Testes Manuais

### Cards de Cursos:
- [ ] Criar curso com módulos gerados por IA
- [ ] Verificar que o card mostra "Módulo X/Y" baseado no checklist IA
- [ ] Verificar que o progresso reflete módulos concluídos
- [ ] Testar curso sem checklist IA (deve mostrar Ep. X/Y normal)

### Modal Reorganizado:
- [ ] Abrir modal de novo curso
- [ ] Verificar que seção de IA está em destaque
- [ ] Testar upload de imagem e geração de checklist
- [ ] Verificar que campos manuais estão em seção secundária

### Reset de Recorrentes:
- [ ] Habilitar `immediateRecurrentReset` nas configurações
- [ ] Criar tarefa recorrente COM rastreamento de métricas
- [ ] Marcar como concluída
- [ ] Verificar que o modal de métricas abre
- [ ] Preencher métricas e confirmar
- [ ] **Verificar que a tarefa foi RESETADA (não ficou riscada)**
- [ ] Verificar que a nova data foi calculada corretamente

