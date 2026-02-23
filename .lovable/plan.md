
# Plano: Correção de Notificações + Descrições de Templates + Auditoria Completa

## Problema 1: Notificações disparam mesmo com alertas desativados (CRITICO)

### Causa raiz (2 bugs):

**Bug A:** O efeito principal em `useDueDateAlerts.ts` (linha 160) tem dependencias `[tasks, settings.notificationTemplates]` mas NAO inclui `settings.notifications.dueDate`. Quando o usuario desativa os alertas, o efeito NAO re-executa, e o `setInterval` antigo continua rodando e disparando notificacoes.

**Bug B:** Dentro de `checkDueDates` (linha 189), o codigo le `settingsRef.current` mas NUNCA verifica `currentSettings.dueDate` novamente. Mesmo que o ref esteja atualizado, a funcao nao checa se deve parar.

### Correcao em `src/hooks/useDueDateAlerts.ts`:

1. Adicionar `settings.notifications.dueDate` ao array de dependencias do efeito (linha 400)
2. Adicionar guard `if (!currentSettings.dueDate) return;` dentro de `checkDueDates` como seguranca extra

**Antes (linha 400):**
```
}, [tasks, settings.notificationTemplates]);
```
**Depois:**
```
}, [tasks, settings.notificationTemplates, settings.notifications.dueDate]);
```

**Antes (dentro de checkDueDates, ~linha 191):**
```
const currentSettings = settingsRef.current;
const excludedColumns = currentSettings.excludedPushColumnIds || [];
```
**Depois:**
```
const currentSettings = settingsRef.current;
if (!currentSettings.dueDate) return;
const excludedColumns = currentSettings.excludedPushColumnIds || [];
```

---

## Problema 2: Variavel `{{timeRemaining}}` vazia nas notificacoes push

### Causa raiz:
A funcao `sendOneSignalPush` (linha 196) chama `formatNotificationTemplate(template, { taskTitle })` passando APENAS `taskTitle`. A variavel `timeRemaining` nunca e passada, resultando em mensagens como "vence em" sem completar o texto.

### Correcao em `src/hooks/useDueDateAlerts.ts`:

Alterar a assinatura de `sendOneSignalPush` para aceitar `timeRemaining` e passa-lo ao `formatNotificationTemplate`.

**Antes:**
```typescript
const sendOneSignalPush = async (templateId, taskTitle, taskId, level) => {
  ...
  const formatted = formatNotificationTemplate(template, { taskTitle });
```
**Depois:**
```typescript
const sendOneSignalPush = async (templateId, taskTitle, taskId, level, timeRemaining?: string) => {
  ...
  const vars: Record<string, string> = { taskTitle };
  if (timeRemaining) vars.timeRemaining = timeRemaining;
  const formatted = formatNotificationTemplate(template, vars);
```

Todas as chamadas de `sendOneSignalPush` serao atualizadas para passar o `timeRemaining` correto:
- `overdue`: sem timeRemaining (nao usa)
- `urgent`: "menos de 1 hora"
- `warning`: "X hora(s)"
- `early`: "X horas"

---

## Problema 3: Templates sem descricao da logica de disparo

### Correcao em `src/lib/defaultNotificationTemplates.ts`:

Adicionar campo `description` na interface `NotificationTemplate` com texto explicativo para cada template:

| Template | Descricao |
|---|---|
| `task_created` | "Disparado ao criar uma nova tarefa no kanban." |
| `task_completed` | "Disparado ao marcar uma tarefa como concluida." |
| `task_assigned` | "Disparado quando uma tarefa e atribuida a voce." |
| `due_overdue` | "Disparado quando o prazo da tarefa ja expirou. Aparece como alerta urgente." |
| `due_urgent` | "Disparado quando faltam menos de 1 hora para o vencimento. Alerta de acao imediata." |
| `due_warning` | "Disparado quando faltam X horas para o vencimento (configuravel em Preferencias). Alerta moderado." |
| `due_early` | "Disparado quando faltam o dobro das horas configuradas. Alerta preventivo de planejamento." |
| `system_update` | "Disparado quando uma nova versao do app esta disponivel." |
| `system_backup` | "Disparado apos backup automatico dos dados." |
| `system_sync` | "Disparado apos sincronizacao entre dispositivos." |
| `achievement_streak` | "Disparado ao manter uma sequencia de dias consecutivos completando tarefas." |
| `achievement_milestone` | "Disparado ao atingir um marco de tarefas completadas (ex: 50, 100)." |
| `achievement_level` | "Disparado ao subir de nivel no sistema de gamificacao." |

