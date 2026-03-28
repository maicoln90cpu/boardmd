# PRD - Product Requirements Document

## TaskFlow - Sistema de Gestão de Tarefas e Produtividade

**Versão**: 1.3  
**Data**: Março 2026  
**Status**: Em Produção

---

## 📚 Documentação Relacionada

- [README.md](../README.md) - Setup e visão geral
- [ROADMAP.md](./ROADMAP.md) - Planejamento futuro
- [PENDENCIAS.md](./PENDENCIAS.md) - Changelog e pendências
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Estrutura técnica
- [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - Fluxos de dados e APIs
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) - Edge Functions
- [COMPONENTES.md](./COMPONENTES.md) - Referência de componentes

---

## 1. Visão do Produto

### 1.1 Problema

Profissionais e estudantes enfrentam dificuldades em organizar tarefas, manter foco, acompanhar progresso e ter uma visão consolidada de responsabilidades. Soluções existentes são fragmentadas.

### 1.2 Solução

TaskFlow é uma plataforma unificada que combina:
- **Kanban Board** para gestão visual de tarefas
- **Matriz de Eisenhower** para priorização
- **Sistema de Notas** com editor rico TipTap
- **Timer Pomodoro** para foco
- **Dashboard** com insights de produtividade e gamificação
- **Calendário** com drag & drop
- **Hábitos** para rotinas diárias
- **Cursos** para gestão de aprendizado
- **Custos** para controle financeiro de viagens/projetos
- **Ferramentas** para inventário de ferramentas e APIs
- **Retrospectivas** semanais
- **WhatsApp** para notificações

### 1.3 Proposta de Valor

> "Organize, foque e conquiste - tudo em um só lugar."

---

## 2. Requisitos Funcionais

### 2.1 Autenticação (RF-001) ✅

- Login/cadastro com email/senha
- Recuperação e reset de senha
- Perfil do usuário com foto e telefone

### 2.2 Kanban Board (RF-002) ✅

- Drag & drop com @dnd-kit
- Múltiplas categorias/projetos com subcategorias
- Colunas customizáveis com cores
- Kanban Diário e de Projetos separados
- Filtros avançados com presets salvos
- Ações em lote (bulk actions)
- Tarefas recorrentes com regras flexíveis
- Subtarefas com checklist e sugestão IA
- Favoritos, espelhamento, tags
- Visualização em tabela e Gantt
- Mobile: swipe para ações, grid/lista
- Histórico de alterações por tarefa

### 2.3 Calendário (RF-003) ✅

- Visualização mensal fullscreen
- Drag & drop de tarefas entre dias
- Cores por coluna/status, indicadores visuais

### 2.4 Notas (RF-004) ✅

- Editor TipTap com formatação rica (tabelas, código, imagens, links)
- Cadernos com tags coloridas
- Vinculação bidirecional com tarefas (blocos de tarefa)
- Backlinks e navegação wiki
- Compartilhamento público via link
- Formatação e melhoria com IA
- Salvamento manual (Ctrl+Enter) com guard de navegação
- Cores personalizadas, fixar, lixeira

### 2.5 Pomodoro (RF-005) ✅

- Timer configurável com templates
- Pausas curtas/longas
- Vinculação com tarefas, histórico, estatísticas

### 2.6 Dashboard (RF-006) ✅

- Estatísticas de produtividade e gráficos
- Insights com IA, gamificação (pontos, níveis, streaks)
- Heatmap de produtividade, progresso semanal
- Monitor de push e saúde do sistema
- Widgets customizáveis, exportação de relatórios

### 2.7 Matriz de Eisenhower (RF-007) ✅

- Classificação urgente/importante
- Drag & drop entre quadrantes

### 2.8 Hábitos (RF-008) ✅

- Hábitos diários/semanais com ícones e cores
- Check-in diário, streaks, arquivamento

### 2.9 Cursos (RF-009) ✅

- Gestão de cursos com módulos e checklist
- Categorias, filtros, progresso
- Meta semanal de estudo
- Upload de módulos via IA

### 2.10 Custos (RF-010) ✅

- Temas de custo (viagens, projetos)
- Multi-moeda com taxas de câmbio
- Filtros, relatórios, exportação

### 2.11 Ferramentas (RF-011) ✅

- Inventário de ferramentas com ícones
- Gerenciamento de API Keys (criptografadas)
- Funções/categorias, custo mensal
- Sugestões e alternativas com IA

### 2.12 WhatsApp (RF-012) ✅

- Integração com Evolution API
- Templates de notificação
- Resumo diário e alertas de vencimento

### 2.13 Retrospectiva (RF-013) ✅

- Revisão semanal guiada (o que fez, aprendeu, melhorar)
- Humor semanal

### 2.14 Metas (RF-014) ✅

- Metas com período, progresso
- Auto-incremento por tarefas concluídas
- Integração com tarefas

### 2.15 Sistema (RF-015) ✅

- PWA instalável com modo offline
- Notificações push (OneSignal + Service Worker)
- Tema dark/light com paletas de cores customizáveis
- Atalhos de teclado (Ctrl+K, Ctrl+N, Ctrl+Enter, etc.)
- Busca global, importação/exportação JSON
- Exportação visual PNG/PDF
- Indicador de status online
- Quick Links (favoritos)

### 2.16 Testes (RF-016) ✅

- Testes unitários (hooks e componentes) com Vitest
- Testes E2E com Playwright
- CI/CD com GitHub Actions

---

## 3. Requisitos Não-Funcionais

| ID | Requisito | Meta/Status |
|----|-----------|-------------|
| RNF-001 | Carregamento inicial | < 3s |
| RNF-002 | Tempo de resposta | < 100ms |
| RNF-003 | RLS em todas as tabelas | ✅ |
| RNF-004 | Responsivo mobile/desktop | ✅ |
| RNF-005 | Acessibilidade WCAG 2.1 AA | Parcial (melhorado Fase C) |
| RNF-006 | Modo offline funcional | ✅ |
| RNF-007 | Testes automatizados | ✅ |

---

## 4. Backlog de Funcionalidades

### 4.1 Próximas Sprints

| Feature | Prioridade |
|---------|------------|
| Anexos em Tarefas (upload de imagens/arquivos) | Alta |
| Busca Global v2 (busca em notas + histórico) | Alta |
| Tour guiado para novos usuários | Média |
| Google Calendar Sync | Média |

### 4.2 Backlog Futuro

| Feature | Prioridade |
|---------|------------|
| Workspaces (colaboração em equipe) | Alta |
| Webhooks / Automações externas | Alta |
| App Mobile Nativo (iOS/Android) | Média |
| Desktop App (Electron) | Baixa |

---

## 5. Métricas de Sucesso

| Métrica | Meta Q2 2026 |
|---------|--------------|
| Usuários ativos mensais | 1000 |
| Error Rate | < 0.1% |
| Uptime | > 99.5% |
| Cobertura de testes | > 70% |

---

*Última atualização: 28 de Março de 2026*
