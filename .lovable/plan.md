
# Plano de Implementação - Sistema de Métricas, Multi-Select e Limpeza do Diário

## Resumo Executivo

Este plano aborda 4 solicitações:
1. **Sistema de Métricas e Comentários** em tarefas concluídas
2. **Multi-Select para dias da semana** em tarefas recorrentes
3. **Remover "Diário"** das categorias visíveis
4. **Mapeamento completo** de referências ao Diário para remoção

---

## 1. Sistema de Métricas e Comentários nas Tarefas

### Visão Geral do Funcionamento

Ao marcar uma tarefa como concluída, se ela estiver configurada para rastrear métricas/comentários:
1. Modal aparece perguntando a métrica (ex: 45 minutos de treino)
2. Campo opcional para comentário (ex: "Treino de pernas hoje")
3. Histórico acessível via ícone no card da tarefa (tabela com data, métrica, comentário)
4. Estatísticas: soma de dias, soma de métricas, média

### Tipos de Métricas Sugeridos (8 opções)

| ID | Nome | Unidade | Exemplo de Uso |
|----|------|---------|----------------|
| time_minutes | Tempo (minutos) | min | Treino, estudo, meditação |
| pages | Páginas | pág | Leitura de livros |
| weight_kg | Peso (kg) | kg | Levantamento de peso |
| distance_km | Distância (km) | km | Corrida, caminhada |
| count | Quantidade | un | Emails enviados, ligações |
| percentage | Percentual | % | Progresso em projeto |
| calories | Calorias | kcal | Exercícios |
| money | Valor (R$) | R$ | Vendas, economia |

### Alterações no Banco de Dados

**Tabela: tasks (alteração)**
```sql
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS track_metrics boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS metric_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS track_comments boolean DEFAULT false;
```

**Nova Tabela: task_completion_logs**
```sql
CREATE TABLE public.task_completion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metric_value NUMERIC DEFAULT NULL,
  metric_type TEXT DEFAULT NULL,
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- RLS Policies
ALTER TABLE public.task_completion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completion logs" ON public.task_completion_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completion logs" ON public.task_completion_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own completion logs" ON public.task_completion_logs
  FOR DELETE USING (auth.uid() = user_id);
```

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/task-card/TaskCompletionModal.tsx` | Modal que aparece ao marcar tarefa como concluída |
| `src/components/task-card/TaskMetricsHistoryModal.tsx` | Modal com tabela de histórico de métricas |
| `src/hooks/useTaskCompletionLogs.ts` | Hook para CRUD dos logs de conclusão |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/index.ts` | Adicionar interface `TaskCompletionLog` e atualizar `Task` |
| `src/components/TaskModal.tsx` | Adicionar toggles para habilitar métricas/comentários + select de tipo de métrica |
| `src/components/TaskCard.tsx` | Adicionar ícone de histórico (📊) e chamar modal ao concluir |
| `src/components/task-card/TaskCardActions.tsx` | Adicionar botão de histórico de métricas |
| `src/hooks/tasks/useTasks.ts` | Incluir novos campos nas operações |

### Fluxo de Uso

```text
CONFIGURAÇÃO (TaskModal):
┌───────────────────────────────────────┐
│ ☐ Rastrear métricas ao concluir       │
│   └─ Tipo: [Tempo (minutos) ▼]        │
│ ☐ Solicitar comentário ao concluir    │
└───────────────────────────────────────┘

AO MARCAR COMO CONCLUÍDA (TaskCompletionModal):
┌───────────────────────────────────────┐
│ Treino Matinal - Concluído! 🎉        │
│───────────────────────────────────────│
│ Quanto tempo durou?                    │
│ [     45     ] minutos                │
│                                        │
│ Comentário (opcional):                 │
│ ┌─────────────────────────────────┐   │
│ │ Treino de pernas hoje, foquei   │   │
│ │ em agachamento e leg press      │   │
│ └─────────────────────────────────┘   │
│                                        │
│        [Cancelar]  [Salvar]           │
└───────────────────────────────────────┘

HISTÓRICO (TaskMetricsHistoryModal):
┌───────────────────────────────────────┐
│ 📊 Histórico: Treino Matinal          │
│───────────────────────────────────────│
│ Data       │ Tempo │ Comentário       │
│────────────┼───────┼──────────────────│
│ 27/01/2026 │ 45min │ Pernas           │
│ 26/01/2026 │ 60min │ Costas           │
│ 25/01/2026 │ 50min │ Peito            │
│────────────┴───────┴──────────────────│
│ Total: 3 dias | Soma: 155min          │
│ Média: 51.7 min/dia                   │
└───────────────────────────────────────┘
```

