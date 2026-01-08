# TaskFlow - Sistema de Gestão de Tarefas e Produtividade

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://lovable.dev)
[![Tests](https://img.shields.io/badge/tests-vitest%20%2B%20playwright-blue)](./src/__tests__)
[![Coverage](https://img.shields.io/badge/coverage-expanding-yellow)](./src/__tests__)
[![Version](https://img.shields.io/badge/version-1.1.0-blue)](./ROADMAP.md)

> **Última atualização**: Janeiro 2025

## Visão Geral

TaskFlow é uma aplicação web completa de gestão de tarefas e produtividade, construída com tecnologias modernas. O sistema oferece múltiplas visualizações (Kanban, Calendário), notas, timer Pomodoro, e recursos avançados de organização.

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [PRD.md](./PRD.md) | Requisitos do produto e backlog |
| [ROADMAP.md](./ROADMAP.md) | Planejamento 2025-2026 |
| [PENDENCIAS.md](./PENDENCIAS.md) | Changelog e pendências |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Estrutura técnica do projeto |

## Stack Tecnológica

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework de estilos utilitários
- **shadcn/ui** - Componentes UI acessíveis
- **Framer Motion** - Animações
- **React Router DOM v7** - Roteamento
- **TanStack Query** - Gerenciamento de estado servidor
- **Recharts** - Gráficos e visualizações

### Backend (Lovable Cloud)
- **Supabase** - Backend as a Service
  - PostgreSQL - Banco de dados
  - Row Level Security (RLS) - Segurança
  - Edge Functions - Lógica serverless
  - Realtime - Atualizações em tempo real
  - Auth - Autenticação

### Bibliotecas Principais
- **@dnd-kit** - Drag and drop
- **@tiptap** - Editor de texto rico
- **date-fns** - Manipulação de datas
- **html2canvas** - Exportação visual
- **jspdf** - Geração de PDFs
- **zod** - Validação de schemas
- **lucide-react** - Ícones
- **vitest** - Testes unitários
- **@playwright/test** - Testes E2E

## Arquitetura do Projeto

```
src/
├── __tests__/           # Testes automatizados
│   ├── components/      # Testes de componentes
│   ├── hooks/           # Testes de hooks
│   ├── lib/             # Testes de utilitários
│   └── contexts/        # Testes de contextos
├── components/           # Componentes React
│   ├── ui/              # Componentes base (shadcn)
│   ├── kanban/          # Componentes do Kanban
│   ├── notes/           # Componentes de Notas
│   ├── dashboard/       # Componentes do Dashboard
│   └── templates/       # Sistema de templates
├── contexts/            # Contextos React
├── hooks/               # Custom hooks (+30 hooks)
├── pages/               # Páginas da aplicação
├── lib/                 # Utilitários
└── integrations/        # Integrações externas

e2e/                     # Testes E2E com Playwright
├── auth.spec.ts
├── tasks.spec.ts
├── kanban.spec.ts
├── notes.spec.ts
└── pomodoro.spec.ts

supabase/
├── functions/           # Edge Functions
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

### Estrutura de Testes

```
src/__tests__/
├── components/
│   ├── Auth.test.tsx
│   ├── TaskCard.test.tsx
│   ├── TaskModal.test.tsx
│   └── KanbanBoard.test.tsx
├── hooks/
│   ├── useTasks.test.ts
│   ├── useCategories.test.ts
│   ├── useColumns.test.ts
│   ├── useSettings.test.ts
│   ├── useNotes.test.ts
│   ├── usePomodoro.test.ts
│   └── useRateLimiter.test.ts
├── lib/
│   ├── dateUtils.test.ts
│   ├── taskFilters.test.ts
│   └── validations.test.ts
└── contexts/
    └── AuthContext.test.tsx

e2e/
├── auth.spec.ts        # Login, registro, recuperação de senha
├── tasks.spec.ts       # CRUD de tarefas
├── kanban.spec.ts      # Drag and drop, filtros
├── notes.spec.ts       # Notas e cadernos
└── pomodoro.spec.ts    # Timer e sessões
```

### Cobertura de Testes

| Área | Cobertura |
|------|-----------|
| Hooks de dados | ✅ useTasks, useCategories, useColumns, useSettings, useNotes, usePomodoro |
| Hooks utilitários | ✅ useRateLimiter |
| Componentes | ✅ Auth, TaskCard, TaskModal, KanbanBoard |
| Utilitários | ✅ dateUtils, taskFilters, validations |
| Contextos | ✅ AuthContext |
| E2E | ✅ Auth, Tasks, Kanban, Notes, Pomodoro |

## Deploy

O deploy é feito automaticamente através do Lovable:
1. Acesse o projeto no Lovable
2. Vá em **Share → Publish**

### Domínio Customizado
1. Navegue até **Project → Settings → Domains**
2. Clique em **Connect Domain**
3. Siga as instruções de configuração DNS

## Banco de Dados

### Tabelas Principais
- `tasks` - Tarefas do Kanban
- `columns` - Colunas do Kanban
- `categories` - Categorias/Projetos
- `notes` - Notas e documentos
- `notebooks` - Cadernos de notas
- `pomodoro_sessions` - Sessões Pomodoro
- `user_stats` - Estatísticas do usuário
- `profiles` - Perfis de usuário
- `tags` - Tags para organização
- `activity_log` - Log de atividades
- `push_subscriptions` - Notificações push
- `push_logs` - Logs de notificações

### Segurança
Todas as tabelas possuem Row Level Security (RLS) habilitado, garantindo que usuários só acessem seus próprios dados.

## Features Principais

- ✅ Kanban Board com drag & drop
- ✅ Calendário com visualização mensal
- ✅ Sistema de notas com editor rico
- ✅ Timer Pomodoro com templates
- ✅ Dashboard de produtividade
- ✅ Notificações push (PWA)
- ✅ Modo offline
- ✅ Tema dark/light
- ✅ Tarefas recorrentes
- ✅ Subtarefas
- ✅ Tags e prioridades
- ✅ Exportação PNG/PDF
- ✅ Favoritos
- ✅ Gamificação (pontos, níveis, streaks)
- ✅ Filtros de projetos mobile (Sheet)
- ✅ Testes automatizados (unitários + E2E)

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
