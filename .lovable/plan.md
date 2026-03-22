

# Plano: Correção do Calendário (recorrentes) + Espaçamento Mobile nas Tabs

## Problema 1: Tarefas recorrentes "piscando" no calendário

**Causa raiz**: A query em `Calendar.tsx` (linha 130) busca `.or('due_date.gte...., due_date.is.null')`, carregando TODAS as tarefas sem data. Quando o componente renderiza e filtra, tarefas sem `due_date` não aparecem em nenhum dia — mas entre o fetch e o render dos filtros, elas "piscam" na tela. Além disso, não há nenhuma configuração para o usuário decidir se quer ver tarefas recorrentes no calendário.

**Solução**:
1. **Remover `due_date.is.null`** da query do calendário — tarefas sem data não pertencem ao calendário
2. **Adicionar setting `showRecurringInCalendar`** em `AppSettings` (default: `true`) para o usuário controlar se tarefas recorrentes aparecem
3. **Filtrar recorrentes no `filteredTasks` useMemo** — se `showRecurringInCalendar === false`, excluir tarefas com `recurrence_rule`
4. **Adicionar toggle na aba Kanban/Produtividade do Config** — "Mostrar tarefas recorrentes no calendário"
5. **Carregar tasks com `useState([])` e sem flash** — garantir que o estado inicial vazio evita o "piscar"

### Arquivos alterados
- `src/pages/Calendar.tsx` — remover `due_date.is.null`, filtrar recorrentes baseado em setting
- `src/hooks/data/useSettings.ts` — adicionar `calendar.showRecurring: boolean` ao `AppSettings`
- `src/pages/Config.tsx` — adicionar toggle "Mostrar recorrentes no calendário"

---

## Problema 2: Tabs coladas no conteúdo em mobile

**Causa raiz**: No Config.tsx, `TabsList` com `grid-cols-4 lg:grid-cols-8` (8 tabs) fica extremamente comprimido em 390px. O `space-y-6` entre Tabs e TabsContent existe, mas as tabs em si ficam empilhadas e coladas visualmente no card abaixo. A imagem mostra que as duas linhas de tabs (4+4) ficam sem margin-bottom suficiente antes do primeiro Card.

**Solução**:
1. **Config.tsx**: Trocar `grid-cols-4 lg:grid-cols-8` por um layout de tabs com scroll horizontal em mobile (`flex overflow-x-auto`) ou wrapping com `flex flex-wrap gap-1`. Adicionar `mb-4` ou `mb-6` na TabsList para criar espaço entre as tabs e o conteúdo.
2. **Aplicar globalmente**: Revisar as 10 ocorrências de `TabsList` com `grid-cols` e adicionar espaçamento consistente. Focar especialmente em:
   - `Config.tsx` (8 tabs — o pior caso)
   - `Settings.tsx` (5 tabs)
   - `NotificationsDashboard.tsx` (5 tabs)

### Abordagem para mobile tabs
- Em telas < 768px, usar `flex overflow-x-auto whitespace-nowrap` em vez de `grid`, permitindo scroll horizontal nas tabs
- Adicionar `mb-4` à TabsList para separar das cards abaixo
- No Config.tsx especificamente, manter `grid-cols-8` no desktop e scroll horizontal no mobile

### Arquivos alterados
- `src/pages/Config.tsx` — TabsList responsiva com scroll horizontal mobile + margin bottom
- `src/pages/Settings.tsx` — mesmo padrão
- `src/pages/NotificationsDashboard.tsx` — mesmo padrão
- `src/components/whatsapp/WhatsAppSettings.tsx` — ajuste de spacing menor

---

## Resumo de alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/data/useSettings.ts` | Adicionar `calendar: { showRecurring: boolean }` |
| `src/pages/Calendar.tsx` | Remover `due_date.is.null`, filtrar recorrentes por setting |
| `src/pages/Config.tsx` | Toggle recorrentes + tabs mobile scroll horizontal + spacing |
| `src/pages/Settings.tsx` | Tabs mobile responsivas |
| `src/pages/NotificationsDashboard.tsx` | Tabs mobile responsivas |

## Checklist manual
- [ ] Abrir calendário → tarefas devem aparecer de imediato sem "piscar"
- [ ] Desativar "Mostrar recorrentes no calendário" → recorrentes somem do calendário
- [ ] Abrir /config em mobile (390px) → tabs devem ter scroll horizontal, com espaço entre tabs e cards
- [ ] Testar /config em desktop → layout grid normal mantido

## Próximas fases
- Etapa 8 (Offline + Wiki) — já implementada
- Próxima: relatório mensal automático, paginação infinita

