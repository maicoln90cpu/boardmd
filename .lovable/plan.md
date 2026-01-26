
# Plano de Implementação - 4 Correções e Melhorias

## Resumo Executivo

Este plano aborda 4 solicitações distintas:
1. **Cursos:** Renomear "episódios" para "módulos" e adicionar campo "episódio atual"
2. **Cursos:** Mostrar badge da categoria nos cards
3. **Configurações:** Corrigir persistência e atualizar valores padrão
4. **Tarefas Recorrentes:** Explicar e padronizar comportamento de conclusão

---

## 1. Alteração de Nomenclatura em Cursos

### Situação Atual
- Campo `current_episode` (episódio atual) e `total_episodes` (total de episódios)
- Interface mostra "Ep. X/Y"
- Formulário tem campos "Ep. Atual" e "Total Eps."

### Alterações Propostas

**Banco de Dados (Migration):**
```sql
-- Adicionar nova coluna para módulo atual
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS current_module integer DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS total_modules integer DEFAULT 1;

-- Renomear para clareza (episódio vira aula dentro do módulo)
COMMENT ON COLUMN public.courses.current_episode IS 'Aula/Episódio atual dentro do módulo';
COMMENT ON COLUMN public.courses.total_episodes IS 'Total de aulas/episódios';
COMMENT ON COLUMN public.courses.current_module IS 'Módulo atual';
COMMENT ON COLUMN public.courses.total_modules IS 'Total de módulos';
```

**Arquivos a Modificar:**

| Arquivo | Alteração |
|---------|-----------|
| `src/types/index.ts` | Adicionar `current_module` e `total_modules` ao tipo `Course` e `CourseFormData` |
| `src/components/courses/CourseCard.tsx` | Exibir "Módulo X/Y - Ep. X/Y" |
| `src/components/courses/CourseModal.tsx` | Adicionar campos para módulos |
| `src/hooks/useCourses.ts` | Incluir novos campos nas operações CRUD |

**Nova estrutura visual no Card:**
```text
┌─────────────────────────────┐
│ [📚] React Avançado    [⭐] │
│       Udemy                 │
│ ─────────────────────────── │
│ Módulo 3/10 · Ep. 5/12      │
│ [- ] ████████░░ 75% [ +]    │
│ ─────────────────────────── │
│ R$ 99,00    Início: 10/01   │
│ [Abrir] [✏️] [🗑️]          │
└─────────────────────────────┘
```

**Risco:** Baixo | **Complexidade:** 4/10

---

## 2. Badge de Categoria nos Cards de Cursos

### Situação Atual
- A categoria é armazenada como texto (`course.category`)
- O `CourseCard` mostra apenas um ícone emoji baseado na categoria
- As cores das categorias estão na tabela `course_categories`

### Alterações Propostas

**Arquivo:** `src/components/courses/CourseCard.tsx`

Adicionar uma prop `categories` para buscar a cor da categoria e exibir badge colorido:

```tsx
// Dentro do CardHeader, após os badges de status/prioridade
{course.category && (
  <Badge 
    variant="secondary" 
    className="text-xs"
    style={{ 
      backgroundColor: getCategoryColor(course.category) + '20',
      color: getCategoryColor(course.category) 
    }}
  >
    {course.category}
  </Badge>
)}
```

**Arquivos a Modificar:**

| Arquivo | Alteração |
|---------|-----------|
| `src/components/courses/CourseCard.tsx` | Adicionar prop `categories` e renderizar badge |
| `src/pages/Courses.tsx` | Passar `categories` para `CourseCard` |

**Risco:** Baixo | **Complexidade:** 2/10

---

## 3. Correção de Configurações Persistidas

### Diagnóstico do Problema

O problema ocorre porque os valores **padrão** no `defaultSettings` são diferentes do que o usuário espera. Quando não há configuração salva no banco, o sistema usa os defaults. Além disso, existe um campo obsoleto "Ordenação Padrão (Diário)" que deve ser removido já que o modo Diário foi eliminado.

### Situação Atual em `useSettings.ts`:
```typescript
const defaultSettings: AppSettings = {
  defaultDensity: 'comfortable',  // ← Deveria ser 'compact'
  interface: {
    sidebarPinned: false,         // ← Deveria ser true
    sidebarExpandedWhenPinned: true, // ✓ Correto
  },
  kanban: {
    hideCompletedTasks: false,    // ← Deveria ser true
    projectsSortOption: 'manual', // ← Deveria ser 'date_asc'
    dailySortOption: 'time',      // ← Campo obsoleto (Diário não existe mais)
    dailySortOrder: 'asc',        // ← Campo obsoleto
  },
};
```

### Alterações Propostas

**Arquivo:** `src/hooks/data/useSettings.ts`

Atualizar os valores padrão:

