# TaskFlow - Sistema de Gestão de Tarefas e Produtividade

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://lovable.dev)
[![Tests](https://img.shields.io/badge/tests-vitest%20%2B%20playwright-blue)](./src/__tests__)
[![Coverage](https://img.shields.io/badge/coverage-expanding-yellow)](./src/__tests__)
[![Version](https://img.shields.io/badge/version-1.2.0-blue)](./ROADMAP.md)

> **Última atualização**: 08 de Janeiro de 2026

## Visão Geral

TaskFlow é uma aplicação web completa de gestão de tarefas e produtividade, construída com tecnologias modernas. O sistema oferece múltiplas visualizações (Kanban, Calendário), notas com editor rico, timer Pomodoro, e recursos avançados de organização com gamificação.

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [PRD.md](./PRD.md) | Requisitos do produto e backlog |
| [ROADMAP.md](./ROADMAP.md) | Planejamento 2025-2026 |
| [PENDENCIAS.md](./PENDENCIAS.md) | Changelog e pendências |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Estrutura técnica do projeto |

## Stack Tecnológica

### Frontend
- **React 18.3** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework de estilos utilitários
- **shadcn/ui** - Componentes UI acessíveis
- **Framer Motion** - Animações fluidas
- **React Router DOM v7** - Roteamento
- **TanStack Query v5** - Gerenciamento de estado servidor
- **Recharts** - Gráficos e visualizações

### Backend (Lovable Cloud)
- **Supabase** - Backend as a Service
  - PostgreSQL - Banco de dados
  - Row Level Security (RLS) - Segurança
  - Edge Functions - Lógica serverless (9 funções)
  - Realtime - Atualizações em tempo real
  - Auth - Autenticação

### Bibliotecas Principais
| Categoria | Bibliotecas |
|-----------|-------------|
| Drag & Drop | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Editor Rico | `@tiptap/react`, `@tiptap/starter-kit`, extensões |
| Datas | `date-fns` |
| Exportação | `html2canvas`, `jspdf` |
| Validação | `zod`, `react-hook-form` |
| Ícones | `lucide-react` |
| Testes | `vitest`, `@playwright/test`, `@testing-library/react` |
| PWA | `vite-plugin-pwa` |

## Arquitetura do Projeto

```
src/
├── __tests__/           # Testes automatizados (15 arquivos)
│   ├── components/      # Testes de componentes (4)
│   ├── hooks/           # Testes de hooks (7)
│   ├── lib/             # Testes de utilitários (3)
│   └── contexts/        # Testes de contextos (1)
├── components/          # Componentes React (~90 componentes)
│   ├── ui/              # Componentes base shadcn (50+)
│   ├── kanban/          # Componentes do Kanban (15)
│   ├── notes/           # Componentes de Notas (12)
│   ├── dashboard/       # Componentes do Dashboard (7)
│   ├── task-card/       # Subcomponentes do TaskCard (8)
│   ├── calendar/        # Componentes do Calendário
│   ├── notifications/   # Componentes de Notificações
│   ├── sidebar/         # Componentes da Sidebar
│   └── templates/       # Sistema de templates
├── contexts/            # Contextos React (4)
├── hooks/               # Custom hooks (35 hooks)
│   ├── data/            # Hooks de dados (useCategories, useColumns, useSettings, useTags)
│   ├── tasks/           # Hooks de tarefas (useTasks, useTaskFiltering, etc.)
│   └── ui/              # Hooks de UI (useBreakpoint, useMobile, useToast)
├── pages/               # Páginas da aplicação (11)
├── lib/                 # Utilitários
│   ├── sync/            # Sincronização offline
│   ├── push/            # Notificações push
│   ├── export/          # Exportação visual
│   └── pwa/             # PWA utilities
└── integrations/        # Integrações externas

e2e/                     # Testes E2E com Playwright (5 specs)
├── auth.spec.ts
├── tasks.spec.ts
├── kanban.spec.ts
├── notes.spec.ts
└── pomodoro.spec.ts

supabase/
├── functions/           # Edge Functions (9 funções)
│   ├── cleanup-old-logs/
│   ├── daily-assistant/
│   ├── delete-account/
│   ├── format-note/
│   ├── health-check/
│   ├── productivity-insights/
│   ├── reset-daily-stats/
│   ├── reset-recurring-tasks/
│   └── send-onesignal/
└── migrations/          # Migrações do banco
```

## Setup do Ambiente de Desenvolvimento

### Pré-requisitos
- Node.js 18+ 
- npm ou bun

### Instalação

```bash
# 1. Clonar o repositório
git clone <YOUR_GIT_URL>

# 2. Navegar para o diretório
cd <YOUR_PROJECT_NAME>

# 3. Instalar dependências
npm install

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente
O projeto usa Lovable Cloud, que configura automaticamente:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run lint         # Linting do código

# Testes
npm run test         # Rodar testes unitários (watch mode)
npm run test:run     # Rodar testes unitários (single run)
npm run test:coverage # Rodar testes com cobertura
npm run test:e2e     # Rodar testes E2E com Playwright
npm run test:e2e:ui  # Rodar testes E2E com UI interativa
```

## 🧪 Testes Automatizados

### Cobertura de Testes

| Área | Arquivos | Status |
|------|----------|--------|
| Hooks de dados | useTasks, useCategories, useColumns, useSettings, useNotes, usePomodoro | ✅ |
| Hooks utilitários | useRateLimiter | ✅ |
| Componentes | Auth, TaskCard, TaskModal, KanbanBoard | ✅ |
| Utilitários | dateUtils, taskFilters, validations | ✅ |
| Contextos | AuthContext | ✅ |
| E2E | Auth, Tasks, Kanban, Notes, Pomodoro | ✅ |

### CI/CD
O workflow `.github/workflows/test.yml` executa testes automaticamente em push/PR para branches `main` e `develop`.

## Deploy

O deploy é feito automaticamente através do Lovable:
1. Acesse o projeto no Lovable
2. Vá em **Share → Publish**

### Domínio Customizado
1. Navegue até **Project → Settings → Domains**
2. Clique em **Connect Domain**
3. Siga as instruções de configuração DNS

## Banco de Dados

### Tabelas Principais (16 tabelas)
| Tabela | Descrição |
|--------|-----------|
| `tasks` | Tarefas do Kanban |
| `columns` | Colunas do Kanban |
| `categories` | Categorias/Projetos |
| `notes` | Notas e documentos |
| `notebooks` | Cadernos de notas |
| `tags` | Tags para organização |
| `pomodoro_sessions` | Sessões Pomodoro |
| `pomodoro_templates` | Templates de Pomodoro |
| `user_stats` | Estatísticas e gamificação |
| `user_settings` | Configurações do usuário |
| `profiles` | Perfis de usuário |
| `activity_log` | Log de atividades |
| `audit_logs` | Logs de auditoria |
| `task_history` | Histórico de alterações |
| `push_subscriptions` | Notificações push |
| `push_logs` | Logs de notificações |
| `trash` | Lixeira (soft delete) |
| `project_templates` | Templates de projetos |

### Segurança
Todas as tabelas possuem Row Level Security (RLS) habilitado, garantindo que usuários só acessem seus próprios dados.

## Features Principais

### Kanban Board
- ✅ Drag & drop com @dnd-kit
- ✅ Múltiplas categorias/projetos
- ✅ Kanban Diário separado
- ✅ Colunas customizáveis com cores
- ✅ Filtros avançados e presets
- ✅ Ações em lote
- ✅ Tarefas recorrentes
- ✅ Subtarefas com checklist
- ✅ Favoritos
- ✅ Espelhamento de tarefas

### Notas
- ✅ Editor TipTap com formatação rica
- ✅ Cadernos com tags coloridas
- ✅ Visualização em lista e grid
- ✅ Preview de conteúdo em hover
- ✅ Contador de palavras/caracteres
- ✅ Vinculação com tarefas
- ✅ Cores personalizadas
- ✅ Auto-save

### Sistema
- ✅ PWA (instalável) com modo offline
- ✅ Notificações push
- ✅ Tema dark/light
- ✅ Timer Pomodoro com templates
- ✅ Dashboard de produtividade
- ✅ Gamificação (pontos, níveis, streaks)
- ✅ Calendário com drag & drop
- ✅ Exportação PNG/PDF/JSON
- ✅ Atalhos de teclado

## Contribuição

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

Consulte o [ARCHITECTURE.md](./ARCHITECTURE.md) para padrões de código.

## Licença

Este projeto é privado e pertence ao seu criador.

---

**URL do Projeto**: https://lovable.dev/projects/8a077664-399d-43d4-a22e-eb2292c24030
