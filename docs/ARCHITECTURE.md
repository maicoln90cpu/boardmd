# Arquitetura do Projeto - TaskFlow

Este documento descreve a estrutura de diretórios, convenções, padrões de código e otimizações do projeto.

## 📚 Documentação Relacionada

- [README.md](../README.md) - Setup e visão geral
- [PRD.md](./PRD.md) - Requisitos do produto
- [ROADMAP.md](./ROADMAP.md) - Planejamento futuro
- [PENDENCIAS.md](./PENDENCIAS.md) - Changelog
- [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - Fluxos de dados e APIs
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) - Edge Functions
- [COMPONENTES.md](./COMPONENTES.md) - Referência de componentes

---

## 📁 Estrutura de Diretórios

```
src/
├── __tests__/           # Testes automatizados (15 arquivos)
│   ├── components/      # Auth, TaskCard, TaskModal, KanbanBoard, VirtualizedNotebooksList
│   ├── hooks/           # useTasks, useCategories, useColumns, useSettings, useNotes, usePomodoro, useRateLimiter, useMenuItems
│   ├── lib/             # dateUtils, taskFilters, validations, columnStyles
│   ├── contexts/        # AuthContext
│   └── setup.ts
│
├── components/          # Componentes React (~120)
│   ├── ui/              # shadcn/ui base (50+)
│   ├── kanban/          # Kanban: DroppableColumn, Filters, Gantt, Table, etc. (18)
│   ├── notes/           # Notas: Editor, Backlinks, Wiki, Templates (15+)
│   │   ├── extensions/  # TipTap: TaskBlock, Backlink, HeadingWithId, PriorityBadge
│   │   └── hooks/       # useNoteEditorState
│   ├── dashboard/       # Dashboard: Charts, Heatmap, Gamification, Insights (12)
│   ├── task-card/       # TaskCard: Actions, Badges, Header, Completion (9)
│   ├── costs/           # Custos: Themes, Items, Filters, Exchange (8)
│   ├── courses/         # Cursos: Card, Modal, Modules, Stats (9)
│   ├── tools/           # Ferramentas: Cards, API Keys, Functions (11)
│   ├── whatsapp/        # WhatsApp: Connection, Templates, Logs (4)
│   ├── settings/        # Configurações: Colors, Profile (3)
│   ├── sidebar/         # CategoryTree
│   ├── calendar/        # CalendarColorLegend
│   ├── notifications/   # History, Preferences
│   └── templates/       # TemplateCard, TemplateSelector
│
├── hooks/               # Custom React Hooks (55+)
│   ├── tasks/           # useTasks, useTaskFiltering, useTaskSorting, useTaskHistory, useTaskReset
│   ├── ui/              # useToast, useMobile, useMediaQuery, useBreakpoint, useMenuItems
│   ├── data/            # useSettings, useCategories, useColumns, useTags, useTaskCounts
│   ├── index/           # useIndexData, useIndexFilters, useIndexViewState
│   └── [40+ hooks individuais]
│
├── lib/                 # Utilitários
│   ├── sync/            # offlineSync, backgroundSync, indexedDB, syncManager
│   ├── push/            # pushNotifications, oneSignalProvider, swPushRegistration
│   ├── export/          # exportVisual, reportGenerator
│   ├── pwa/             # pwaUpdater
│   ├── notifications/   # oneSignalNotifier, pushHelper
│   ├── logger.ts        # Logger padronizado (dev/prod)
│   └── [dateUtils, taskFilters, validations, recurrenceUtils, etc.]
│
├── pages/               # Páginas/Rotas (20)
│   ├── Index.tsx, Dashboard.tsx, Notes.tsx, Calendar.tsx
│   ├── Eisenhower.tsx, Habits.tsx, Courses.tsx, CostCalculator.tsx
│   ├── Tools.tsx, Retrospective.tsx, QuickLinks.tsx, Pomodoro.tsx
│   ├── Settings.tsx, Config.tsx, NotificationsDashboard.tsx
│   ├── Landing.tsx, SharedNote.tsx
│   └── ForgotPassword.tsx, ResetPassword.tsx, NotFound.tsx
│
├── contexts/            # React Contexts (5)
│   ├── AuthContext.tsx, ThemeContext.tsx, ColorThemeContext.tsx
│   ├── SwipeContext.tsx, SavingTasksContext.tsx
│
├── types/               # Tipos centralizados
│   └── index.ts
│
└── integrations/supabase/ # Auto-gerado (client.ts, types.ts)

supabase/functions/      # Edge Functions (18) — ver EDGE_FUNCTIONS.md
docs/                    # Documentação
e2e/                     # Testes E2E (5 specs)
```

---

## 🏷️ Convenções de Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `TaskCard.tsx` |
| Hooks | camelCase + `use` | `useTasks.ts` |
| Utilitários | camelCase | `dateUtils.ts` |
| Contextos | PascalCase + `Context` | `AuthContext.tsx` |
| Edge Functions | kebab-case | `ai-subtasks` |
| Constantes | UPPER_SNAKE_CASE | `TAG_PRESET_COLORS` |

---

## 📦 Padrões de Importação

```typescript
// 1. React e libs externas
import { useState, useEffect } from "react";
// 2. Componentes UI
import { Button } from "@/components/ui/button";
// 3. Hooks
import { useTasks } from "@/hooks/tasks/useTasks";
// 4. Contextos
import { useAuth } from "@/contexts/AuthContext";
// 5. Utilitários e tipos
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { Task } from "@/types";
```

---

## 🔧 Padrões de Código

### Logging

```typescript
import { logger } from "@/lib/logger";
// Dev-only (suprimidos em produção)
logger.error("Error:", error);
// ESLint: "no-console": ["warn", { allow: ["warn"] }]
```

### Componentes React

- `export function` (não `export default`)
- Props com interface explícita
- Ordem: hooks → derived state → handlers → effects → render
- `cn()` para classes condicionais
- Tokens semânticos (nunca cores hardcoded)

### Banco de Dados

- RLS obrigatório
- Timestamps: `created_at`, `updated_at`
- UUID: `gen_random_uuid()`
- Soft delete via `trash`
- Validation triggers (não CHECK com `now()`)

---

## ⚡ Otimizações

- **Code Splitting**: `React.lazy()` para páginas secundárias
- **Virtualização**: `@tanstack/react-virtual` para listas > 50 itens
- **Memoização**: `memo`, `useCallback`, `useMemo`
- **Merge Realtime**: Preserva campos críticos no merge de estado
- **Content on-demand**: Notas carregam content apenas quando selecionadas

---

## 🗄️ Tabelas do Banco (30+)

| Grupo | Tabelas |
|-------|---------|
| Core | tasks, columns, categories, tags |
| Notas | notes, notebooks, shared_notes |
| Produtividade | pomodoro_sessions, pomodoro_templates, user_stats, goals |
| Hábitos | habits, habit_checkins |
| Cursos | courses, course_categories |
| Custos | cost_themes, cost_items |
| Ferramentas | tools, tool_functions, tool_function_assignments, api_keys |
| Sistema | profiles, user_settings, activity_log, audit_logs, task_history, task_completion_logs |
| Push | push_subscriptions, push_logs |
| WhatsApp | whatsapp_config, whatsapp_templates, whatsapp_logs |
| Outros | trash, project_templates, quick_links, weekly_reviews |

---

*Última atualização: 28 de Março de 2026*
