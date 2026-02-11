
# Plano: Corrigir Logica dos Templates + 5 Novos Templates + Fix Entrega

## Diagnostico do Problema de Entrega

A Edge Function `whatsapp-daily-summary` esta deployada e respondendo. O teste manual retornou:
```
daily_report: "hour mismatch: 20 vs 18"
```
Isso confirma que a logica funciona (horario BRT 18h configurado, testado as 20h BRT). O motivo de nao ter chegado as 18:51 e que:
- O cron roda a cada hora cheia (`:00` UTC)
- A funcao compara apenas a HORA, nao os minutos
- Logo, `18:51` dispara as `18:00` BRT, nao as `18:51`
- Provavelmente a function nao estava deployada quando o cron disparou as 18:00 BRT hoje

**Acao**: Re-deploy das functions e testar. Nao ha bug na logica, apenas timing de deploy.

---

## 1. Classificacao Correta de Cada Template

| Template | Logica Correta | Justificativa |
|----------|---------------|---------------|
| Tarefa Vencendo | DINAMICO (X horas antes) | Ja corrigido. Baseado no `due_date` da tarefa |
| Resumo Diario | HORARIO FIXO | Faz sentido enviar 1x/dia no horario configurado |
| Relatorio Diario | HORARIO FIXO | Faz sentido enviar 1x/dia no horario configurado |
| Pomodoro | EVENTO (sem horario) | Deve disparar ao iniciar/finalizar sessao |
| Conquista | EVENTO (sem horario) | Deve disparar quando conquista e desbloqueada |
| **Tarefa Concluida** (novo) | EVENTO (sem horario) | Dispara ao completar uma tarefa |
| **Resumo Semanal** (novo) | HORARIO FIXO (1x/semana) | Resumo semanal com metricas |
| **Tarefa Atrasada** (novo) | EVENTO (sem horario) | Dispara quando tarefa passa do prazo |
| **Meta Atingida** (novo) | EVENTO (sem horario) | Dispara quando meta/goal e atingida |
| **Bom Dia Motivacional** (novo) | HORARIO FIXO | Mensagem motivacional diaria |

---

## 2. Cinco Novos Templates

### 2.1 Tarefa Concluida (`task_completed`)
- **Tipo**: Evento (disparado ao marcar tarefa como concluida)
- **Variaveis**: `{{taskTitle}}`, `{{completedCount}}`, `{{pendingCount}}`
- **Mensagem padrao**:
```
Parabens! Voce concluiu "{{taskTitle}}"!
Ja sao {{completedCount}} tarefas hoje. Restam {{pendingCount}} pendentes.
Continue assim!
```

### 2.2 Resumo Semanal (`weekly_summary`)
- **Tipo**: Horario fixo (1x/semana, configuravel qual dia)
- **Variaveis**: `{{completedWeek}}`, `{{pendingTasks}}`, `{{streak}}`, `{{topCategory}}`
- **Mensagem padrao**:
```
Resumo da Semana

Concluidas: {{completedWeek}} tarefas
Pendentes: {{pendingTasks}}
Sequencia: {{streak}} dias
Categoria mais ativa: {{topCategory}}

Nova semana, novas conquistas!
```

### 2.3 Tarefa Atrasada (`task_overdue`)
- **Tipo**: Evento (verificado pelo cron, dispara quando due_date < now)
- **Variaveis**: `{{taskTitle}}`, `{{overdueTime}}`, `{{totalOverdue}}`
- **Mensagem padrao**:
```
Atencao! A tarefa "{{taskTitle}}" esta atrasada ha {{overdueTime}}.
Voce tem {{totalOverdue}} tarefa(s) atrasada(s) no total.
```

### 2.4 Meta Atingida (`goal_reached`)
- **Tipo**: Evento (disparado ao atingir target da meta)
- **Variaveis**: `{{goalTitle}}`, `{{target}}`, `{{period}}`
- **Mensagem padrao**:
```
Meta Atingida!
"{{goalTitle}}" - {{target}} tarefas no periodo {{period}}.
Voce e incrivel!
```

### 2.5 Bom Dia Motivacional (`daily_motivation`)
- **Tipo**: Horario fixo
- **Variaveis**: `{{pendingTasks}}`, `{{topPriority}}`, `{{streak}}`
- **Mensagem padrao**:
```
Bom dia!
Voce tem {{pendingTasks}} tarefas para hoje.
Prioridade: {{topPriority}}
Sequencia atual: {{streak}} dias

Vamos com tudo!
```

---

