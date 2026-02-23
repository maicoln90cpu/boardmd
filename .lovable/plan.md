
# Plano: Notificações Personalizadas por Tarefa

## Resumo

Cada tarefa podera ter ate 2 lembretes proprios (com horas antes do prazo e canal: push/whatsapp). Se a tarefa nao tiver lembretes configurados, o sistema usa os horarios globais das configuracoes.

## O que muda

### 1. Banco de dados

Adicionar coluna `notification_settings` (JSONB, nullable) na tabela `tasks`:

```sql
ALTER TABLE tasks ADD COLUMN notification_settings jsonb DEFAULT NULL;
```

Estrutura do JSON:
```json
{
  "reminders": [
    { "hours_before": 24, "channel": "push" },
    { "hours_before": 2, "channel": "whatsapp" }
  ]
}
```

- `reminders`: array de ate 2 objetos
- `hours_before`: numero de horas antes do prazo (1-168)
- `channel`: "push", "whatsapp" ou "both"
- Se `notification_settings` for `null`, usa os horarios globais do sistema

### 2. Validacao (validations.ts)

Adicionar `notification_settings` ao `taskSchema`:

```typescript
notification_settings: z.object({
  reminders: z.array(z.object({
    hours_before: z.number().min(0.5).max(168),
    channel: z.enum(['push', 'whatsapp', 'both'])
  })).max(2)
}).nullable().optional()
```

### 3. Interface Task (useTasks.ts)

Adicionar campo na interface `Task`:

```typescript
notification_settings?: {
  reminders: Array<{
    hours_before: number;
    channel: 'push' | 'whatsapp' | 'both';
  }>;
} | null;
```

### 4. Modal de Tarefa (TaskModal.tsx)

Adicionar nova secao "Lembretes" no modal, logo apos o campo de Data e Horario:

- Switch "Lembretes personalizados" (desativado por padrao)
- Quando ativado, mostra ate 2 linhas de configuracao:
  - Input numerico "Horas antes" (default 24)
  - Select de canal: "Push", "WhatsApp", "Ambos"
  - Botao "+" para adicionar segundo lembrete
  - Botao "X" para remover lembrete
- Texto informativo: "Se vazio, usa as configuracoes globais do sistema"
- Secao so aparece se a tarefa tem data/horario definido

### 5. Logica de alertas (useDueDateAlerts.ts)

Alterar o calculo de thresholds no `forEach` de tarefas:

```text
ANTES:
  configuredHours = settings.notifications.dueDateHours (global)
  warningThreshold = configuredHours * 60

DEPOIS:
  SE task.notification_settings?.reminders existe e tem itens:
    Usar os horarios do task.notification_settings.reminders
    Para cada reminder, verificar se minutesUntilDue <= reminder.hours_before * 60
    Respeitar o canal configurado (push, whatsapp ou both)
  SENAO:
    Usar configuredHours global (comportamento atual)
```

A logica de dedup (pendingPushesRef, pushTimestampsRef) permanece identica.

### 6. Hook usePushNotifications.ts (legado)

Mesma alteracao: verificar `task.notification_settings` antes de usar thresholds globais.

## Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar coluna `notification_settings` jsonb na tabela `tasks` |
| `src/lib/validations.ts` | Adicionar `notification_settings` ao `taskSchema` |
| `src/hooks/tasks/useTasks.ts` | Adicionar campo na interface `Task` |
| `src/components/TaskModal.tsx` | Nova secao "Lembretes" com ate 2 configuracoes |
| `src/hooks/useDueDateAlerts.ts` | Usar `task.notification_settings` quando disponivel, senao fallback global |
| `src/hooks/usePushNotifications.ts` | Mesma logica de fallback |

## Analise de Impacto

| Item | Risco | Complexidade |
|------|-------|-------------|
| Nova coluna JSONB nullable | Baixo | 1/10 |
| Validacao Zod | Baixo | 1/10 |
| UI no TaskModal | Baixo | 3/10 |
| Logica condicional no useDueDateAlerts | Medio | 4/10 |
| **Total** | **Baixo** | **9/40 - Abaixo do limite seguro** |

### Vantagens
- Controle granular por tarefa sem afetar as demais
- Fallback automatico para configuracoes globais
- Suporte a canais diferentes por lembrete (push vs whatsapp)
- Nenhuma alteracao destrutiva: tarefas existentes continuam com `null` e usam sistema global

### Desvantagens
- Complexidade adicional mınima na logica de thresholds
- Campo JSONB pode crescer, mas com limite de 2 reminders e impacto minimo

## Checklist de Testes Manuais

### Criacao com lembrete personalizado:
- [ ] Criar tarefa com data/hora e ativar "Lembretes personalizados"
- [ ] Configurar 1 lembrete: 2 horas antes, canal Push
- [ ] Verificar que a notificacao chega 2h antes (e NAO nos horarios globais)
- [ ] Verificar na tabela `tasks` que `notification_settings` foi salvo corretamente

### Fallback para global:
- [ ] Criar tarefa com data/hora SEM lembretes personalizados
- [ ] Verificar que usa os horarios das configuracoes globais normalmente

### Edicao:
- [ ] Editar tarefa existente e adicionar lembretes personalizados
- [ ] Salvar e verificar que os lembretes foram persistidos
- [ ] Editar novamente e remover os lembretes (desativar switch)
- [ ] Verificar que volta a usar configuracoes globais

### Canal WhatsApp:
- [ ] Criar tarefa com lembrete canal "WhatsApp"
- [ ] Verificar que a notificacao chega via WhatsApp e NAO via push
- [ ] Criar tarefa com canal "Ambos" e verificar ambos os canais
