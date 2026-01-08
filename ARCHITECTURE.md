# Arquitetura do Projeto - TaskFlow

Este documento descreve a estrutura de diretórios, convenções de nomenclatura, padrões de código, otimizações de performance e guia de contribuição do projeto.

## 📚 Documentação Relacionada

- [README.md](./README.md) - Setup e visão geral
- [PRD.md](./PRD.md) - Requisitos do produto
- [ROADMAP.md](./ROADMAP.md) - Planejamento futuro
- [PENDENCIAS.md](./PENDENCIAS.md) - Changelog e pendências

---

## 📁 Estrutura de Diretórios

```
src/
├── __tests__/           # Testes automatizados
│   ├── components/      # Testes de componentes React (4)
│   │   ├── Auth.test.tsx
│   │   ├── TaskCard.test.tsx
│   │   ├── TaskModal.test.tsx
│   │   └── KanbanBoard.test.tsx
│   ├── hooks/           # Testes de custom hooks (7)
│   │   ├── useTasks.test.ts
│   │   ├── useCategories.test.ts
│   │   ├── useColumns.test.ts
│   │   ├── useSettings.test.ts
│   │   ├── useNotes.test.ts
│   │   ├── usePomodoro.test.ts
│   │   └── useRateLimiter.test.ts
│   ├── lib/             # Testes de funções utilitárias (3)
│   │   ├── dateUtils.test.ts
│   │   ├── taskFilters.test.ts
│   │   └── validations.test.ts
│   ├── contexts/        # Testes de contextos (1)
│   │   └── AuthContext.test.tsx
│   ├── setup.ts         # Configuração global de testes
│   └── README.md        # Documentação de testes
│
├── components/           # Componentes React (~90)
│   ├── ui/              # Componentes base shadcn (50+)
│   ├── kanban/          # Componentes do Kanban (15)
│   │   ├── BulkActionsBar.tsx
│   │   ├── ColumnColorPicker.tsx
│   │   ├── ColumnManager.tsx
│   │   ├── DailyKanbanView.tsx
│   │   ├── DeleteTaskDialog.tsx
│   │   ├── DroppableColumn.tsx
│   │   ├── FilterPresetsManager.tsx
│   │   ├── KanbanColumnHeader.tsx
│   │   ├── KanbanDesktopView.tsx
│   │   ├── KanbanFiltersBar.tsx
│   │   ├── MobileKanbanView.tsx
│   │   ├── ProjectsKanbanView.tsx
│   │   ├── RecurrenceEditor.tsx
│   │   ├── SubtasksEditor.tsx
│   │   ├── SwipeableTaskCard.tsx
│   │   └── VirtualizedTaskList.tsx
│   ├── notes/           # Componentes de Notas (12)
│   │   ├── ColorPicker.tsx
│   │   ├── MobileNotesLayout.tsx
│   │   ├── NotebooksList.tsx
│   │   ├── NotebookTagPicker.tsx
│   │   ├── NoteEditor.tsx
│   │   ├── NotesList.tsx
│   │   ├── NotesSearch.tsx
│   │   ├── RichTextToolbar.tsx
│   │   ├── TaskSelectorModal.tsx
│   │   ├── TrashDialog.tsx
│   │   └── extensions/
│   │       ├── TaskBlockComponent.tsx
│   │       └── TaskBlockExtension.ts
│   ├── dashboard/       # Componentes do Dashboard (7)
│   │   ├── GamificationPanel.tsx
│   │   ├── PerformanceMetrics.tsx
│   │   ├── ProductivityChart.tsx
│   │   ├── ProductivityInsights.tsx
│   │   ├── PushNotificationMonitor.tsx
│   │   ├── SystemHealthMonitor.tsx
│   │   └── WeeklyProgress.tsx
│   ├── task-card/       # Subcomponentes do TaskCard (8)
│   │   ├── TaskCardActions.tsx
│   │   ├── TaskCardBadges.tsx
│   │   ├── TaskCardCompleteDialog.tsx
│   │   ├── TaskCardHeader.tsx
│   │   ├── TaskCardHoverContent.tsx
│   │   ├── TaskCardSkeleton.tsx
│   │   ├── TaskCardTags.tsx
│   │   ├── TaskCardUltraCompact.tsx
│   │   └── index.ts
│   ├── calendar/        # Componentes do Calendário
│   │   └── CalendarColorLegend.tsx
│   ├── notifications/   # Componentes de Notificações
│   │   ├── NotificationHistory.tsx
│   │   └── NotificationPreferences.tsx
│   ├── sidebar/         # Componentes da Sidebar
│   │   └── CategoryTree.tsx
│   ├── templates/       # Componentes de templates
│   │   ├── TemplateCard.tsx
│   │   └── TemplateSelector.tsx
│   └── [componentes raiz]
│
├── hooks/               # Custom React Hooks (35)
│   ├── tasks/           # Hooks de tarefas
│   │   ├── useTasks.ts
│   │   ├── useTaskFiltering.ts
│   │   ├── useTaskSorting.ts
│   │   ├── useTaskHistory.ts
│   │   ├── useTaskReset.ts
│   │   └── index.ts
│   ├── ui/              # Hooks de interface
│   │   ├── useToast.ts
│   │   ├── useMobile.tsx
│   │   ├── useMediaQuery.ts
│   │   ├── useBreakpoint.ts
│   │   └── index.ts
│   ├── data/            # Hooks de dados/estado
│   │   ├── useSettings.ts
│   │   ├── useCategories.ts
│   │   ├── useColumns.ts
│   │   ├── useTags.ts
│   │   └── index.ts
│   └── [35 hooks totais]
│
├── lib/                 # Utilitários e funções helper
│   ├── sync/            # Sincronização offline/background
│   │   ├── offlineSync.ts
│   │   ├── backgroundSync.ts
│   │   └── index.ts
│   ├── push/            # Notificações push
│   │   ├── pushNotifications.ts
│   │   ├── oneSignalProvider.ts
│   │   └── index.ts
│   ├── export/          # Exportação (PNG, PDF)
│   │   ├── exportVisual.ts
│   │   └── index.ts
│   ├── pwa/             # PWA utilities
│   │   ├── pwaUpdater.ts
│   │   └── index.ts
│   ├── notifications/   # Templates de notificação
│   │   └── oneSignalNotifier.ts
│   ├── dateUtils.ts
│   ├── taskFilters.ts
│   ├── recurrenceUtils.ts
│   ├── validations.ts
│   ├── utils.ts
│   ├── logger.ts
│   ├── importValidation.ts
│   ├── defaultAIPrompts.ts
│   └── defaultNotificationTemplates.ts
│
├── pages/               # Páginas/Rotas (11)
│   ├── Index.tsx        # Kanban principal
│   ├── Dashboard.tsx
│   ├── Notes.tsx
│   ├── Calendar.tsx
│   ├── Config.tsx
│   ├── Settings.tsx
│   ├── Pomodoro.tsx
│   ├── NotificationsDashboard.tsx
│   ├── Landing.tsx
│   ├── ForgotPassword.tsx
│   ├── ResetPassword.tsx
│   └── NotFound.tsx
│
├── contexts/            # React Contexts (4)
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   ├── SwipeContext.tsx
│   └── SavingTasksContext.tsx
│
├── types/               # TypeScript types/interfaces
│   └── index.ts
│
└── integrations/        # Integrações externas
    └── supabase/
        ├── client.ts    # (auto-gerado)
        └── types.ts     # (auto-gerado)

e2e/                     # Testes E2E com Playwright (5)
├── auth.spec.ts
├── tasks.spec.ts
├── kanban.spec.ts
├── notes.spec.ts
└── pomodoro.spec.ts

supabase/
├── functions/           # Edge Functions (9)
│   ├── cleanup-old-logs/
│   ├── daily-assistant/
│   ├── delete-account/
│   ├── format-note/
│   ├── health-check/
│   ├── productivity-insights/
│   ├── reset-daily-stats/
│   ├── reset-recurring-tasks/
│   └── send-onesignal/
├── migrations/          # Migrações SQL
└── config.toml          # (auto-gerado)

.github/
└── workflows/
    └── test.yml         # CI/CD para testes

public/
├── manifest.json        # PWA manifest
├── sw-push.js          # Service worker push
├── OneSignalSDKWorker.js
├── offline.html
└── pwa-icon.png
```

