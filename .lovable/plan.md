
# Plano de Implementação — Roadmap Completo

## ✅ Etapa 1 — CONCLUÍDA

| Feature | Status |
|---------|--------|
| 1A. Visão Diária no Calendário | ✅ Implementada |
| 1B. Templates de Notas | ✅ Implementada |
| 1C. Painel de Links Rápidos | ✅ Implementada |
| 1D. Alternativas de Ferramentas (IA) | ✅ Implementada |
| 1E. Digest Diário no Dashboard | ✅ Implementada |

## ✅ Etapa 2 — CONCLUÍDA

| Feature | Status |
|---------|--------|
| 2A. Visão de Lista/Tabela para Tarefas | ✅ Implementada |
| 2B. Hábitos Tracker | ✅ Implementada |
| 2C. Retrospectiva Semanal | ✅ Implementada |

## ✅ Etapa 3 — Débito Técnico e Performance

| Feature | Status |
|---------|--------|
| 3A. Loading states consistentes | ✅ Implementada |
| 3B. Dashboard RPC (substituir SELECT *) | ✅ Implementada |
| 3C. useQuickLinks type safety | ✅ Implementada |
| 3D. QueryClient cache (staleTime/gcTime) | ✅ Implementada |
| 3E. Calendário filtro por período | ✅ Implementada |

## ✅ Etapa 4 — UX Mobile e Interações

| Feature | Status |
|---------|--------|
| 4A. Bottom tab bar mobile | ❌ REMOVIDA — UX ruim, nunca reimplementar |
| 4B. Swipe entre páginas | ✅ Implementada |
| 4C. Haptic feedback | ✅ Implementada |
| 4D. Drag-and-drop + Sort em Links | ✅ Implementada |

## ✅ Etapa 5 — Kanban e Tarefas Avançadas

| Feature | Status |
|---------|--------|
| 5A. Cycle time (column_entered_at) | ✅ Implementada (DB migration) |
| 5B. Eventos recorrentes visuais (🔄) | ✅ Implementada (calendário + TaskCard) |
| 5C. Matriz Eisenhower (/eisenhower) | ✅ Implementada |

## ✅ Etapa 6 — Links e Notas Avançadas

| Feature | Status |
|---------|--------|
| 6A. Favicon automático (Google S2 API) | ✅ Implementada |
| 6B. Pastas de links (collapsible folders) | ✅ Implementada |
| 6C. Contador de cliques (optimistic update) | ✅ Implementada |
| 6D. Swap favicon/emoji (favicon grande, emoji badge) | ✅ Implementada |
| 6E. Toggle cards/lista nos Links Rápidos | ✅ Implementada |
| 6F. Export nota como PDF/Markdown | ✅ Implementada |
| 6G. Ordenação por nome/data/cliques | ✅ Implementada |

## ✅ Etapa 7 — Dashboard e Analytics

| Feature | Status |
|---------|--------|
| 7A. Heatmap de produtividade (12 semanas) | ✅ Implementada |
| 7B. Gráficos pizza/barras por categoria | ✅ Implementada |
| 7C. Widgets heatmap e charts no Dashboard | ✅ Implementada |

## 🔲 Etapa 8 — Features Estruturais

| Feature | Status |
|---------|--------|
| 8A. Modo offline para notas (IndexedDB sync) | 🔲 Pendente |
| 8B. Base de Conhecimento / Wiki (navegação Gitbook) | 🔲 Pendente |

---

## ⛔ Anti-patterns — NUNCA IMPLEMENTAR

| Item | Motivo |
|------|--------|
| **Bottom Tab Bar mobile** | UX ruim, conflita com gestos nativos do navegador, ocupa espaço vertical precioso. Sidebar lateral + Topbar são suficientes. |
| **Tab bar fixa no rodapé** | Mesma razão acima. A navegação já é feita via Sidebar (desktop) e Topbar/hamburger (mobile). |
