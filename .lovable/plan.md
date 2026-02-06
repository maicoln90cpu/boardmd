# Plano de Correção - CONCLUÍDO ✅

## Resumo das Correções Implementadas

| # | Problema | Status | Arquivos Modificados |
|---|----------|--------|---------------------|
| 1 | Atrelar cursos às anotações | ✅ Concluído | Migração SQL + useNotes.ts + NoteEditorHeader.tsx + useNoteEditorState.ts + NoteEditor.tsx |
| 2 | Filtro "Amanhã" quebrado no Kanban | ✅ Concluído | KanbanBoard.tsx (linhas 214-247) |
| 3 | Categorias com contagem 0 no Calendário | ✅ Concluído | fullscreen-calendar.tsx + Calendar.tsx |

---

## Detalhes das Correções

### 1. Atrelar Cursos às Anotações
- **Migração SQL**: Adicionado campo `linked_course_id` na tabela `notes`
- **Interface Note**: Atualizada para incluir `linked_course_id`
- **NoteEditorHeader**: Adicionado seletor de curso com navegação para página de cursos
- **useNoteEditorState**: Adicionado estado e lógica para gerenciar vínculo de curso

### 2. Filtro "Amanhã" no Kanban
- **Causa**: O switch de filtros não tinha case `"tomorrow"`, caindo no `default: return true`
- **Correção**: Adicionado `case "tomorrow"` usando `isTomorrow()` do date-fns
- **Melhoria adicional**: Trocado `toDateString()` por funções do date-fns (`isToday()`, `startOfDay()`) para consistência

### 3. Contagem de Categorias no Calendário
- **Causa**: A prop `tasks` não era passada para o `KanbanFiltersBar` no calendário
- **Correção**: Adicionada prop `tasks` na interface `FullScreenCalendarProps` e propagada de `Calendar.tsx` → `FullScreenCalendar` → `KanbanFiltersBar`

---

## Checklist de Testes Manuais

### Filtro Amanhã:
- [ ] Acessar página de Projetos/Kanban
- [ ] Selecionar filtro "Amanhã"
- [ ] Verificar que APENAS tarefas com data de amanhã aparecem
- [ ] Verificar que tarefas de outras datas são filtradas

### Contagem de Categorias:
- [ ] Acessar página de Calendário
- [ ] Abrir filtro de Categorias
- [ ] Verificar que cada categoria mostra contagem correta (não 0)

### Cursos ↔ Notas:
- [ ] Criar/editar nota
- [ ] Vincular a um curso existente
- [ ] Verificar botão "Ver Curso" aparece após vincular
- [ ] Clicar no botão e verificar navegação para página de cursos
- [ ] Editar nota e alterar/remover vínculo com curso