---

## 🧪 Testes Automatizados

### Estrutura de Testes

```
src/__tests__/
├── components/           # Testes de componentes React
│   ├── Auth.test.tsx          # Login, registro, validações
│   ├── TaskCard.test.tsx      # Renderização, interações
│   ├── TaskModal.test.tsx     # Criação, edição de tarefas
│   └── KanbanBoard.test.tsx   # Board, colunas, drag & drop
├── hooks/                # Testes de custom hooks
│   ├── useTasks.test.ts       # CRUD, filtros, ordenação
│   ├── useCategories.test.ts  # Categorias/projetos
│   ├── useColumns.test.ts     # Colunas do Kanban
│   ├── useSettings.test.ts    # Configurações do usuário
│   ├── useNotes.test.ts       # Notas e cadernos
│   ├── usePomodoro.test.ts    # Timer e sessões
│   └── useRateLimiter.test.ts # Rate limiting
├── lib/                  # Testes de utilitários
│   ├── dateUtils.test.ts      # Formatação de datas
│   ├── taskFilters.test.ts    # Filtros centralizados
│   └── validations.test.ts    # Validações de input
├── contexts/             # Testes de contextos
│   └── AuthContext.test.tsx   # Autenticação
└── setup.ts              # Configuração global

e2e/                      # Testes E2E com Playwright
├── auth.spec.ts          # Login, registro, recuperação
├── tasks.spec.ts         # CRUD de tarefas
├── kanban.spec.ts        # Drag and drop, filtros
├── notes.spec.ts         # Notas e cadernos
└── pomodoro.spec.ts      # Timer e sessões
```

