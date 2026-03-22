

# Plano: Tabs em Múltiplas Linhas (sem scroll horizontal) + Bug do Calendário Travado

## Problema 1: Tabs com scroll horizontal indesejado

O usuário quer que as tabs **quebrem em múltiplas linhas** quando não cabem na tela, com mais espaço entre as tabs e o conteúdo abaixo. **Não** quer scroll horizontal.

### Solução
Trocar `flex overflow-x-auto whitespace-nowrap` por `flex flex-wrap gap-1` em todas as TabsList que usam essa abordagem. Manter `md:grid` para desktop. Adicionar `mb-6` para espaçamento generoso.

### Arquivos afetados
| Arquivo | TabsList atual | Novo |
|---------|---------------|------|
| `src/pages/Config.tsx` (L626) | `flex overflow-x-auto whitespace-nowrap md:grid md:grid-cols-8 mb-4` | `flex flex-wrap gap-1 md:grid md:grid-cols-8 mb-6` |
| `src/pages/Settings.tsx` (L56) | `flex overflow-x-auto whitespace-nowrap md:grid md:grid-cols-5 mb-4` | `flex flex-wrap gap-1 md:grid md:grid-cols-5 mb-6` |
| `src/pages/NotificationsDashboard.tsx` (L55) | `flex overflow-x-auto whitespace-nowrap md:grid md:grid-cols-5 mb-4` | `flex flex-wrap gap-1 md:grid md:grid-cols-5 mb-6` |

### Outros locais com `overflow-x-auto` (não precisam de alteração)
- `SearchFilters.tsx` — filtros horizontais, scroll faz sentido
- `RichTextToolbar.tsx` — toolbar de editor, `flex-wrap` já usado
- `GanttView.tsx` — timeline, scroll é necessário
- `ProductivityHeatmap.tsx` — grid de dados, scroll é necessário
- `dropdown-menu.tsx`, `popover.tsx` — componentes UI genéricos
- `NoteEditor.tsx` — code blocks
- Pomodoro: TabsList com `grid-cols-3` (3 tabs cabem em qualquer tela, ok)

---

## Problema 2: Calendário trava navegação

**Causa provável**: O `DraggableTask` no `fullscreen-calendar.tsx` usa `touch-none` (L163), que bloqueia **todos** os gestos de toque no elemento. Combinado com `{...listeners} {...attributes}` do dnd-kit que capturam todos os eventos de pointer, isso pode impedir que toques no mobile propagarem corretamente para o menu hambúrguer ou links de navegação.

Além disso, o container do calendário usa `overflow-hidden` no `<main>` (L454 do Calendar.tsx), que pode prender o scroll.

### Solução
1. No `fullscreen-calendar.tsx` (L163): remover `touch-none` do `DraggableTask` — o `TouchSensor` do dnd-kit já tem `activationConstraint` com delay de 200ms e tolerance de 8px, o que é suficiente para distinguir scroll de drag
2. Verificar se o header mobile (z-50) da Sidebar está acessível por cima do calendário — o `KanbanFiltersBar` dentro do calendário pode estar criando uma camada que bloqueia o header

### Arquivo alterado
- `src/components/ui/fullscreen-calendar.tsx` — remover `touch-none` da classe do `DraggableTask`

---

## Resumo

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Config.tsx` | TabsList: `flex-wrap gap-1 mb-6` (sem scroll) |
| `src/pages/Settings.tsx` | TabsList: `flex-wrap gap-1 mb-6` (sem scroll) |
| `src/pages/NotificationsDashboard.tsx` | TabsList: `flex-wrap gap-1 mb-6` (sem scroll) |
| `src/components/ui/fullscreen-calendar.tsx` | Remover `touch-none` do DraggableTask |

## Checklist manual
- [ ] Abrir /config em mobile (390px) → tabs devem quebrar em 2 linhas com bom espaço antes do card
- [ ] Abrir /settings e /notifications em mobile → mesmo comportamento
- [ ] Nenhuma página deve ter scroll horizontal nas tabs
- [ ] Abrir /calendar em mobile → navegar pelo menu hambúrguer para outra página → deve funcionar sem travar
- [ ] Arrastar tarefas no calendário desktop → deve continuar funcionando