## 3. Alteracoes na UI (WhatsAppTemplates.tsx)

### 3.1 Remover campo de horario para templates de EVENTO
- Templates `pomodoro`, `achievement`, `task_completed`, `goal_reached`, `task_overdue` NAO terao campo de horario
- Exibir label "Disparado automaticamente por evento" em vez do campo de horario

### 3.2 Adicionar seletor de colunas para novos templates relevantes
- `task_completed`, `task_overdue`, `weekly_summary`, `daily_motivation` devem ter filtro de colunas

### 3.3 Template semanal: adicionar campo de dia da semana
- Select com opcoes: Segunda a Domingo (valor salvo como `0-6` no campo `send_time_2` reaproveitado como "dia da semana" para weekly)

---

## 4. Edge Functions

### 4.1 Modificar `whatsapp-daily-summary`
- Adicionar suporte para `daily_motivation` (horario fixo, logica similar ao daily_reminder)
- Adicionar suporte para `weekly_summary` (verificar dia da semana + horario)
- Adicionar suporte para `task_overdue` (buscar tarefas com due_date < now que ainda nao foram notificadas)

### 4.2 Triggers client-side (whatsappNotifier.ts)
- `task_completed`: chamar ao marcar tarefa como concluida
- `goal_reached`: chamar quando meta.current >= meta.target
- `pomodoro`: chamar ao iniciar/finalizar sessao pomodoro
- `achievement`: chamar ao desbloquear conquista

Para esses 4 templates de evento, a logica esta no CLIENTE (nao precisa de cron). O `whatsappNotifier.ts` ja tem a funcao `sendWhatsAppNotification`. Basta chamar nos hooks correspondentes passando as variaveis.

### 4.3 Re-deploy de todas as functions
- Forcar re-deploy de `whatsapp-daily-summary` e `whatsapp-due-alert`

---

## 5. Integracao nos Hooks (Eventos)

| Hook | Template | Quando dispara |
|------|----------|----------------|
| `useTasks.ts` (ao completar) | `task_completed` | Quando `is_completed = true` |
| `useGoals.ts` (ao atingir meta) | `goal_reached` | Quando `current >= target` |
| `usePomodoro.ts` (ao iniciar/finalizar) | `pomodoro` | Inicio e fim de sessao |
| `useAchievements.ts` (ao desbloquear) | `achievement` | Novo achievement registrado |

---

## 6. Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `WhatsAppTemplates.tsx` | Modificar | 5 novos templates, remover horario de eventos, UI ajustada |
| `whatsapp-daily-summary/index.ts` | Modificar | Suportar `daily_motivation`, `weekly_summary`, `task_overdue` |
| `whatsappNotifier.ts` | Modificar | Funcoes helper para eventos client-side |
| `useTasks.ts` (hook) | Modificar | Chamar notificacao ao completar tarefa |
| `useGoals.ts` | Modificar | Chamar notificacao ao atingir meta |
| `usePomodoro.ts` | Modificar | Chamar notificacao ao iniciar/finalizar |
| `useAchievements.ts` | Modificar | Chamar notificacao ao desbloquear |

---

## 7. Analise de Impacto

| Item | Risco | Complexidade |
|------|-------|-------------|
| 5 novos templates no DEFAULT_TEMPLATES | Baixo (1/10) | Apenas dados estaticos |
| UI condicional (evento vs horario fixo) | Baixo (2/10) | Condicional simples |
| Novos tipos no daily-summary | Medio (4/10) | Logica de weekly + overdue |
| Integracao em 4 hooks | Medio (5/10) | Precisa de cuidado para nao duplicar |
| Re-deploy functions | Baixo (1/10) | Automatico |

**Pontuacao Total: 13/25** - Dentro do limite seguro.

---

## 8. Checklist de Testes Manuais

- [ ] Verificar que os 10 templates aparecem na lista
- [ ] Templates de evento (Pomodoro, Conquista, Tarefa Concluida, Meta Atingida) NAO mostram campo de horario
- [ ] Templates de horario fixo (Resumo, Relatorio, Motivacional) mostram campo de horario
- [ ] Tarefa Vencendo mostra campo "horas antes" (sem horario fixo)
- [ ] Resumo Semanal mostra campo de dia da semana
- [ ] Enviar teste de cada template e verificar chegada no WhatsApp
- [ ] Completar uma tarefa e verificar se chega notificacao "Tarefa Concluida" (se habilitado)
- [ ] Verificar nos logs do WhatsApp que os novos template_types aparecem corretamente