### Correcao em `src/components/NotificationTemplatesEditor.tsx`:

Exibir o campo `description` abaixo do nome de cada template na lista, como texto explicativo em cinza.

---

## Auditoria Completa da Pagina de Notificacoes

### Problemas encontrados e correcoes:

| Item | Status | Acao |
|---|---|---|
| Alertas disparam com toggle OFF | BUG CRITICO | Corrigir deps do useEffect + guard |
| `{{timeRemaining}}` vazio em push | BUG | Passar variavel ao formatar |
| Templates sem descricao | MELHORIA | Adicionar campo description |
| OneSignal: dominio antigo no Firefox | CACHE | Usuario deve limpar cache do Firefox (a notificacao mostra "board.infoprolab.com.br" porque foi cacheada antes da mudanca) |
| NotificationPreferences: save funciona | OK | Nenhuma alteracao |
| NotificationHistory: carrega logs | OK | Nenhuma alteracao |
| PushProviderSelector: diagnostico | OK | Nenhuma alteracao |
| Templates editor: toggle on/off | OK | Nenhuma alteracao |
| Templates editor: teste push | OK | Nenhuma alteracao |
| WhatsApp tab | OK | Nenhuma alteracao |
| Chamadas duplicadas | OK | useDueDateAlerts so e chamado em Index.tsx (1 vez) |
| Tabs sobrepostas | OK | Layout correto |

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteracao |
|---|---|
| `src/hooks/useDueDateAlerts.ts` | Corrigir deps, guard interno, passar timeRemaining |
| `src/lib/defaultNotificationTemplates.ts` | Adicionar campo `description` a interface e a cada template |
| `src/components/NotificationTemplatesEditor.tsx` | Exibir `description` na lista de templates |

## Analise de Impacto

| Item | Risco | Complexidade |
|---|---|---|
| Corrigir deps do useEffect | Baixo | 2/10 |
| Guard interno em checkDueDates | Baixo | 1/10 |
| Passar timeRemaining ao push | Baixo | 2/10 |
| Adicionar description aos templates | Baixo | 2/10 |
| Exibir description no editor | Baixo | 1/10 |
| **Total** | **Baixo** | **8/50 - Bem abaixo do limite seguro** |

### Vantagens
- Corrige bug critico de notificacoes disparando quando desabilitadas
- Corrige texto incompleto "vence em" nas push notifications
- Cada template agora explica exatamente quando e disparado
- Nota sobre Firefox: o dominio antigo e cache do SW - orientar usuario a limpar

### Desvantagens
- Nenhuma significativa

## Nota sobre "board.infoprolab.com.br" no Firefox

A notificacao do Firefox mostra "via board.infoprolab.com.br" porque o Service Worker antigo ainda esta cacheado naquele navegador. A correcao do dominio ja foi aplicada no codigo. O usuario deve:
1. Abrir `board.infoprolab.com.br` no Firefox
2. Ir em Configuracoes do Site > Limpar dados
3. Ou desregistrar o Service Worker em `about:serviceworkers`

## Checklist de Testes Manuais

- [ ] Desativar "Notificacoes de prazo" em Preferencias e salvar
- [ ] Aguardar 1 minuto - NAO devem aparecer notificacoes de prazo
- [ ] Reativar e verificar que voltam a funcionar
- [ ] Verificar que notificacoes push mostram texto completo (ex: "vence em 2 horas" em vez de "vence em")
- [ ] Abrir Templates e verificar que cada um tem descricao explicativa abaixo do nome
- [ ] Limpar cache do Firefox em board.infoprolab.com.br para resolver dominio antigo