### Comandos de Teste

```bash
# Testes Unitários (Vitest)
npm run test              # Watch mode
npm run test:run          # Single run
npm run test:coverage     # Com cobertura

# Testes E2E (Playwright)
npm run test:e2e          # Headless
npm run test:e2e:ui       # UI interativa
```

### Padrões de Teste

```typescript
// ✅ Estrutura recomendada para testes de hooks
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

describe('useHookName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar estado inicial', () => {
    const { result } = renderHook(() => useHookName(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it('deve buscar dados corretamente', async () => {
    const { result } = renderHook(() => useHookName(), { wrapper });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toHaveLength(2);
  });
});

// ✅ Estrutura recomendada para testes de componentes
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ComponentName {...defaultProps} {...props} />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('deve renderizar corretamente', () => {
    const { getByText } = renderComponent();
    expect(getByText('Expected Text')).toBeInTheDocument();
  });

  it('deve responder a interações', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { getByRole } = renderComponent({ onClick });
    
    await user.click(getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### CI/CD

O workflow `.github/workflows/test.yml` executa:
1. **unit-tests**: Testes unitários com Vitest
2. **e2e-tests**: Testes E2E com Playwright (após unit-tests)

Triggers: `push` e `pull_request` para branches `main` e `develop`.

---

## 🏷️ Convenções de Nomenclatura

### Arquivos e Pastas

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes React | PascalCase | `TaskCard.tsx`, `KanbanBoard.tsx` |
| Hooks | camelCase com prefixo `use` | `useTasks.ts`, `useSettings.ts` |
| Utilitários/Libs | camelCase | `dateUtils.ts`, `taskFilters.ts` |
| Contextos | PascalCase com sufixo `Context` | `AuthContext.tsx` |
| Páginas | PascalCase | `Dashboard.tsx`, `Notes.tsx` |
| Tipos | PascalCase | `Task`, `Column`, `AppSettings` |
| Edge Functions | kebab-case | `send-onesignal`, `daily-assistant` |
| Testes | mesmo nome + `.test.ts(x)` | `useTasks.test.ts` |

### Código

```typescript
// ✅ Componentes: PascalCase
export function TaskCard({ task }: TaskCardProps) { ... }

// ✅ Hooks: camelCase com 'use'
export function useTasks() { ... }

// ✅ Funções utilitárias: camelCase
export function formatDateTimeBR(date: Date) { ... }

// ✅ Constantes: UPPER_SNAKE_CASE
export const TAG_PRESET_COLORS = [...];

