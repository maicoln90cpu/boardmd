# Referência de Componentes - TaskFlow

Guia dos componentes principais com props e uso.

## 📚 Documentação Relacionada

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Estrutura técnica
- [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - Fluxos de dados

---

## Componentes de Página

### KanbanBoard
**Arquivo**: `src/components/KanbanBoard.tsx`  
**Props**: Recebe dados via `useIndexData()` no parent  
**Responsabilidade**: Orquestra visualizações Desktop/Mobile do Kanban  
**Subcomponentes**: KanbanDesktopView, MobileKanbanView, KanbanFiltersBar, DroppableColumn

### NoteEditor
**Arquivo**: `src/components/notes/NoteEditor.tsx`  
**Props**: `{ note, onUpdate, onSave?, tasks?, refetchTasks? }`  
**Responsabilidade**: Editor rico com TipTap  
**Subcomponentes**: NoteEditorHeader, NoteEditorContent, NoteEditorFooter  
**Hook interno**: `useNoteEditorState`

### TaskCard
**Arquivo**: `src/components/TaskCard.tsx`  
**Props**: `{ task, columns, categories, onEdit, onDelete, ... }`  
**Responsabilidade**: Card de tarefa com ações rápidas  
**Subcomponentes**: TaskCardHeader, TaskCardBadges, TaskCardTags, TaskCardActions, TaskCardUltraCompact

### TaskModal
**Arquivo**: `src/components/TaskModal.tsx`  
**Props**: `{ open, onClose, onSave, task?, categoryId? }`  
**Responsabilidade**: Criação e edição de tarefas  
**Features**: Subtarefas, recorrência, tags, prioridade, data

### PomodoroTimer
**Arquivo**: `src/components/PomodoroTimer.tsx`  
**Props**: `{ tasks? }`  
**Responsabilidade**: Timer Pomodoro com templates e vinculação de tarefas

---

## Componentes do Kanban

### DroppableColumn
**Arquivo**: `src/components/kanban/DroppableColumn.tsx`  
**Props**: `{ column, tasks, onEditTask, onDeleteTask, ... }`  
**Responsabilidade**: Coluna droppable do Kanban com @dnd-kit

### KanbanFiltersBar
**Arquivo**: `src/components/kanban/KanbanFiltersBar.tsx`  
**Responsabilidade**: Barra de filtros (prioridade, tags, busca, presets)

### VirtualizedTaskList
**Arquivo**: `src/components/kanban/VirtualizedTaskList.tsx`  
**Responsabilidade**: Lista virtualizada para colunas com 50+ tarefas  
**Usa**: `@tanstack/react-virtual`

### GanttView
**Arquivo**: `src/components/kanban/GanttView.tsx`  
**Responsabilidade**: Visualização Gantt de tarefas com timeline

### TaskTableView
**Arquivo**: `src/components/kanban/TaskTableView.tsx`  
**Responsabilidade**: Visualização em tabela das tarefas

---

## Componentes de Notas

### NoteEditorContent
**Arquivo**: `src/components/notes/NoteEditorContent.tsx`  
**Responsabilidade**: Wrapper do TipTap Editor com extensões

### BacklinksPanel
**Arquivo**: `src/components/notes/BacklinksPanel.tsx`  
**Responsabilidade**: Painel de backlinks (notas que referenciam a nota atual)

### WikiNavigation
**Arquivo**: `src/components/notes/WikiNavigation.tsx`  
**Responsabilidade**: Navegação entre notas via links internos

### TaskSelectorModal
**Arquivo**: `src/components/notes/TaskSelectorModal.tsx`  
**Responsabilidade**: Modal para selecionar/criar tarefa e inserir no editor

---

## Componentes do Dashboard

### DailyHeroCard
**Arquivo**: `src/components/dashboard/DailyHeroCard.tsx`  
**Responsabilidade**: Card principal com resumo do dia

### ProductivityHeatmap
**Arquivo**: `src/components/dashboard/ProductivityHeatmap.tsx`  
**Responsabilidade**: Heatmap de produtividade estilo GitHub

### GamificationPanel
**Arquivo**: `src/components/dashboard/GamificationPanel.tsx`  
**Responsabilidade**: Painel de pontos, nível, streak e conquistas

### ProductivityInsights
**Arquivo**: `src/components/dashboard/ProductivityInsights.tsx`  
**Responsabilidade**: Insights gerados por IA

---

## Componentes de Sistema

### Sidebar
**Arquivo**: `src/components/Sidebar.tsx`  
**Responsabilidade**: Navegação principal com menu e categorias

### Topbar
**Arquivo**: `src/components/Topbar.tsx`  
**Responsabilidade**: Barra superior com busca global e ações

### GlobalSearch
**Arquivo**: `src/components/GlobalSearch.tsx`  
**Responsabilidade**: Busca global (Ctrl+K) com resultados de tarefas

### ErrorBoundary
**Arquivo**: `src/components/ErrorBoundary.tsx`  
**Responsabilidade**: Captura erros de renderização, exibe fallback amigável

### ProtectedRoute
**Arquivo**: `src/components/ProtectedRoute.tsx`  
**Responsabilidade**: Redireciona para login se não autenticado

---

## Hooks Principais

| Hook | Arquivo | Responsabilidade |
|------|---------|-----------------|
| `useTasks` | `hooks/tasks/useTasks.ts` | CRUD de tarefas + Realtime |
| `useNotes` | `hooks/useNotes.ts` | CRUD de notas + content on-demand |
| `useCategories` | `hooks/data/useCategories.ts` | Categorias/projetos |
| `useColumns` | `hooks/data/useColumns.ts` | Colunas do Kanban |
| `useSettings` | `hooks/data/useSettings.ts` | Configurações do usuário |
| `usePomodoro` | `hooks/usePomodoro.ts` | Timer e sessões |
| `useNoteTaskSync` | `hooks/useNoteTaskSync.ts` | Sync bidirecional nota↔tarefa |
| `useGoals` | `hooks/useGoals.ts` | Metas com auto-incremento |
| `useHabits` | `hooks/useHabits.ts` | Hábitos e check-ins |
| `useCourses` | `hooks/useCourses.ts` | Gestão de cursos |
| `useTools` | `hooks/useTools.ts` | Ferramentas e API keys |
| `useKanbanDragDrop` | `hooks/useKanbanDragDrop.ts` | Lógica de drag & drop |

---

## Extensões TipTap Customizadas

| Extensão | Arquivo | Descrição |
|----------|---------|-----------|
| TaskBlockExtension | `notes/extensions/TaskBlockExtension.ts` | Bloco de tarefa embutido na nota |
| BacklinkExtension | `notes/extensions/BacklinkExtension.ts` | Links internos entre notas |
| HeadingWithIdExtension | `notes/extensions/HeadingWithIdExtension.ts` | Headings com ID para TOC |
| PriorityBadgeExtension | `notes/extensions/PriorityBadgeExtension.ts` | Badge de prioridade inline |

---

*Última atualização: 28 de Março de 2026*
