# Arquitetura do Projeto

Este documento descreve a estrutura de diretórios, convenções de nomenclatura, padrões de código e guia de contribuição do projeto.

## 📁 Estrutura de Diretórios

```
src/
├── components/           # Componentes React reutilizáveis
│   ├── ui/              # Componentes base (shadcn/ui)
│   ├── kanban/          # Componentes específicos do Kanban
│   ├── notes/           # Componentes do módulo de Notas
│   ├── dashboard/       # Componentes do Dashboard
│   ├── sidebar/         # Componentes da Sidebar
│   ├── task-card/       # Subcomponentes do TaskCard
│   ├── templates/       # Componentes de templates
│   └── calendar/        # Componentes do Calendário
│
├── hooks/               # Custom React Hooks
│   ├── tasks/           # Hooks relacionados a tarefas
│   │   ├── useTasks.ts
│   │   ├── useTaskFiltering.ts
│   │   ├── useTaskSorting.ts
│   │   ├── useTaskHistory.ts
│   │   └── useTaskReset.ts
│   ├── ui/              # Hooks de interface
│   │   ├── useToast.ts
│   │   ├── useMobile.tsx
│   │   ├── useMediaQuery.ts
│   │   └── useBreakpoint.ts
│   ├── data/            # Hooks de dados/estado
│   │   ├── useSettings.ts
│   │   ├── useCategories.ts
│   │   ├── useColumns.ts
│   │   └── useTags.ts
│   └── [outros hooks]   # Hooks não agrupados
│
├── lib/                 # Utilitários e funções helper
│   ├── sync/            # Sincronização offline/background
│   │   ├── offlineSync.ts
│   │   └── backgroundSync.ts
│   ├── push/            # Notificações push
│   │   └── pushNotifications.ts
│   ├── export/          # Exportação (PNG, PDF)
│   │   └── exportVisual.ts
│   ├── pwa/             # PWA utilities
│   │   └── pwaUpdater.ts
│   ├── dateUtils.ts     # Funções de data
│   ├── taskFilters.ts   # Filtros centralizados de tarefas
│   ├── recurrenceUtils.ts
│   ├── validations.ts
│   ├── utils.ts         # Utilitários gerais (cn, etc)
│   └── logger.ts        # Sistema de logging
│
├── pages/               # Páginas/Rotas da aplicação
│   ├── Index.tsx        # Página principal (Kanban)
│   ├── Dashboard.tsx
│   ├── Notes.tsx
│   ├── Calendar.tsx
│   ├── Config.tsx
│   ├── Settings.tsx
│   ├── Pomodoro.tsx
│   └── NotificationsDashboard.tsx
│
├── contexts/            # React Contexts
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── SwipeContext.tsx
│
├── types/               # TypeScript types/interfaces
│   └── index.ts
│
└── integrations/        # Integrações externas
    └── supabase/
        ├── client.ts    # Cliente Supabase (auto-gerado)
        └── types.ts     # Tipos do banco (auto-gerado)

supabase/
├── functions/           # Edge Functions
│   ├── send-push/
│   ├── daily-assistant/
│   ├── productivity-insights/
│   └── [outras funções]
└── config.toml          # Configuração Supabase (auto-gerado)
```

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
| Edge Functions | kebab-case | `send-push`, `daily-assistant` |

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

## 📦 Padrões de Importação

### Ordem de Imports

```typescript
// 1. React e bibliotecas externas
import { useState, useEffect } from "react";
import { format } from "date-fns";

// 2. Componentes UI
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// 3. Hooks
import { useTasks } from "@/hooks/tasks/useTasks";
import { useToast } from "@/hooks/ui/useToast";

// 4. Utilitários e tipos
import { cn } from "@/lib/utils";
import { Task } from "@/types";

// 5. Constantes e assets
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
```

### Componentes UI (shadcn/ui)

- Use componentes de `@/components/ui/` sempre que possível
- Estenda via `variants` em vez de sobrescrever estilos
- Mantenha consistência com o design system existente

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

## 🗄️ Padrões de Banco de Dados

### Supabase

- **RLS obrigatório**: Todas as tabelas devem ter políticas RLS
- **Timestamps**: Use `created_at` e `updated_at` com triggers
- **UUID**: Use `gen_random_uuid()` para IDs
- **Soft delete**: Use tabela `trash` para exclusões reversíveis

### Migrações

```sql
-- ✅ Padrão de migração
-- Criar tabela
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
```

## 🧪 Testes Manuais

### Checklist Pré-Deploy

- [ ] Criar/editar/deletar tarefas
- [ ] Drag and drop no Kanban
- [ ] Filtros e busca funcionando
- [ ] Navegação entre páginas
- [ ] Responsividade (mobile/desktop)
- [ ] Toast notifications aparecem
- [ ] Offline sync funciona
- [ ] Autenticação (login/logout)

## 📝 Guia de Contribuição

### Antes de Começar

1. Entenda a estrutura do projeto lendo este documento
2. Verifique se já existe um componente/hook similar
3. Siga as convenções de nomenclatura

### Criando Novos Componentes

1. Coloque na pasta apropriada (`components/`, subpasta se aplicável)
2. Use TypeScript com interfaces explícitas para props
3. Exporte componentes com `export function` (não `export default`)
4. Documente props complexas com comentários JSDoc

### Criando Novos Hooks

1. Coloque na subpasta apropriada (`hooks/tasks/`, `hooks/ui/`, `hooks/data/`)
2. Prefixe com `use`
3. Retorne objeto com nomes consistentes
4. Adicione re-export no `index.ts` da pasta

### Adicionando Utilitários

1. Coloque em `lib/` ou subpasta apropriada
2. Exporte funções puras quando possível
3. Adicione tipagem explícita para parâmetros e retorno

### Commits

```bash
# ✅ Formato recomendado
feat: adiciona filtro por data de vencimento
fix: corrige bug no drag and drop mobile
refactor: reorganiza estrutura de hooks
docs: atualiza ARCHITECTURE.md
style: ajusta espaçamento do TaskCard
```

## 🔗 Links Úteis

- [Documentação Lovable](https://docs.lovable.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [React Query](https://tanstack.com/query/latest)
