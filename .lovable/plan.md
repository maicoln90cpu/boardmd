
# Plano: Corrigir Todas as Integrações Push do Sistema

## Diagnóstico Completo

### Tabela de Disparos por Tipo de Notificação

| Template | Disparos iOS | Disparos Local | Disparos Browser | Status |
|----------|-------------|---------------|-----------------|--------|
| `due_early` | 1 (sent_fallback) | Sim | Sim | FUNCIONANDO |
| `due_warning` | 0 | Sim | Sim | FUNCIONANDO (recém-conectado) |
| `due_urgent` | 0 | Sim | Sim | FUNCIONANDO (recém-conectado) |
| `due_overdue` | 0 | Sim | Sim | FUNCIONANDO (recém-conectado) |
| `task_completed` | 0 | 0 | 0 | QUEBRADO - nunca dispara |
| `achievement_level` | 0 | 0 | 0 | RARO mas funcional |
| `achievement_streak` | 0 | 0 | 0 | QUEBRADO - streak nunca atualiza |
| `achievement_milestone` | 0 | 0 | 0 | NAO CONECTADO |
| `task_created` | 0 | 0 | 0 | NAO CONECTADO (por design) |
| `task_assigned` | 0 | 0 | 0 | NAO CONECTADO (single-user) |
| `system_update` | 0 | 0 | 0 | NAO CONECTADO (visual) |
| `system_backup` | 0 | 0 | 0 | NAO CONECTADO |
| `system_sync` | 0 | 0 | 0 | NAO CONECTADO |
| `test` | 4 sent + 1 fallback | - | - | FUNCIONANDO |

### Causa Raiz de Cada Falha

**1. `task_completed` - NUNCA DISPARA**
O código OneSignal está em `useTasks.ts` linha 348, dentro de `updateTask()`. Porém, ao clicar no checkbox da tarefa, o `TaskCard.tsx` (linha 336) e o `MobileKanbanView.tsx` (linha 77) fazem update DIRETO ao Supabase (`supabase.from("tasks").update()`), contornando completamente `updateTask()`. O OneSignal nunca é chamado.

**2. `achievement_streak` - STREAK SEMPRE 0**
A função `updateStreak()` existe em `useUserStats.ts` (linha 108) mas é exportada e NUNCA importada ou chamada em nenhum componente. O campo `current_streak` no banco está em 0 desde sempre. Logo, a condição `newStreak % 5 === 0` nunca é atingida.

**3. `achievement_level` - FUNCIONAL MAS RARO**
Esse funciona quando ocorre. O usuário está no nível 36 (3550 pontos). A notificação só dispara quando `newLevel > stats.level`, ou seja, ao atingir um novo múltiplo de 100 pontos. Como `addTaskCompletion()` é chamada via `onAddPoints`, funciona - mas só a cada 10 tarefas completas.

---

## Solução

### Correção 1: `task_completed` no TaskCard.tsx

Adicionar chamada ao `oneSignalNotifier.send()` diretamente no `executeToggleCompleted()` após o update bem-sucedido ao Supabase:

**Arquivo:** `src/components/TaskCard.tsx`

No bloco de "comportamento padrão" (linha 328-377), após `if (checked && onAddPoints)` (linha 342), adicionar:

```typescript
if (checked && onAddPoints) {
  onAddPoints();
}

// Push notification via OneSignal para task_completed
if (checked) {
  import("@/lib/notifications/oneSignalNotifier").then(({ oneSignalNotifier }) => {
    // Pegar user_id da sessão
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        oneSignalNotifier.send({
          user_id: data.user.id,
          title: '✅ Tarefa Concluída!',
          body: `"${task.title}" foi concluída`,
          notification_type: 'task_completed',
          url: '/',
        });
      }
    });
  });
}
```

Também adicionar no bloco de recorrente com reset imediato (linha 274-326), após o `onAddPoints()`.

### Correção 2: `task_completed` no MobileKanbanView.tsx