### Risco e Complexidade
- **Risco:** Médio (nova tabela, novo fluxo de UX)
- **Complexidade:** 7/10

---

## 2. Multi-Select para Dias da Semana

### Situação Atual
- Campo `weekday` armazena UM único número (0-6)
- Select permite escolher apenas um dia

### Alteração Proposta

**Alterar estrutura de dados:**
```typescript
// ANTES (RecurrenceRule em recurrenceUtils.ts):
interface RecurrenceRule {
  weekday?: number; // Um único dia (0-6)
}

// DEPOIS:
interface RecurrenceRule {
  weekday?: number;     // Mantido para compatibilidade
  weekdays?: number[];  // NOVO: array de dias [1, 4] = Segunda e Quinta
}
```

**Não precisa de migration** - o campo `recurrence_rule` já é JSONB, basta adicionar a propriedade `weekdays`.

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/recurrenceUtils.ts` | Adicionar suporte a `weekdays[]`, calcular próxima data considerando múltiplos dias |
| `src/types/index.ts` | Atualizar `RecurrenceRule` |
| `src/components/kanban/RecurrenceEditor.tsx` | Trocar Select por checkboxes multi-select |
| `supabase/functions/reset-recurring-tasks/index.ts` | Atualizar lógica para suportar `weekdays[]` |

### Nova Interface do RecurrenceEditor

```text
ANTES:
┌─────────────────────────────┐
│ Repetir toda                │
│ [Quarta-feira         ▼]    │
└─────────────────────────────┘

DEPOIS:
┌─────────────────────────────┐
│ Repetir nos dias:           │
│ ☐ Domingo                   │
│ ☑ Segunda-feira             │
│ ☐ Terça-feira               │
│ ☐ Quarta-feira              │
│ ☑ Quinta-feira              │
│ ☐ Sexta-feira               │
│ ☐ Sábado                    │
└─────────────────────────────┘
```

### Lógica de Cálculo da Próxima Data

```typescript
// Encontrar o próximo dia que está na lista de weekdays
function calculateNextRecurrenceDate(currentDate: string, rule: RecurrenceRule): string {
  if (rule.weekdays && rule.weekdays.length > 0) {
    const now = new Date();
    const currentDay = now.getDay();
    
    // Ordenar os dias da semana
    const sortedDays = [...rule.weekdays].sort((a, b) => a - b);
    
    // Encontrar o próximo dia na lista
    let nextDay = sortedDays.find(d => d > currentDay);
    let daysToAdd = 0;
    
    if (nextDay !== undefined) {
      daysToAdd = nextDay - currentDay;
    } else {
      // Próxima semana, primeiro dia da lista
      daysToAdd = 7 - currentDay + sortedDays[0];
    }
    
    // ... calcular data
  }
}
```

### Risco e Complexidade
- **Risco:** Baixo (compatível com dados existentes)
- **Complexidade:** 4/10

---

## 3. Remover "Diário" das Categorias

### Problema
A categoria "Diário" ainda aparece no select de categorias ao editar tarefas, mesmo que o modo Diário tenha sido removido.

### Solução

**Arquivo:** `src/components/TaskModal.tsx`

```tsx
// ANTES (linha ~336):
{categories.map((category) => (
  <SelectItem key={category.id} value={category.id}>
    {category.name}
  </SelectItem>
))}

// DEPOIS:
{categories
  .filter(category => category.name !== "Diário")
  .map((category) => (
    <SelectItem key={category.id} value={category.id}>
      {category.name}
    </SelectItem>
  ))}
