

# Plano: Categoria, Forma de Pagamento e Taxas no Calculador de Custos

## Resumo

Adicionar 3 novos campos aos itens de custo: **categoria** (Presente, Alimentacao, Transporte, Aleatorios, Outros), **forma de pagamento** (PIX, Cartao de Credito, Papel Moeda), e calculo automatico de **taxas de 10% + 6% IOF** para pagamentos com cartao de credito. O cambio ja pode ser editado apos criacao do tema (botao "Cambio" ja existe).

## Alteracoes no Banco de Dados

Migration para adicionar 2 colunas na tabela `cost_items`:

```sql
ALTER TABLE cost_items ADD COLUMN category text NOT NULL DEFAULT 'outros';
ALTER TABLE cost_items ADD COLUMN payment_method text NOT NULL DEFAULT 'papel_moeda';
```

Sem novas tabelas. Sem alteracao de RLS.

## Alteracoes no Codigo

### 1. `src/hooks/useCostCalculator.ts`
- Adicionar `category` e `payment_method` ao tipo `CostItem`
- No `createItem`, incluir os novos campos
- No `calculateTotals`, separar subtotais por categoria e calcular taxas de cartao (10% taxa + 6% IOF = 16.6% composto: `amount * 1.10 * 1.06`)
- No `generateReportText`, incluir categorias, formas de pagamento e taxas

### 2. `src/components/costs/CostItemForm.tsx`
- Adicionar select de **Categoria**: Presente, Alimentacao, Transporte, Aleatorios, Outros
- Adicionar select de **Forma de Pagamento**: PIX, Cartao de Credito, Papel Moeda
- Enviar os novos campos no `onAdd`

### 3. `src/components/costs/CostThemeDetail.tsx`
- Exibir categoria e forma de pagamento em cada item listado
- Mostrar badge de "CC +16%" nos itens com cartao de credito

### 4. `src/components/costs/CostSummary.tsx`
- Adicionar secao "Por Categoria" com subtotais
- Adicionar secao "Taxas de Cartao de Credito" mostrando: valor original, taxa 10%, IOF 6%, total com taxas
- Os totais convertidos ja incluem as taxas para itens de cartao

### 5. `src/components/costs/CostReportExport.tsx`
- Incluir categoria e forma de pagamento na listagem do PDF
- Incluir secao de taxas de cartao no PDF e no texto de compartilhamento

## Logica de Taxas (Cartao de Credito)

Para itens com `payment_method === 'credit_card'`:
- Taxa: `amount * 0.10`
- IOF: `(amount + taxa) * 0.06`
- **Total real**: `amount * 1.10 * 1.06`

Esses valores extras sao somados nos totais gerais.

## Analise de Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Migration (2 colunas) | 1 | 1 |
| Form com novos campos | 1 | 2 |
| Calculo de taxas CC | 2 | 3 |
| Exibicao no resumo | 1 | 3 |
| PDF/Share atualizado | 1 | 2 |
| **Total** | **6** | **11** |

## Nota sobre Cambio
O botao "Cambio" ja existe na tela de detalhe do tema e permite editar as taxas a qualquer momento. Nenhuma alteracao necessaria para esse requisito.

## Checklist de Testes Manuais
- [ ] Criar item com categoria "Alimentacao" e forma "PIX" — verificar que aparece corretamente
- [ ] Criar item com forma "Cartao de Credito" — verificar que taxa 10% + IOF 6% aparece no resumo
- [ ] Verificar que totais convertidos incluem as taxas do cartao
- [ ] Exportar PDF — verificar que categoria, forma de pagamento e taxas aparecem
- [ ] Compartilhar via WhatsApp — verificar texto formatado com taxas
- [ ] Editar cambio apos criacao — verificar recalculo dos totais

