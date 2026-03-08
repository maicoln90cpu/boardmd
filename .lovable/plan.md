

# Plano: Menu Hambúrguer Mobile + Ordenação nos Custos

## Parte 1: Substituir barra de navegação inferior por menu hambúrguer no topo

### Problema atual
No mobile, existe uma `<nav>` fixa no rodapé (bottom bar) com 5 botões (Projetos, Anotações, Dashboard, Pomodoro, Mais). Isso ocupa espaço e todas as páginas usam `pb-[140px] md:pb-0` para compensar.

### Alterações

**`src/components/Sidebar.tsx`**:
- Remover todo o bloco `{/* Mobile bottom navigation */}` (linhas 220-349).
- Substituir por um header fixo no topo com:
  - Ícone hambúrguer (`Menu`) à esquerda que abre um `Sheet` lateral (`side="left"`)
  - Logo pequeno no centro
  - O Sheet contém todos os itens de menu (primários + secundários + projetos + logout), reutilizando os mesmos dados de `useMenuItems`
- O Sheet lateral terá a mesma estrutura da sidebar desktop (projetos com contadores, links de navegação, botão de sair)

**Páginas que usam `pb-[140px]` ou `pb-safe`**:
- Remover padding-bottom mobile que compensava a bottom bar (ex: `pb-[140px] md:pb-0` → `pb-0`)
- Adicionar `pt-14 md:pt-0` para compensar o header fixo do topo no mobile

**Componentes afetados**:
- `src/pages/Index.tsx` (linha 121: `pb-[140px]`)
- Outras páginas que tenham padding bottom similar
- Componentes com posicionamento `sticky bottom-0` que referenciavam a bottom bar

### Estrutura do menu hambúrguer
```text
┌──────────────────────────┐
│ ☰  [Logo TaskFlow]       │  ← Header fixo mobile
└──────────────────────────┘

Sheet (side="left"):
┌──────────────────────────┐
│ [Logo]                   │
│ ─────────────────────    │
│ 📋 Projetos              │
│   > Todos (32)           │
│   > Projeto A (12)       │
│   > Projeto B (8)        │
│ ─────────────────────    │
│ 📝 Anotações             │
│ 📊 Dashboard             │
│ ⏱ Pomodoro               │
│ 📅 Calendário            │
│ 🎓 Cursos                │
│ 💰 Custos                │
│ 🔧 Ferramentas           │
│ 🔔 Notificações          │
│ ⚙️ Setup                 │
│ ─────────────────────    │
│ 🚪 Sair                  │
└──────────────────────────┘
```

---

## Parte 2: Ordenação nos itens de custos

### Alterações

**`src/components/costs/CostFiltersBar.tsx`**:
- Adicionar seção de ordenação ao painel de filtros existente
- Opções de ordenação: Data (asc/desc), Valor (asc/desc), Categoria (A-Z), Forma de Pagamento (A-Z), Descrição (A-Z)
- Exportar tipo `CostSortOption` e estado de ordenação junto com os filtros

**`src/components/costs/CostThemeDetail.tsx`**:
- Aplicar a ordenação (`sort`) sobre os `filteredItems` antes de renderizar
- Adicionar estado `sortOption` e passá-lo ao `CostFiltersBar`

### Interface de ordenação
```typescript
type CostSortField = "date" | "amount" | "category" | "payment_method" | "description";
type CostSortDir = "asc" | "desc";
interface CostSortOption { field: CostSortField; dir: CostSortDir; }
```

---

## Análise de Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Remover bottom bar, criar header + sheet | 3 | 5 |
| Ajustar padding em páginas | 2 | 2 |
| Ordenação nos custos | 1 | 2 |
| **Total** | **6** | **9** |

Limite seguro: 25. Total: 15 — abaixo do limite.

## Checklist de Testes Manuais
- [ ] Mobile: verificar que a bottom bar não existe mais
- [ ] Mobile: clicar no hambúrguer e verificar que o menu lateral abre com todos os itens
- [ ] Mobile: navegar para cada página pelo menu e verificar que funciona
- [ ] Mobile: verificar que o conteúdo não fica coberto pelo header do topo
- [ ] Desktop: verificar que nada mudou (sidebar lateral normal)
- [ ] Custos: testar ordenação por data, valor, categoria
- [ ] Custos: verificar que ordenação funciona junto com filtros

