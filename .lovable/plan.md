

# Plano: Corrigir navegação por projeto a partir de outras páginas

## Diagnóstico

**Causa raiz**: Quando você clica em um projeto na sidebar estando em `/notes`, `/config`, etc., o código faz:
1. `onCategorySelect?.(categoryId)` — mas esse callback é `undefined` em todas as páginas exceto `/` (Index)
2. `navigate("/")` — navega para Index, que monta com `selectedCategory = ""` (estado vazio)

Resultado: a seleção de projeto se perde durante a navegação.

## Solução

Usar **query parameter na URL** (`/?project=<categoryId>`) para transportar a seleção entre páginas. O Index lê esse parâmetro ao montar e aplica o filtro.

## Alterações

### 1. `src/components/Sidebar.tsx` — Navegar com query param
Na função `handleCategorySelect`, trocar `navigate("/")` por `navigate("/?project=" + categoryId)`. O mesmo no mobile (Sheet de projetos).

### 2. `src/hooks/useCategoryFilters.ts` — Ler query param ao inicializar
Ao montar, verificar se existe `?project=<id>` na URL. Se existir, usar como `selectedCategory` inicial e limpar o param da URL (para não ficar "preso").

### 3. `src/components/Sidebar.tsx` (mobile) — Mesmo ajuste no Sheet de projetos
O botão de cada categoria no Sheet mobile também usa `handleNavigation("/")` sem passar o ID. Ajustar para incluir o query param.

## Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Navegar com query param | 1 | 1 |
| Ler param no hook | 1 | 2 |
| **Total** | **2** | **3** |

- **Sem mudança em banco de dados**
- **Sem mudança de regra de negócio**
- Apenas ajuste de navegação client-side

## Checklist de Testes Manuais
- [ ] Estar em `/notes` → clicar projeto na sidebar → deve ir direto para `/` com projeto filtrado
- [ ] Estar em `/config` → clicar projeto na sidebar → mesmo resultado
- [ ] Estar em `/` → clicar projeto na sidebar → funcionar como antes
- [ ] Mobile: usar Sheet de projetos em qualquer página → deve filtrar corretamente
- [ ] Pressionar Esc em `/` → deve limpar filtro normalmente