```typescript
const defaultSettings: AppSettings = {
  // ... outros campos
  defaultDensity: 'compact', // ALTERADO
  interface: {
    // ...
    sidebarPinned: true,           // ALTERADO
    sidebarExpandedWhenPinned: true,
  },
  kanban: {
    // ...
    hideCompletedTasks: true,      // ALTERADO
    projectsSortOption: 'date_asc', // ALTERADO
    // dailySortOption e dailySortOrder mantidos para compatibilidade
  },
};
```

**Arquivo:** `src/pages/Config.tsx`

Remover a seção "Ordenação Padrão (Diário)" e "Direção da Ordenação (Diário)" (linhas ~962-992), já que o modo Diário não existe mais.

**Por que as configurações "se perdem":**
1. Se o usuário nunca salvou uma configuração específica, o sistema usa o default
2. O deep merge em `deepMergeSettings` preenche campos faltantes com defaults
3. Se o default for diferente da preferência, parece que "resetou"

**Solução adicional:** Para usuários existentes que já têm configurações salvas mas com valores antigos, podemos adicionar uma migração de settings que atualiza valores específicos se ainda estiverem no antigo default.

**Risco:** Baixo | **Complexidade:** 3/10

---

## 4. Comportamento de Tarefas Recorrentes

### Explicação do Comportamento Atual

Existem **dois comportamentos diferentes** porque a lógica de conclusão depende de **onde** a tarefa está:

#### Cenário A: Tarefa some e volta no próximo dia
Isso acontece quando:
1. A tarefa está em uma coluna normal (não "Recorrente")
2. O usuário marca como concluída
3. Se `hideCompletedTasks` está ativado, ela some imediatamente
4. O cron job às 23:59h reseta tarefas recorrentes completadas

#### Cenário B: Tarefa fica riscada sem atualizar data
Isso acontece quando:
1. A tarefa tem `recurrence_rule` definido
2. O usuário marca como concluída (`is_completed = true`)
3. A tarefa fica visível (riscada) até:
   - O cron job rodar (23:59h)
   - OU o usuário clicar em "Resetar Recorrentes" no header

### O Comportamento Desejado (Confirmado)

O usuário quer que **TODAS** as tarefas recorrentes sigam o **Cenário B**:
- Ao marcar como concluída → fica riscada visualmente
- NÃO atualiza a data automaticamente
- NÃO some da tela (mesmo com `hideCompletedTasks` ativo)
- Permanece riscada até:
  - Cron job executar às 23:59h
  - OU clique manual em "Resetar Recorrentes"

### Alterações Propostas

**Arquivo:** `src/lib/taskFilters.ts`

Modificar o filtro `hideCompletedTasks` para **excluir tarefas recorrentes**:

```typescript
// Na função filterTasks ou equivalente
if (settings.kanban.hideCompletedTasks) {
  filteredTasks = filteredTasks.filter(task => {
    // Se tem regra de recorrência, SEMPRE mostrar (mesmo concluída)
    if (task.recurrence_rule) return true;
    // Caso contrário, ocultar se completada
    return !task.is_completed;
  });
}
```

**Arquivo:** `src/components/TaskCard.tsx`

Garantir que ao marcar tarefa recorrente como concluída:
1. Define `is_completed = true`
2. NÃO altera `due_date`
3. Tarefa fica visualmente riscada

O código atual já faz isso corretamente (linhas 257-306). O problema está no filtro de visibilidade.

**Risco:** Baixo | **Complexidade:** 3/10

---

## Detalhes Técnicos

### Arquivos a Criar
Nenhum novo arquivo necessário.

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/index.ts` | Adicionar `current_module`, `total_modules` |
| `src/components/courses/CourseCard.tsx` | Badge categoria + nova estrutura módulo/episódio |
| `src/components/courses/CourseModal.tsx` | Campos para módulos |
| `src/hooks/useCourses.ts` | CRUD com novos campos |
| `src/hooks/data/useSettings.ts` | Novos valores default |
| `src/pages/Config.tsx` | Remover campos de Diário |
| `src/lib/taskFilters.ts` | Excluir recorrentes do hideCompleted |

### Migration de Banco de Dados

```sql
-- Adicionar colunas de módulos
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS current_module integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_modules integer DEFAULT 1;
```

---

## Vantagens

1. **Cursos mais organizados:** Módulos e episódios separados refletem melhor a estrutura real de cursos online
2. **Identificação visual:** Badge de categoria facilita localizar cursos por área
3. **Configurações consistentes:** Defaults alinhados com as preferências do usuário
4. **Recorrentes previsíveis:** Comportamento uniforme para todas as tarefas recorrentes

## Desvantagens/Riscos

1. **Migration de dados:** Usuários existentes terão `current_module = 0` inicialmente
2. **Ajuste de configurações:** Usuários com settings salvos manterão valores antigos (não serão afetados pelos novos defaults)

---

## Ordem de Execução Recomendada

| # | Item | Prioridade |
|---|------|------------|
| 1 | Corrigir filtro de tarefas recorrentes | Alta |
| 2 | Atualizar defaults de configurações + remover campos Diário | Alta |
| 3 | Adicionar badge categoria em CourseCard | Média |
| 4 | Implementar sistema módulo/episódio | Média |