Mesmo fix no `handleSwipeComplete` (linha 73-104):

```typescript
if (newCompleted && onAddPoints) {
  onAddPoints();
}

// Push via OneSignal
if (newCompleted) {
  supabase.auth.getUser().then(({ data }) => {
    if (data?.user) {
      oneSignalNotifier.send({
        user_id: data.user.id,
        title: '✅ Tarefa Concluída!',
        body: `"${task.title}" foi concluída`,
        notification_type: 'task_completed',
        url: '/',
      });
    }
  });
}
```

### Correção 3: Conectar `updateStreak` ao fluxo de conclusão

Chamar `updateStreak(true)` no `KanbanBoard.tsx` junto com `addTaskCompletion`. Como `addTaskCompletion` já é passado como `onAddPoints`, criar uma função wrapper que chama ambos:

**Arquivo:** `src/components/KanbanBoard.tsx`

Onde hoje tem:
```typescript
const { addTaskCompletion } = useUserStats();
```

Mudar para:
```typescript
const { addTaskCompletion, updateStreak } = useUserStats();

const handleTaskCompleted = useCallback(() => {
  addTaskCompletion();
  updateStreak(true);
}, [addTaskCompletion, updateStreak]);
```

E substituir todas as referências `addTaskCompletion` por `handleTaskCompleted` no JSX.

### Correção 4: Simplificar - import direto no TaskCard

Em vez de dynamic import, importar `oneSignalNotifier` no topo do `TaskCard.tsx` e `useAuth` para obter o user:

```typescript
import { oneSignalNotifier } from "@/lib/notifications/oneSignalNotifier";
import { useAuth } from "@/contexts/AuthContext";
```

E no componente:
```typescript
const { user } = useAuth();
```

Assim a chamada fica limpa:
```typescript
if (checked && user) {
  oneSignalNotifier.send({
    user_id: user.id,
    title: '✅ Tarefa Concluída!',
    body: `"${task.title}" foi concluída`,
    notification_type: 'task_completed',
    url: '/',
  });
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/TaskCard.tsx` | Importar `oneSignalNotifier` + `useAuth`, adicionar push nos 2 caminhos de conclusão |
| `src/components/kanban/MobileKanbanView.tsx` | Importar `oneSignalNotifier`, adicionar push no swipe complete |
| `src/components/KanbanBoard.tsx` | Extrair `updateStreak` do `useUserStats`, criar wrapper `handleTaskCompleted` |

---

## Análise de Impacto

| Item | Risco | Complexidade |
|------|-------|-------------|
| Push no TaskCard.tsx | Baixo | 2/10 |
| Push no MobileKanbanView.tsx | Baixo | 1/10 |
| Conectar updateStreak | Baixo | 2/10 |
| **Total** | **Baixo** | **5/30 - Abaixo do limite seguro** |

- Nenhuma lógica existente é alterada
- Apenas ADICIONA chamadas OneSignal em caminhos que já funcionam
- Streak passa a ser atualizado quando era ignorado

---

## Checklist de Testes Manuais

### task_completed:
- [ ] No desktop, clicar checkbox de uma tarefa para concluir
- [ ] Verificar se push "Tarefa Concluída!" chega no iOS
- [ ] Verificar na tabela `push_logs` se aparece registro com `notification_type: task_completed`
- [ ] No mobile, fazer swipe para concluir tarefa
- [ ] Verificar se push também chega via swipe
- [ ] Desmarcar tarefa e confirmar que push NÃO é enviado ao desmarcar

### achievement_streak:
- [ ] Concluir uma tarefa hoje (streak deve ir para 1)
- [ ] Verificar no banco `user_stats` se `current_streak` foi atualizado
- [ ] Após 5 dias consecutivos, verificar se push "Sequência de 5 dias!" chega

### achievement_level:
- [ ] Concluir 10 tarefas para acumular 100 pontos e subir de nível
- [ ] Verificar se push "Nível X alcançado!" chega no iOS
