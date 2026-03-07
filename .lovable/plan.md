

# Plano: Corrigir Cálculos e Mostrar Conversões nos Cards de Item

## Problemas Identificados

### 1. Bug nos totais por categoria (`byCategory`)
No `calculateTotals` (linha 223), os valores de categorias diferentes são somados **sem conversão de moeda**. Se um item é 100 BRL e outro é 40 USD, ambos na categoria "Aleatórios", o total mostra 140 — misturando moedas. Isso explica os números inflados no resumo.

### 2. Bug nas taxas de CC acumuladas
As taxas de cartão de crédito (linhas 226-230) também somam valores de moedas diferentes sem converter.

### 3. Cards de item sem valores convertidos
Cada item mostra apenas o valor na moeda original. O usuário quer ver o valor convertido em **todas as moedas** do tema.

## Alterações

### 1. `src/hooks/useCostCalculator.ts` — Corrigir `calculateTotals`

- **`byCategory`**: Converter cada item para a moeda base antes de somar por categoria
- **`ccFees` e `ccIOF`**: Converter taxas para a moeda base antes de acumular
- Resultado: todos os totais por categoria e taxas ficam na moeda base do tema

### 2. `src/components/costs/CostThemeDetail.tsx` — Mostrar conversões por item

- Em cada card de item, abaixo do valor original, mostrar uma linha com os valores convertidos em todas as outras moedas do tema
- Usar a função `convertAmount` para calcular cada conversão
- Exibir como texto pequeno: `≈ 19.45 BRL | 5054.40 ARS`

### 3. `src/components/costs/CostSummary.tsx` — Indicar moeda base nos totais por categoria

- Adicionar o código da moeda base junto aos totais por categoria para clareza

### 4. `src/components/costs/CostThemeCard.tsx` — Mostrar totais em todas as moedas

- Alterar o card para receber `converted: Record<string, number>` em vez de apenas `totalBase`
- Exibir uma linha por moeda configurada no tema

## Análise de Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Corrigir byCategory (converter para base) | 2 | 3 |
| Corrigir CC fees (converter para base) | 1 | 2 |
| Conversões nos cards de item | 1 | 2 |
| Totais em todas moedas no ThemeCard | 1 | 1 |
| **Total** | **5** | **8** |

## Checklist de Testes Manuais
- [ ] Verificar que totais por categoria mostram valores corretos na moeda base
- [ ] Verificar que taxas de CC são calculadas na moeda base
- [ ] Verificar que cada card de item mostra valores em todas as moedas do tema
- [ ] Verificar que o card de tema na listagem mostra totais em todas as moedas

