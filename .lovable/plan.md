

# Plano: Calculador de Custos de Viagem

## Resumo

Nova página `/cost-calculator` com sistema completo de temas de custo (ex: "Viagem Argentina"), cada tema contendo itens com valor, moeda, data e descrição. O sistema converte automaticamente entre moedas usando câmbio editável, e permite exportar/compartilhar relatórios.

## Alterações no Banco de Dados

### Tabela `cost_themes`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | Dono do tema |
| name | text | Nome do tema (ex: "Viagem Argentina") |
| currencies | jsonb | Moedas configuradas: `[{"code":"ARS","name":"Peso Argentino"},{"code":"USD","name":"Dólar"},{"code":"BRL","name":"Real"}]` |
| exchange_rates | jsonb | Câmbios: `{"ARS_BRL": 0.005, "USD_BRL": 5.10, "ARS_USD": 0.001}` |
| base_currency | text | Moeda base para exibição (ex: "BRL") |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Tabela `cost_items`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| theme_id | uuid FK → cost_themes | |
| user_id | uuid | |
| description | text | Descrição do produto |
| amount | numeric | Valor na moeda original |
| currency | text | Código da moeda (ex: "ARS") |
| cost_date | date | Data do custo |
| created_at | timestamptz | |

RLS: ambas as tabelas com políticas padrão `auth.uid() = user_id`.

## Alterações no Código

### 1. Menu na Sidebar
**Arquivo**: `src/hooks/ui/useMenuItems.ts`
- Adicionar `{ icon: Calculator, label: "Custos", path: "/cost-calculator" }` no `SECONDARY_MENU_ITEMS`

### 2. Rota no App
**Arquivo**: `src/App.tsx`
- Lazy-load `CostCalculator` e adicionar rota protegida `/cost-calculator`

### 3. Página Principal
**Arquivo**: `src/pages/CostCalculator.tsx`
- Lista de temas com cards
- Botão criar novo tema
- Ao clicar num tema, abre a visualização detalhada

### 4. Componentes
**Diretório**: `src/components/costs/`

- **`CostThemeCard.tsx`** — Card de cada tema com resumo (total em moeda base, qtd itens)
- **`CostThemeModal.tsx`** — Modal para criar/editar tema (nome, moedas, câmbio)
- **`CostThemeDetail.tsx`** — Visão detalhada do tema: lista de itens, formulário de adicionar, resumo por moeda
- **`CostItemForm.tsx`** — Formulário inline para adicionar item (descrição, valor, moeda, data)
- **`CostSummary.tsx`** — Tabela de totais por moeda com conversões automáticas
- **`ExchangeRateEditor.tsx`** — Editor de câmbio dentro do tema
- **`CostReportExport.tsx`** — Botões de compartilhar (WhatsApp, redes sociais) e exportar PDF

### 5. Hook de Dados
**Arquivo**: `src/hooks/useCostCalculator.ts`
- CRUD de temas e itens via Supabase
- Cálculo de conversões em tempo real
- Função de gerar texto do relatório para compartilhamento

### 6. Exportação PDF
Reutilizar `jspdf` (já instalado) para gerar relatório com:
- Nome do tema
- Lista de itens com valores originais e convertidos
- Totais por moeda
- Câmbios utilizados

### 7. Compartilhamento
- WhatsApp: `https://wa.me/?text=<relatório formatado>`
- Redes sociais: Web Share API (já existe `useWebShare` hook)

## Fluxo do Usuário

```text
Sidebar "Custos" → Lista de Temas
    → [+] Novo Tema → Modal (nome, moedas, câmbio)
    → Clica no Tema → Detalhe
        → Adicionar Item (descrição, valor, moeda, data)
        → Ver Resumo (totais por moeda + conversões)
        → Editar Câmbio
        → Exportar PDF / Compartilhar
```

## Análise de Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Tabelas + RLS | 1 | 2 |
| Menu sidebar + rota | 1 | 1 |
| Página + componentes | 2 | 6 |
| Cálculo de conversões | 1 | 3 |
| Export PDF + share | 1 | 3 |
| **Total** | **6** | **15 — Abaixo do limite** |

## Checklist de Testes Manuais
- [ ] Criar tema com 3 moedas (ARS, USD, BRL) e definir câmbio
- [ ] Adicionar 3+ itens em moedas diferentes → verificar totais convertidos
- [ ] Editar câmbio → totais recalculam automaticamente
- [ ] Exportar PDF → verificar formatação e valores
- [ ] Compartilhar via WhatsApp → verificar texto formatado
- [ ] Menu "Custos" aparece na sidebar desktop e mobile
- [ ] Excluir item e tema → verificar que dados são removidos