// ✅ Interfaces/Types: PascalCase
export interface Task { ... }
export type SortOption = "date" | "priority" | "name";

// ✅ Variáveis/funções locais: camelCase
const selectedTasks = tasks.filter(...);
```

---

## 📦 Padrões de Importação

### Ordem de Imports

```typescript
// 1. React e bibliotecas externas
import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";

// 2. Componentes UI
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 3. Hooks
import { useTasks } from "@/hooks/tasks/useTasks";
import { useToast } from "@/hooks/ui/useToast";

// 4. Contextos
import { useAuth } from "@/contexts/AuthContext";

// 5. Utilitários e tipos
import { cn } from "@/lib/utils";
import { Task } from "@/types";

// 6. Constantes e assets
import { RATE_LIMIT_CONFIGS } from "@/hooks/useRateLimiter";
```

### Aliases de Importação

| Alias | Caminho |
|-------|---------|
| `@/` | `src/` |
| `@/components/` | `src/components/` |
| `@/hooks/` | `src/hooks/` |
| `@/lib/` | `src/lib/` |
| `@/pages/` | `src/pages/` |
| `@/contexts/` | `src/contexts/` |
| `@/types` | `src/types/index.ts` |

---

## 🎨 Padrões de Estilo

### Tailwind CSS

```tsx
// ✅ Use tokens semânticos do design system
<div className="bg-background text-foreground">
<Button className="bg-primary text-primary-foreground">

// ❌ Evite cores hardcoded
<div className="bg-white text-black">
<Button className="bg-blue-500">

// ✅ Use cn() para classes condicionais
<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === "compact" && "compact-class"
)}>

// ✅ Use tokens de gradiente
<div className="bg-gradient-to-br from-primary/20 to-primary/5">
```

### Componentes UI (shadcn/ui)

- Use componentes de `@/components/ui/` sempre que possível
- Estenda via `variants` em vez de sobrescrever estilos
- Mantenha consistência com o design system existente

---

## 🔧 Padrões de Código

### Componentes React

```tsx
// ✅ Padrão recomendado
interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  compact?: boolean;
}

export function TaskCard({ task, onEdit, compact = false }: TaskCardProps) {
  // 1. Hooks
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  // 2. Derived state / memoization
  const isOverdue = useMemo(() => isPast(task.due_date), [task.due_date]);
  
  // 3. Handlers
  const handleClick = useCallback(() => {
    onEdit?.(task);
  }, [task, onEdit]);
  
  // 4. Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 5. Render
  return (
    <Card className={cn("p-4", compact && "p-2")}>
      {/* ... */}
    </Card>
  );
}
```

### Hooks Customizados

```typescript
// ✅ Padrão recomendado
export function useTasks() {
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Queries/Mutations
  const fetchTasks = useCallback(async () => {
    // ...
  }, []);
  
  // Effects
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  // Return object with consistent naming
  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    fetchTasks,
  };
}
```

### Logging

```typescript
import { logger, prodLogger } from "@/lib/logger";

// ✅ Dev-only logs (removidos em produção)
logger.log("Debug info:", data);
logger.info("User action:", action);
logger.warn("Warning:", message);
logger.error("Error:", error);

