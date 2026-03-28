# Pendências e Changelog - TaskFlow

## 📚 Documentação Relacionada

- [README.md](../README.md) - Setup e visão geral
- [PRD.md](./PRD.md) - Requisitos do produto
- [ROADMAP.md](./ROADMAP.md) - Planejamento futuro
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Estrutura técnica

---

## 📋 Features Implementadas Recentemente

### Versão 1.3 (Março 2026)

#### Correção Crítica ✅
- ✅ **Bug editor de notas**: Corrigido race condition onde `fetchNotes()` retornava `content: null` e sobrescrevia o editor, apagando texto do usuário
- ✅ Merge inteligente de content no state para preservar cache local

#### Auditoria de Qualidade - Fases A-D ✅
- ✅ **Fase A**: ErrorBoundary global, limpeza de timers, loading states com `finally`
- ✅ **Fase B**: Responsividade mobile em todas as páginas novas
- ✅ **Fase C**: Acessibilidade (ARIA labels, keyboard nav, focus management)
- ✅ **Fase D**: Logger padronizado (`@/lib/logger`), tipos centralizados em `types/index.ts`, ESLint `no-console`

#### Documentação ✅
- ✅ Reorganização completa: todos os .md em `docs/`
- ✅ Novos documentos: SYSTEM_DESIGN.md, EDGE_FUNCTIONS.md, COMPONENTES.md
- ✅ Links cruzados atualizados entre documentos

### Versão 1.2 (Janeiro - Fevereiro 2026)

#### Novos Módulos ✅
- ✅ Matriz de Eisenhower com drag & drop
- ✅ Calculadora de Custos multi-moeda com taxas de câmbio
- ✅ Gestão de Cursos com módulos, checklist e meta semanal
- ✅ Hábitos diários/semanais com check-in e streaks
- ✅ Ferramentas e API Keys com criptografia
- ✅ Integração WhatsApp via Evolution API
- ✅ Retrospectiva semanal guiada
- ✅ Metas com auto-incremento por tarefas
- ✅ Quick Links (favoritos)
- ✅ Paletas de cores customizáveis
- ✅ Sugestão IA de subtarefas
- ✅ Backlinks e navegação Wiki nas notas
- ✅ Compartilhamento público de notas
- ✅ Dashboard com widgets, heatmap, relatórios
- ✅ Daily Review modal
- ✅ Vinculação nota-tarefa bidirecional com blocos de tarefa
- ✅ Guard de navegação para unsaved changes

### Versão 1.1 (Janeiro 2025)

- ✅ Testes unitários e E2E (Vitest + Playwright)
- ✅ CI/CD com GitHub Actions
- ✅ Sheet de projetos no mobile

### Versão 1.0 (Dezembro 2024)

- ✅ Kanban Board completo com drag & drop
- ✅ Calendário fullscreen com cores
- ✅ Notas com TipTap
- ✅ Pomodoro com templates
- ✅ Dashboard com gamificação
- ✅ PWA + Push + Offline
- ✅ Autenticação completa

---

## 🔄 Pendências de Desenvolvimento

### Alta Prioridade

| Feature | Status |
|---------|--------|
| Anexos em Tarefas (upload de imagens/arquivos) | 🔄 Pendente |
| Busca Global v2 (busca em notas + highlight) | 🔄 Pendente |

### Média Prioridade

| Feature | Status |
|---------|--------|
| Google Calendar Sync | 🔄 Pendente |
| Tour guiado / Onboarding | 🔄 Pendente |
| Ícones personalizados para cadernos | 🔄 Pendente |
| Drag & drop para reordenar cadernos | 🔄 Pendente |

### Baixa Prioridade

| Feature | Status |
|---------|--------|
| Animações de transição mais suaves | 🔄 Pendente |
| Workspaces (colaboração) | 🔄 Futuro |
| API Pública REST | 🔄 Futuro |

---

## 🔒 Segurança - Pendências Futuras

| Item | Prioridade | Estimativa |
|------|------------|------------|
| Leaked Password Protection | Alta | 30 min |
| 2FA (TOTP) | Média | 2-3h |

---

## 📝 Changelog

### [2026-03-28]
- 🐛 Corrigido: Bug crítico que apagava texto no editor de notas (race condition fetchNotes/Realtime)
- 🔧 Melhorado: Merge inteligente de content no useNotes para preservar cache
- 🔧 Melhorado: syncWithNote ignora content null (fetch de lista)
- 📚 Reorganizado: Toda documentação movida para `docs/`
- 📚 Criado: SYSTEM_DESIGN.md, EDGE_FUNCTIONS.md, COMPONENTES.md
- 📚 Atualizado: README.md, PRD.md, ROADMAP.md, PENDENCIAS.md, ARCHITECTURE.md

### [2026-03-27]
- 🔧 Fase D: Logger padronizado em 8 arquivos, tipos centralizados, ESLint no-console

### [2026-03-26]
- ♿ Fase C: Acessibilidade (ARIA, keyboard nav, focus traps)

### [2026-03-25]
- 📱 Fase B: Responsividade mobile completa

### [2026-03-24]
- 🛡️ Fase A: ErrorBoundary, loading states, memory leaks

### [2026-01-08]
- ✨ Grid view notas, preview hover, contador palavras
- ✨ Auto-preenchimento categoria no TaskModal

### [2025-01-08]
- ✨ Testes unitários e E2E, CI/CD
- ✨ Sheet de projetos no mobile

### [2024-12-08]
- 🚀 Lançamento inicial v1.0

---

## 📊 Métricas de Código

| Métrica | Quantidade |
|---------|------------|
| Componentes React | ~120 |
| Hooks customizados | 55+ |
| Páginas | 20 |
| Edge Functions | 18 |
| Tabelas no banco | 30+ |
| Contextos React | 5 |
| Testes unitários | 15 arquivos |
| Specs E2E | 5 |

---

*Última atualização: 28 de Março de 2026*
