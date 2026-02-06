

# Plano de Correção - 4 Problemas no Calendário e Sistema

---

## Resumo dos Problemas

| # | Problema | Causa Raiz | Risco | Complexidade |
|---|----------|------------|-------|--------------|
| 1 | Filtros de prioridade e data quebrados no Calendário | Calendar.tsx usa valores string simples mas KanbanFiltersBar agora usa arrays (multi-select) | Medio | 5/10 |
| 2 | Presets no Calendário | Presets ja existem mas nao funcionam corretamente com multi-select | Baixo | 3/10 |
| 3 | Recorrencia quinta -> sexta | `recurrenceUtils.ts` (cliente) usa `new Date().getDay()` em UTC, nao no timezone local. As 21h de quinta no Brasil = sexta em UTC | Alto | 6/10 |
| 4 | Categoria "Diario" fantasma | Categoria legada existe no banco com 37 tarefas, causando duplicidade (ex: "Igreja" em Pessoal E Diario) | Medio | 4/10 |

---

## 1. Filtros de Prioridade e Data Quebrados no Calendario

### Causa Raiz

O `Calendar.tsx` declara os filtros como **strings simples**:
```typescript
const [priorityFilter, setPriorityFilter] = useState("all");       // string
const [dueDateFilter, setDueDateFilter] = useState("all");          // string
```

Mas o `KanbanFiltersBar` agora usa `MultiSelectFilter` que envia **arrays** via `onChange`. Quando o usuario seleciona "Alta", o componente envia `["high"]` (array), mas a logica de filtragem do calendario faz:

```typescript
if (priorityFilter !== "all") {  // ["high"] !== "all" -> true
  filtered = filtered.filter(task => task.priority === priorityFilter);  
  // task.priority === ["high"] -> NUNCA MATCH! String vs Array
}
```

Alem disso, falta o caso `"tomorrow"` no switch de datas do calendario.

### Solucao

Converter os estados do Calendar.tsx para arrays e refatorar a logica de filtragem:

**Arquivo:** `src/pages/Calendar.tsx`

1. Mudar estados para arrays:
```typescript
const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
const [dueDateFilter, setDueDateFilter] = useState<string[]>([]);
const [tagFilter, setTagFilter] = useState<string[]>([]);
```

2. Refatorar `filteredTasks` para usar logica de arrays (OR logic), incluindo caso "tomorrow":
```typescript
// Filtro de prioridade (OR)
if (priorityFilter.length > 0) {
  filtered = filtered.filter(task => priorityFilter.includes(task.priority || "medium"));
}

// Filtro de data (OR) com isTomorrow
if (dueDateFilter.length > 0) {
  filtered = filtered.filter(task => {
    return dueDateFilter.some(filter => matchesSingleDateFilter(task, filter, today));
  });
}
```

3. Atualizar `currentFilters` e `handleApplyPreset` para compatibilidade com arrays.

4. Importar `isTomorrow` do date-fns.

---

## 2. Presets no Calendario

Os presets ja existem (`FilterPresetsManager` esta renderizado), mas precisam ser ajustados para funcionar com os novos tipos array. Isto sera corrigido automaticamente ao resolver o item 1, pois os presets salvam/restauram os mesmos valores de filtro.

A unica alteracao adicional e garantir que `handleApplyPreset` normalize corretamente os valores:

```typescript
const handleApplyPreset = (filters: FilterPresetFilters) => {
  if (filters.priorityFilter !== undefined) {
    // Normalizar para array
    const val = filters.priorityFilter;
    setPriorityFilter(Array.isArray(val) ? val : val === "all" || val === "" ? [] : [val]);
  }
  // Similar para tagFilter e dueDateFilter
};
```

---

## 3. Recorrencia Quinta -> Sexta (Bug de Timezone)

### Causa Raiz

No arquivo `src/lib/recurrenceUtils.ts` (usado pelo cliente quando `immediateRecurrentReset` esta ativo), o calculo usa:

```typescript
const now = new Date();           // UTC time
const currentDay = now.getDay();  // Dia da semana em UTC!
```

**Exemplo do bug:**
- Usuario no Brasil (UTC-3) risca tarefa na **quinta-feira as 21:00 local**
- Em UTC: sexta-feira 00:00
- `now.getDay()` retorna **5 (sexta)**, nao 4 (quinta)
- O algoritmo procura proximo dia >= 5 na lista `[4]` (quinta)
- Nao encontra, vai para proxima semana: `7 - 5 + 4 = 6 dias` -> **quarta** da proxima semana

