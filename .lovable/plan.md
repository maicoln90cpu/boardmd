

# Plano: Filtros nos Gastos, Horário do Gasto e Timezone Padronizado

## Resumo

Quatro entregas: (1) adicionar filtros por categoria, pagamento, moeda e data nos itens de cada tema; (2) incluir campo de horário no registro de gastos; (3) migração do banco para suportar horário; (4) padronizar uso de timezone do sistema (dateUtils) no módulo de custos.

---

## 1. Migração: Adicionar coluna `cost_time` à tabela `cost_items`

Adicionar coluna `cost_time` (tipo `time`, default `'12:00'`, not null) à tabela `cost_items`.

```sql
ALTER TABLE public.cost_items ADD COLUMN cost_time time NOT NULL DEFAULT '12:00:00';
```

## 2. Incluir Horário nos Formulários e Cards

### `CostItemForm.tsx`
- Adicionar estado `costTime` (default: horário atual no timezone do sistema via `formatTimeOnlyBR(new Date())`).
- Adicionar campo `<Input type="time">` ao lado do campo de data.
- Enviar `cost_time` no `onAdd`.

### `CostItemEditModal.tsx`
- Adicionar campo `cost_time` no modal de edição com o mesmo padrão.

### `CostThemeDetail.tsx`
- Exibir o horário ao lado da data no badge de cada item (ex: `07/03 14:30`).

### `useCostCalculator.ts`
- Atualizar `CostItem` interface para incluir `cost_time: string`.
- Atualizar `createItem` e `updateItem` mutations para incluir `cost_time`.

## 3. Filtros nos Itens de Cada Tema

### Novo componente `CostFiltersBar.tsx`
- Filtros: Categoria (multi-select), Forma de Pagamento (multi-select), Moeda (multi-select), Período (data início/fim).
- Estado local no `CostThemeDetail`.
- Filtragem aplicada no lado do cliente sobre a lista `items` antes de renderizar.

### `CostThemeDetail.tsx`
- Adicionar barra de filtros abaixo do formulário de adição.
- Filtrar `items` com base nos filtros selecionados.
- Recalcular `totals` e `reportText` com base nos itens filtrados (ou manter totais globais e mostrar subtotal filtrado separadamente).

## 4. Padronizar Timezone no Módulo de Custos

### `CostItemForm.tsx`
- Usar `getNowInTimezone()` de `dateUtils` para obter data e hora atuais como defaults.
- Formatar data default com timezone correto em vez de `new Date().toISOString().slice(0, 10)` (que usa UTC).

### `CostThemeDetail.tsx`
- Formatar exibição de datas usando `formatDateShortBR` de `dateUtils`.

### Regra geral
- Sempre que uma data/hora "atual" for inicializada em qualquer formulário do sistema, usar `getNowInTimezone()` ao invés de `new Date()` diretamente, garantindo consistência com o timezone configurado (America/Sao_Paulo por padrão).

---

## Análise de Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Migração cost_time | 1 | 1 |
| Horário nos formulários | 1 | 2 |
| Filtros nos itens | 2 | 4 |
| Padronizar timezone | 1 | 2 |
| **Total** | **5** | **9** |

Limite seguro: 25. Total: 14 -- abaixo do limite.

## Checklist de Testes Manuais
- [ ] Criar item e verificar que horário é salvo e exibido corretamente
- [ ] Editar item e alterar horário, confirmar persistência
- [ ] Verificar que a data/hora default reflete o timezone de São Paulo (não UTC)
- [ ] Testar filtro por categoria: selecionar "Alimentação" e verificar que só itens dessa categoria aparecem
- [ ] Testar filtro por forma de pagamento
- [ ] Testar filtro por período de datas
- [ ] Limpar filtros e verificar que todos os itens voltam
- [ ] Verificar que totais/resumo refletem os itens filtrados

