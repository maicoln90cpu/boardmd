

# Plano: Fix Navegação Calendário + Preferências de Visualização no Config

## Problema 1: Navegação travada após entrar no Calendário

**Diagnóstico**: O `<main>` do Calendar.tsx usa `overflow-hidden` (L454), criando um contexto de contenção. Combinado com dois `DndContext` simultâneos (desktop L660 + mobile L680) que adicionam listeners globais de pointer no document, os eventos de clique nos links do sidebar podem ser interceptados pelos sensors antes de propagar para o React Router `<Link>`. O URL muda (React Router processa o `navigate()`), mas o DndContext captura o evento e impede o cleanup correto do componente.

**Solução**:
1. **Calendar.tsx L454**: Trocar `overflow-hidden` por `overflow-auto` no `<main>` — alinha com Index.tsx que usa `overflow-auto`
2. **fullscreen-calendar.tsx**: Consolidar os dois DndContexts em um único, evitando listeners duplicados no document
3. **fullscreen-calendar.tsx**: Adicionar `id` único ao DndContext para evitar conflitos com outros DndContexts em páginas vizinhas
4. Adicionar cleanup explícito dos sensors via key no DndContext que muda quando a rota muda

### Arquivos alterados
- `src/pages/Calendar.tsx` — `overflow-hidden` → `overflow-auto`
- `src/components/ui/fullscreen-calendar.tsx` — unificar DndContexts

---

## Problema 2: Preferências de visualização pré-configuráveis no Config

O usuário quer que o Config defina o **estado inicial** de cada módulo ao abrir. Mudanças feitas dentro da tela valem só na sessão.

### Novas preferências em AppSettings

| Módulo | Preferência | Tipo | Default |
|--------|------------|------|---------|
| Anotações | `notes.defaultSidebarMode` | `'notebooks' \| 'wiki'` | `'notebooks'` |
| Anotações | `notes.defaultViewMode` | `'list' \| 'grid'` | `'list'` |
| Anotações | `notes.defaultSortBy` | `'updated' \| 'alphabetical' \| 'created'` | `'updated'` |
| Calendário | `calendar.defaultViewType` | `'month' \| 'week' \| 'day'` | `'month'` |
| Kanban | `kanban.defaultViewMode` | `'kanban' \| 'table' \| 'gantt'` | `'kanban'` |
| Kanban | `kanban.defaultDisplayMode` | `'by_category' \| 'all_tasks'` | `'all_tasks'` |

### Implementação

1. **useSettings.ts**: Expandir `AppSettings` com `notes?: { defaultSidebarMode, defaultViewMode, defaultSortBy }`, expandir `calendar` com `defaultViewType`, expandir `kanban` com `defaultViewMode`, `defaultDisplayMode`. Atualizar `defaultSettings` e `deepMergeSettings`.

2. **Notes.tsx**: Inicializar `sidebarMode`, `notesViewMode`, `sortBy` com `settings.notes?.defaultSidebarMode || 'notebooks'` etc.

3. **fullscreen-calendar.tsx**: Aceitar nova prop `defaultViewType` e inicializar `viewType` com ela.

4. **Calendar.tsx**: Passar `settings.calendar?.defaultViewType` para o `FullScreenCalendar`.

5. **useIndexViewState.ts**: Aceitar `defaultDisplayMode` do settings e inicializar `displayMode` com ele.

6. **ProjectsKanbanView.tsx**: Aceitar e usar `defaultViewMode` do settings para inicializar `viewMode`.

7. **Config.tsx**: Adicionar nova seção "Preferências de Visualização" na aba Kanban/Produtividade com Selects para cada preferência:
   - Anotações: Modo Padrão (Cadernos/Wiki), Visualização (Lista/Grid), Ordenação
   - Calendário: Visualização Padrão (Mês/Semana/Dia)
   - Kanban: Modo Padrão (Kanban/Tabela/Gantt), Exibição (Por Categoria/Todas)

### Arquivos alterados
| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/data/useSettings.ts` | Expandir AppSettings com notes, calendar.defaultViewType, kanban.defaultViewMode/defaultDisplayMode |
| `src/pages/Notes.tsx` | Ler defaults do settings para inicializar estados |
| `src/components/ui/fullscreen-calendar.tsx` | Aceitar prop `defaultViewType`, inicializar viewType |
| `src/pages/Calendar.tsx` | Passar defaultViewType; fix overflow-hidden |
| `src/hooks/index/useIndexViewState.ts` | Aceitar defaultDisplayMode do settings |
| `src/components/kanban/ProjectsKanbanView.tsx` | Aceitar defaultViewMode |
| `src/pages/Config.tsx` | Seção "Preferências de Visualização" com 6 novos Selects |
| `src/hooks/useIndexState.ts` | Passar defaultDisplayMode para useIndexViewState |

---

## Checklist manual
- [ ] Abrir /calendar → navegar para /notes pelo menu → página deve mudar corretamente
- [ ] Abrir /calendar → navegar pelo hambúrguer mobile → deve funcionar
- [ ] Abrir Config > Kanban → seção "Preferências de Visualização" deve ter 6 opções
- [ ] Alterar "Modo Padrão Anotações" para Wiki → abrir /notes → sidebar deve abrir em Wiki
- [ ] Alterar "Visualização Calendário" para Semana → abrir /calendar → deve abrir em visão semanal
- [ ] Alterar "Modo Kanban" para Tabela → abrir / → deve abrir em visão tabela
- [ ] Mudanças feitas dentro da tela (ex: trocar Wiki→Cadernos no Notes) NÃO devem alterar a preferência salva

## Próximas fases
- Relatório mensal automático com PDF
- Paginação infinita nas listagens

