

# Plano de Correção - 3 Bugs e 1 Nova Funcionalidade

---

## Resumo dos Problemas

| # | Problema | Causa Raiz | Arquivo Principal |
|---|----------|------------|-------------------|
| 1 | Atrelar cursos às anotações | Falta campo `linked_course_id` na tabela `notes` | Migração SQL + hooks |
| 2 | Filtro "Amanhã" quebrado no Kanban | `KanbanBoard.getTasksForColumn()` não tem caso `"tomorrow"` | `KanbanBoard.tsx` |
| 3 | Categorias com contagem 0 no Calendário | `tasks` não é passado para `CategoryFilter` no calendário | `fullscreen-calendar.tsx` |

---

## 1. Atrelar Cursos às Anotações

### Problema
Não existe vínculo entre cursos e notas/anotações.

### Alterações no Banco de Dados

```sql
-- Adicionar campo na tabela notes para vincular a curso
ALTER TABLE notes 
ADD COLUMN linked_course_id uuid REFERENCES courses(id) ON DELETE SET NULL;
```

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useNotes.ts` | Adicionar `linked_course_id` à interface `Note` |
| `src/components/notes/NoteEditor.tsx` | Adicionar seletor de curso vinculado |
| `src/components/notes/NoteEditorHeader.tsx` | Adicionar badge de curso vinculado |
| `src/hooks/useCourses.ts` | Adicionar reciprocidade (notas vinculadas ao curso) |

---

## 2. Filtro "Amanhã" Quebrado no Kanban

### Problema
O filtro "Amanhã" está mostrando TODAS as tarefas em vez de filtrar apenas para o dia seguinte.

### Causa Raiz
O arquivo `src/components/KanbanBoard.tsx` tem sua **própria implementação** de filtros de data na função `getTasksForColumn` (linhas 210-247) e **não inclui o caso `"tomorrow"`**.

### Código Atual (Problemático)

```typescript
// KanbanBoard.tsx - linhas 214-246
const matchesAnyDateFilter = dueDates.some(dateFilter => {
  switch (dateFilter) {
    case "no_date": return taskDueDate === null;
    case "overdue": return ...;
    case "overdue_today": return ...; 
    case "today": return taskDueDate.toDateString() === today.toDateString();  // USA toDateString() - INCORRETO
    case "next_7_days": return ...;
    case "week": return ...;
    case "month": return ...;
    default: return true;  // <-- "tomorrow" cai aqui e retorna TRUE para TUDO!
  }
});
```

### Solução
Adicionar o caso `"tomorrow"` usando `isTomorrow` do date-fns:

```typescript
case "tomorrow": {
  if (!taskDueDate) return false;
  return isTomorrow(taskDueDate);
}
```

E corrigir o caso `"today"` para usar `isToday()`:

```typescript
case "today":
  return taskDueDate && isToday(taskDueDate);
```

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/KanbanBoard.tsx` | Adicionar caso `"tomorrow"` e usar `isToday()` para consistência |

---

## 3. Categorias com Contagem 0 no Calendário

### Problema
O filtro de categorias no calendário mostra "0" para todas as categorias.

### Causa Raiz
O componente `CategoryFilter` recebe a prop `tasks` para calcular a contagem por categoria (função `getTaskCount`). 

No calendário (`fullscreen-calendar.tsx`), a prop `tasks` **não está sendo passada** para o `CategoryFilter` interno do `KanbanFiltersBar`.

### Análise do Fluxo

1. `Calendar.tsx` passa `categories` para `FullScreenCalendar`
2. `FullScreenCalendar` passa para `KanbanFiltersBar`
3. `KanbanFiltersBar` passa para `CategoryFilter`
4. **MAS**: O array `tasks` não está sendo propagado em nenhum nível!

### Solução
Adicionar prop `tasks` ao fluxo:

1. `FullScreenCalendar` precisa receber `tasks` ou `filteredTasks`
2. Passar para `KanbanFiltersBar` 
3. `KanbanFiltersBar` já suporta prop `tasks`

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ui/fullscreen-calendar.tsx` | Adicionar prop `tasks` e passar para `KanbanFiltersBar` |
| `src/pages/Calendar.tsx` | Passar `tasks` para `FullScreenCalendar` |

---

## Detalhamento Técnico

### Correção do KanbanBoard.tsx (Filtro Amanhã)

```typescript
// Adicionar import
import { ..., isToday, isTomorrow } from "date-fns";

// Na função getTasksForColumn, modificar o switch:
switch (dateFilter) {
  case "no_date":
    return taskDueDate === null;
  case "overdue":
    return taskDueDate && isBefore(startOfDay(taskDueDate), today) && !t.is_completed;
  case "today":
    return taskDueDate && isToday(taskDueDate);  // <-- CORREÇÃO
  case "tomorrow":
    return taskDueDate && isTomorrow(taskDueDate);  // <-- ADICIONAR
  case "next_7_days": 
    // ... mantém igual
}
```

### Correção do Calendário (Contagem de Categorias)

**fullscreen-calendar.tsx:**
```typescript
interface FullScreenCalendarProps {
  // ... props existentes
  tasks?: Array<{ category_id: string; [key: string]: any }>;  // <-- ADICIONAR
}

// Na chamada do KanbanFiltersBar:
<KanbanFiltersBar
  // ... props existentes
  tasks={tasks}  // <-- ADICIONAR
/>
```

**Calendar.tsx:**
```typescript
<FullScreenCalendar
  // ... props existentes
  tasks={filteredTasks}  // <-- ADICIONAR (ou tasks se quiser contagem total)
/>
```

---

## Resumo de Alterações

| # | Feature/Bug | Arquivos | Complexidade |
|---|-------------|----------|--------------|
| 1 | Cursos ↔ Notas | migração + 4 arquivos | 6/10 |
| 2 | Filtro "Amanhã" | 1 arquivo | 2/10 |
| 3 | Contagem Categorias | 2 arquivos | 2/10 |

**Pontuação Total de Risco: 10/25** - Baixo risco.

---

## Checklist de Testes Manuais

### Filtro Amanhã:
- [ ] Acessar página de Projetos/Kanban
- [ ] Selecionar filtro "Amanhã"
- [ ] Verificar que APENAS tarefas com data de amanhã (06/02) aparecem
- [ ] Verificar que tarefas de outras datas são filtradas

### Contagem de Categorias:
- [ ] Acessar página de Calendário
- [ ] Abrir filtro de Categorias
- [ ] Verificar que cada categoria mostra contagem correta (não 0)
- [ ] Verificar que a contagem reflete tarefas do calendário

### Cursos ↔ Notas:
- [ ] Criar nova nota
- [ ] Vincular a um curso existente
- [ ] Verificar badge de curso na nota
- [ ] Verificar navegação para o curso
- [ ] Editar nota e alterar/remover vínculo com curso

