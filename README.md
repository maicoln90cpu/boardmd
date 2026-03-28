# TaskFlow - Sistema de Gestão de Tarefas e Produtividade

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://lovable.dev)
[![Tests](https://img.shields.io/badge/tests-vitest%20%2B%20playwright-blue)](./src/__tests__)
[![Version](https://img.shields.io/badge/version-1.3.0-blue)](./docs/ROADMAP.md)

> **Última atualização**: 28 de Março de 2026

## Visão Geral

TaskFlow é uma aplicação web completa de gestão de tarefas e produtividade. O sistema oferece Kanban Board, Calendário, Matriz de Eisenhower, Notas com editor rico, Timer Pomodoro, Hábitos, Cursos, Custos, Ferramentas, Retrospectivas e recursos avançados de organização com gamificação.

**URL**: [boardmd.lovable.app](https://boardmd.lovable.app)

## Stack Tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18.3, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Animações** | Framer Motion |
| **Roteamento** | React Router DOM v7 |
| **Estado** | TanStack Query v5, Contextos React (5) |
| **Editor** | TipTap (ProseMirror) com extensões customizadas |
| **Gráficos** | Recharts |
| **Backend** | Lovable Cloud (PostgreSQL, RLS, Edge Functions, Realtime, Auth) |
| **Testes** | Vitest, Playwright, Testing Library |
| **PWA** | vite-plugin-pwa, Service Workers |

## Setup Rápido

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

### Variáveis de Ambiente

Configuradas automaticamente pelo Lovable Cloud:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Scripts

```bash
npm run dev           # Servidor de desenvolvimento
npm run build         # Build de produção
npm run preview       # Preview do build
npm run lint          # Linting
npm run test          # Testes unitários (watch)
npm run test:run      # Testes unitários (single run)
npm run test:coverage # Cobertura de testes
npm run test:e2e      # Testes E2E (Playwright)
npm run test:e2e:ui   # E2E com UI interativa
```

## Números do Projeto

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

## 📚 Documentação Completa

| Documento | Descrição |
|-----------|-----------|
| [docs/PRD.md](./docs/PRD.md) | Requisitos do produto e backlog |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Planejamento 2025-2027 |
| [docs/PENDENCIAS.md](./docs/PENDENCIAS.md) | Changelog e pendências |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Estrutura técnica e padrões |
| [docs/SYSTEM_DESIGN.md](./docs/SYSTEM_DESIGN.md) | Fluxos de dados e APIs |
| [docs/EDGE_FUNCTIONS.md](./docs/EDGE_FUNCTIONS.md) | Documentação das Edge Functions |
| [docs/COMPONENTES.md](./docs/COMPONENTES.md) | Referência de componentes |
| [docs/onesignal.md](./docs/onesignal.md) | Integração OneSignal |
| [docs/pwa-push.md](./docs/pwa-push.md) | Blueprint PWA e Push |

## Licença

Este projeto é privado e pertence ao seu criador.