A Edge Function (`reset-recurring-tasks`) ja tem a correcao via `getNowInUserTimezone()`, mas o **cliente** nao.

### Solucao

**Arquivo:** `src/lib/recurrenceUtils.ts`

Adicionar funcao para obter data no timezone do usuario e usar em `calculateNextRecurrenceDate`:

```typescript
function getNowInTimezone(): Date {
  const now = new Date();
  const tz = getTimezone(); // de dateUtils.ts
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const getValue = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  return new Date(
    parseInt(getValue('year')),
    parseInt(getValue('month')) - 1,
    parseInt(getValue('day')),
    parseInt(getValue('hour')),
    parseInt(getValue('minute')),
    parseInt(getValue('second'))
  );
}
```

E substituir `const now = new Date()` por `const now = getNowInTimezone()` na funcao `calculateNextRecurrenceDate`.

Isso alinha a logica do cliente com a Edge Function.

---

## 4. Categoria "Diario" Fantasma

### Dados no Banco

A categoria "Diario" (id: `42e2fa73-d029-43e3-931a-8264c3a0eae5`) ainda existe com **37 tarefas** vinculadas. Isso causa:

- Duplicidade: "Igreja" aparece em "Pessoal" E "Diario" no dia 11/02
- Contagem inflada no filtro de categorias (37 tarefas extras)

### Solucao

**Migracao SQL** para mover tarefas orfas e deletar a categoria:

```sql
-- Mover tarefas da categoria "Diario" para "Pessoal"
-- (exceto as que ja tem duplicata em outra categoria)
UPDATE tasks 
SET category_id = '2544ed8d-b892-4aa4-a806-8c02a90d6773'  -- Pessoal
WHERE category_id = '42e2fa73-d029-43e3-931a-8264c3a0eae5' -- Diario
AND title NOT IN (
  SELECT t2.title FROM tasks t2 
  WHERE t2.category_id != '42e2fa73-d029-43e3-931a-8264c3a0eae5'
  AND t2.due_date IS NOT NULL
);

-- Deletar tarefas duplicadas que ficaram na categoria Diario
DELETE FROM tasks 
WHERE category_id = '42e2fa73-d029-43e3-931a-8264c3a0eae5';

-- Deletar a categoria Diario
DELETE FROM categories 
WHERE id = '42e2fa73-d029-43e3-931a-8264c3a0eae5';
```

**IMPORTANTE:** Antes de executar, sera apresentada a lista completa de tarefas afetadas para aprovacao.

---

## Arquivos a Modificar

| # | Arquivo | Alteracao |
|---|---------|-----------|
| 1 | `src/pages/Calendar.tsx` | Converter filtros para arrays, adicionar "tomorrow", refatorar filtragem |
| 2 | `src/lib/recurrenceUtils.ts` | Adicionar conversao de timezone no calculo de recorrencia |
| 3 | Migracao SQL | Mover tarefas de "Diario" para "Pessoal" e deletar categoria |

**Pontuacao Total de Risco: 15/25** - Dentro do limite seguro.

---

## Checklist de Testes Manuais

### Filtros do Calendario:
- [ ] Abrir Calendario
- [ ] Selecionar filtro de prioridade "Alta" - verificar que so aparecem tarefas de prioridade alta
- [ ] Selecionar multi-prioridade "Alta" + "Media" - verificar OR logic
- [ ] Selecionar filtro de data "Amanha" - verificar que so mostra tarefas do dia 07/02
- [ ] Selecionar filtro de data "Hoje" - verificar que so mostra tarefas do dia 06/02
- [ ] Verificar que categorias mostram contagem correta (sem "Diario")
- [ ] Limpar filtros e verificar que tudo volta ao normal

### Recorrencia (Timezone):
- [ ] Criar tarefa recorrente semanal (quinta-feira)
- [ ] Marcar como concluida apos as 21h (horario Brasil)
- [ ] Verificar que a proxima data e QUINTA da proxima semana (nao sexta)
- [ ] Repetir teste com tarefa diaria - verificar que avanca 1 dia correto

### Categoria Diario:
- [ ] Verificar que "Diario" nao aparece mais no filtro de categorias
- [ ] Verificar que "Igreja" aparece apenas 1 vez no dia 11/02
- [ ] Verificar que tarefas que estavam em "Diario" foram movidas para "Pessoal"

### Presets:
- [ ] Salvar um preset com filtros de prioridade + data
- [ ] Limpar filtros
- [ ] Carregar o preset e verificar que os filtros sao restaurados corretamente