// ✅ Logs que devem aparecer em produção
prodLogger.error("Critical error:", error);
prodLogger.warn("Important warning:", message);
```

---

## ⚡ Otimizações de Performance

### Code Splitting

O projeto utiliza `React.lazy()` para carregamento sob demanda:

```typescript
// ✅ Páginas lazy-loaded
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Notes = lazy(() => import("@/pages/Notes"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const Pomodoro = lazy(() => import("@/pages/Pomodoro"));

// ✅ Componentes pesados lazy-loaded
const TaskModal = lazy(() => 
  import("./TaskModal").then(m => ({ default: m.TaskModal }))
);

// ❌ Páginas críticas NÃO devem ser lazy
import Index from "@/pages/Index";  // Página inicial
import Landing from "@/pages/Landing";  // Landing page
```

### Virtualização de Listas

Para listas com mais de 50 itens, utilizamos `@tanstack/react-virtual`:

```typescript
// src/components/kanban/VirtualizedTaskList.tsx
const VIRTUALIZATION_THRESHOLD = 50;

const getEstimatedItemSize = (densityMode: string) => {
  switch (densityMode) {
    case "ultra-compact": return 40;
    case "compact": return 72;
    default: return 120;
  }
};
```

### Memoização

```typescript
// ✅ Componentes memoizados
export const KanbanDesktopView = memo(function KanbanDesktopView(props) { ... });
export const DroppableColumn = memo(function DroppableColumn(props) { ... });

// ✅ Handlers memoizados
const handleSaveTask = useCallback(async (taskData) => {
  // ...
}, [dependencies]);

// ✅ Valores derivados memoizados
const activeTask = useMemo(
  () => activeId ? tasks.find((t) => t.id === activeId) : null,
  [activeId, tasks]
);
```

---

## 🗄️ Padrões de Banco de Dados

### Supabase

- **RLS obrigatório**: Todas as tabelas devem ter políticas RLS
- **Timestamps**: Use `created_at` e `updated_at` com triggers
- **UUID**: Use `gen_random_uuid()` para IDs
- **Soft delete**: Use tabela `trash` para exclusões reversíveis

### Migrações

```sql
-- ✅ Padrão de migração
CREATE TABLE public.example (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.example ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view own data" 
ON public.example FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" 
ON public.example FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" 
ON public.example FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" 
ON public.example FOR DELETE 
USING (auth.uid() = user_id);
```

### Tabelas do Projeto (16+)

| Tabela | Descrição |
|--------|-----------|
| `tasks` | Tarefas do Kanban |
| `columns` | Colunas do Kanban |
| `categories` | Categorias/projetos |
| `notes` | Notas |
| `notebooks` | Cadernos de notas |
| `tags` | Tags |
| `pomodoro_sessions` | Sessões Pomodoro |
| `pomodoro_templates` | Templates de Pomodoro |
| `user_stats` | Estatísticas/gamificação |
| `user_settings` | Configurações |
| `profiles` | Perfis de usuário |
| `activity_log` | Log de atividades |
| `audit_logs` | Logs de auditoria |
| `task_history` | Histórico de tarefas |
| `push_subscriptions` | Subscriptions push |
| `push_logs` | Logs de push |
| `trash` | Lixeira (soft delete) |
| `project_templates` | Templates de projetos |

---

## 📝 Guia de Contribuição

### Antes de Começar

1. Entenda a estrutura do projeto lendo este documento
2. Verifique se já existe um componente/hook similar
3. Siga as convenções de nomenclatura

### Criando Novos Componentes

1. Coloque na pasta apropriada (`components/`, subpasta se aplicável)
2. Use TypeScript com interfaces explícitas para props
3. Exporte componentes com `export function` (não `export default`)
4. **Adicione testes** em `src/__tests__/components/`
5. **Considere memoização** se o componente será renderizado frequentemente

### Criando Novos Hooks

1. Coloque na subpasta apropriada (`hooks/tasks/`, `hooks/ui/`, `hooks/data/`)
2. Prefixe com `use`
3. Retorne objeto com nomes consistentes
4. Adicione re-export no `index.ts` da pasta
5. **Adicione testes** em `src/__tests__/hooks/`

### Adicionando Utilitários

1. Coloque em `lib/` ou subpasta apropriada
2. Exporte funções puras quando possível
3. Adicione tipagem explícita para parâmetros e retorno
4. **Adicione testes** em `src/__tests__/lib/`

### Commits

```bash
# ✅ Formato recomendado (Conventional Commits)
feat: adiciona filtro por data de vencimento
fix: corrige bug no drag and drop mobile
refactor: reorganiza estrutura de hooks
docs: atualiza ARCHITECTURE.md
style: ajusta espaçamento do TaskCard
perf: adiciona virtualização para listas longas
test: adiciona testes para useTasks hook
chore: atualiza dependências
```

---

## 🔗 Links Úteis

- [Documentação Lovable](https://docs.lovable.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [TipTap Editor](https://tiptap.dev/)
- [Framer Motion](https://www.framer.com/motion/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [date-fns](https://date-fns.org/)

---

*Última atualização: 08 de Janeiro de 2026*
