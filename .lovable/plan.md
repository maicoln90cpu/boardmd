

# Plano: Ordenação por Horário no Calendário + Presets Separados por Contexto (localStorage)

## 1. Ordenar tarefas por horário no calendário

### `src/pages/Calendar.tsx`
- No `calendarData` useMemo, ordenar as tasks de cada dia por `due_date` (horário mais cedo primeiro) usando sort antes de adicionar ao mapa.
- No `selectedDateTasks` useMemo, ordenar o resultado pelo horário do `due_date`.

### `src/components/ui/fullscreen-calendar.tsx`
- Garantir que a renderização das tasks dentro de cada célula do dia respeita a ordem do array (já deve ser o caso se o array vier ordenado).

## 2. Separar presets de filtros: Kanban vs Calendário

### `src/hooks/useFilterPresets.ts`
- Refatorar para aceitar um parâmetro `scope: "kanban" | "calendar"`.
- Ao invés de salvar/ler do `settings` (DB), usar **localStorage** com chaves separadas: `filterPresets_kanban` e `filterPresets_calendar`.
- Manter a mesma interface pública (`presets`, `savePreset`, `applyPreset`, etc.), mas os dados são isolados por scope.

### `src/components/kanban/FilterPresetsManager.tsx`
- Aceitar prop `scope` e passar ao `useFilterPresets(scope)`.

### `src/pages/Calendar.tsx`
- Passar `scope="calendar"` ao `FilterPresetsManager`.

### `src/components/kanban/KanbanFiltersBar.tsx`
- Garantir que o `FilterPresetsManager` embutido usa `scope="kanban"` (ou default).

## 3. Migrar armazenamento para localStorage

### `src/hooks/useFilterPresets.ts`
- Substituir `useSettings` por `useState` + `localStorage.getItem/setItem`.
- Usar `useLocalStorage` hook existente ou implementar leitura/escrita diretas.
- Remover dependência de `saveSettings` e `updateSettings` para presets.

---

## Análise de Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Ordenação por horário | 1 | 1 |
| Separar presets por scope | 1 | 3 |
| Migrar para localStorage | 1 | 2 |
| **Total** | **3** | **6** |

