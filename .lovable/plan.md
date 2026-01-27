
# Plano de Correção - Bug de Tarefas Recorrentes Desaparecendo

## Diagnóstico Confirmado

Após análise detalhada do código e banco de dados, foram identificadas **3 causas principais** para o bug onde tarefas recorrentes desaparecem ao serem marcadas como concluídas (mesmo com toggle de reset imediato desligado).

---

## Causa 1: Filtro Inconsistente no KanbanBoard (CRÍTICA)

### Problema
O arquivo `src/components/KanbanBoard.tsx` possui sua própria lógica de filtragem que **não respeita** a regra de manter tarefas recorrentes visíveis quando completadas.

**Código atual (linha 250-252):**
```typescript
if (settings.kanban.hideCompletedTasks && t.is_completed) {
  return false; // Remove TODAS as tarefas completadas, incluindo recorrentes!
}
```

**Código correto em `taskFilters.ts`:**
```typescript
if (hideCompleted) {
  filtered = filtered.filter((task) => {
    if (task.recurrence_rule) return true; // Recorrentes sempre visíveis
    return !task.is_completed;
  });
}
```

### Correção
Modificar a linha 250-252 do `KanbanBoard.tsx` para incluir a verificação de recorrência:

```typescript
// Ocultar tarefas concluídas (exceto recorrentes que ficam riscadas)
if (settings.kanban.hideCompletedTasks && t.is_completed && !t.recurrence_rule) {
  return false;
}
```

---

## Causa 2: Comportamento Padrão Quando Toggle Desligado

### Problema
Quando `immediateRecurrentReset: false`, a tarefa é marcada como `is_completed: true` normalmente, mas como `hideCompletedTasks: true` é o padrão, ela desaparece devido à Causa 1.

### Correção
A correção da Causa 1 resolve automaticamente este problema. Tarefas recorrentes completadas permanecerão visíveis (riscadas) até o reset manual ou cron.

---

## Causa 3: Lógica de Reset Imediato (Ajuste Secundário)

### Problema
O toggle de reset imediato funciona corretamente quando LIGADO, mas não há feedback visual adequado sobre o comportamento quando DESLIGADO.

### Melhorias Opcionais
1. Adicionar tooltip explicativo no Config
2. Mostrar mensagem diferente no toast quando tarefa fica "riscada" vs "resetada"

---

## Arquivos a Modificar

| Arquivo | Alteração | Risco |
|---------|-----------|-------|
| `src/components/KanbanBoard.tsx` | Adicionar check `!t.recurrence_rule` no filtro de completadas | Baixo |

---

## Implementação

### Passo 1: Corrigir filtro em KanbanBoard.tsx

**Antes (linhas 250-252):**
```typescript
if (settings.kanban.hideCompletedTasks && t.is_completed) {
  return false;
}
```

**Depois:**
```typescript
// Ocultar tarefas concluídas EXCETO recorrentes (que ficam riscadas até reset)
if (settings.kanban.hideCompletedTasks && t.is_completed) {
  // Tarefas recorrentes sempre visíveis (riscadas) até reset manual/cron
  if (t.recurrence_rule) {
    return true;
  }
  return false;
}
```

---

## Teste Manual

Após a correção:

1. Criar ou usar tarefa recorrente (ex: "P - Treino" diária)
2. Garantir que toggle "Reset Imediato" está DESLIGADO em Config > Kanban
3. Marcar tarefa como concluída (checkbox)
4. **Esperado:** Tarefa permanece visível com visual riscado (strikethrough)
5. Clicar em "Resetar Recorrentes" ou aguardar cron
6. **Esperado:** Tarefa volta ao estado normal com nova data

---

## Limpeza de Dados Legado (Opcional)

Foi detectado que existem tarefas duplicadas no banco (vestígio do modo Diário):
- Executar query para identificar tarefas em categoria "Diário" órfãs
- Remover ou migrar conforme necessário

```sql
-- Identificar tarefas na categoria Diário (se ainda existir)
SELECT t.id, t.title, c.name as category_name
FROM tasks t
JOIN categories c ON t.category_id = c.id
WHERE c.name = 'Diário';
```

---

## Análise de Risco

| Item | Risco | Complexidade |
|------|-------|--------------|
| Ajuste do filtro hideCompletedTasks | Baixo | 2/10 |
| Impacto em outras funcionalidades | Nenhum | - |

**Pontuação Total: 2/25** - Dentro do limite seguro para aplicação.

---

## Checklist de Validação

Após implementação, testar:

- [ ] Tarefa recorrente marcada como concluída permanece visível (riscada)
- [ ] Tarefa NÃO-recorrente marcada como concluída desaparece normalmente
- [ ] Toggle "Reset Imediato" ON: tarefa recalcula data imediatamente
- [ ] Toggle "Reset Imediato" OFF: tarefa fica riscada até reset
- [ ] Botão "Resetar Recorrentes" funciona normalmente
- [ ] Filtro de recorrência ("Todas", "Recorrentes", "Não Recorrentes") funciona