```

**Adicionar filtro também em:**
- `src/pages/Config.tsx` (lista de categorias para gerenciamento)
- Qualquer outro lugar que liste categorias para seleção

### Risco e Complexidade
- **Risco:** Baixo
- **Complexidade:** 1/10

---

## 4. Mapeamento Completo de Referências ao "Diário"

### Arquivos com Referências a Remover/Ajustar

| Arquivo | Linha(s) | Tipo | Ação Recomendada |
|---------|----------|------|------------------|
| `src/hooks/data/useCategories.ts` | 54-75 | Criação automática | **REMOVER** criação automática de "Diário" |
| `src/hooks/data/useSettings.ts` | 29-30, 89-91, 115-116 | Campos obsoletos | **REMOVER** dailySortOption, dailySortOrder, dailyPriority, dailyTag, dailySearch |
| `src/types/index.ts` | 106, 115 | Tipos obsoletos | **REMOVER** dailySortOption, dailySortOrder, defaultView: 'daily' |
| `src/components/TaskModal.tsx` | 87, 155 | Filtro de tags | **MANTER** (remove tag legada espelho-diário) |
| `src/components/TaskCard.tsx` | 214 | Filtro de tags | **MANTER** (remove tag legada espelho-diário) |
| `src/components/SearchFilters.tsx` | 28-33, 58-63, 143-163 | Props/render obsoletos | **REMOVER** dailySortOption, dailySortChange, dailySortOrder |
| `src/pages/Config.tsx` | 399-411, 424-428, 445-448 | Proteção de categoria | **REMOVER** verificações especiais para "Diário" |
| `src/pages/Landing.tsx` | 96-104 | Texto de marketing | **ATUALIZAR** descrição das features |
| `src/lib/importValidation.ts` | 158-196 | Validação de import | **REMOVER** referências a "Diário" |
| `src/hooks/useViewModeHandlers.ts` | 34-39, 137-138 | Exclusão de categoria | **REMOVER** filtros por "Diário" |
| `src/hooks/useDataImportExport.ts` | 149-152 | Fallback de categoria | **REMOVER** referência a "Diário" |
| `src/hooks/tasks/useTaskFiltering.ts` | 58-62 | Comentário | **ATUALIZAR** comentário (remover menção a Diário) |
| `e2e/kanban.spec.ts` | 26 | Teste E2E | **REMOVER** expectativa de texto "diário" |
| `README.md` | 213 | Documentação | **ATUALIZAR** descrição |
| `PENDENCIAS.md` | 52, 288 | Documentação | **ATUALIZAR** descrição |
| `ROADMAP.md` | 156 | Documentação | **MANTER** (refere a "diário" como adjetivo, não feature) |
| `src/__tests__/hooks/useCategories.test.ts` | 87-91, 165-190 | Testes | **REMOVER** ou ATUALIZAR testes que dependem de "Diário" |

### Tabelas/Colunas do Banco Obsoletas

| Tabela | Coluna | Ação |
|--------|--------|------|
| `columns` | `show_in_daily` | **REMOVER** (migration) |
| `columns` | `kanban_type` com valor 'daily' | **ATUALIZAR** dados existentes |

### Tipos/Interfaces a Atualizar

```typescript
// src/types/index.ts - REMOVER:
interface KanbanSettings {
  dailySortOption: 'time' | 'name' | 'priority';    // REMOVER
  dailySortOrder: 'asc' | 'desc';                    // REMOVER
  dailyDueDateFilter: string | string[];             // REMOVER
  defaultView: 'daily' | 'projects';                 // ALTERAR para apenas 'projects'
}

// AppSettings.filters - REMOVER:
filters: {
  dailyPriority: string;   // REMOVER
  dailyTag: string;        // REMOVER
  dailySearch: string;     // REMOVER
}
```

### Risco e Complexidade
- **Risco:** Médio (afeta múltiplos arquivos)
- **Complexidade:** 5/10

---

## Ordem de Execução Recomendada

| # | Item | Prioridade | Dependências |
|---|------|------------|--------------|
| 1 | Filtrar "Diário" do select de categorias | Alta | Nenhuma |
| 2 | Multi-select para dias da semana | Alta | Nenhuma |
| 3 | Limpeza de referências ao Diário (código) | Alta | Item 1 |
| 4 | Sistema de métricas - Database migration | Média | Nenhuma |
| 5 | Sistema de métricas - Hooks e modais | Média | Item 4 |
| 6 | Sistema de métricas - Integração no TaskCard | Média | Item 5 |
| 7 | Limpeza de referências ao Diário (banco) | Baixa | Item 3 |

---

## Resumo de Impacto

### Arquivos a Criar (3)
- `src/components/task-card/TaskCompletionModal.tsx`
- `src/components/task-card/TaskMetricsHistoryModal.tsx`
- `src/hooks/useTaskCompletionLogs.ts`

### Arquivos a Modificar (20+)
- TaskModal, TaskCard, RecurrenceEditor
- useSettings, useCategories, useTasks
- types/index.ts, recurrenceUtils.ts
- Config.tsx, Landing.tsx
- SearchFilters, useViewModeHandlers
- Vários arquivos de teste e documentação

### Migrations de Banco (2)
1. Adicionar colunas em `tasks` (track_metrics, metric_type, track_comments)
2. Criar tabela `task_completion_logs`

### Vantagens
1. **Métricas:** Acompanhamento quantitativo de hábitos e tarefas
2. **Multi-select:** Flexibilidade para tarefas que ocorrem em múltiplos dias
3. **Limpeza:** Código mais limpo sem referências a feature removida

### Riscos
1. **Métricas:** Nova tabela e fluxo de UX podem introduzir bugs
2. **Multi-select:** Compatibilidade com dados existentes (weekday singular)
3. **Limpeza:** Possível quebra de testes ou comportamentos edge case
