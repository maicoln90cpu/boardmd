
# Plano: Consolidar Notificacoes, Indicadores de Templates e Correcao do Historico

## Resumo dos 4 Problemas

1. **Configuracoes de notificacao duplicadas** em `/config` (Produtividade) e `/notifications` (Preferencias)
2. **Templates sem indicador** de quais estao conectados ao OneSignal
3. **Templates de prazo** sem opcao de multiplos horarios de envio
4. **Historico mostrando erro** (`no_recipients`) para notificacoes que foram entregues com sucesso

---

## 1. Remover Notificacoes Duplicadas do /config

### Diagnostico
A aba "Produtividade" em `/config` (linhas 1074-1148) tem um card "Notificacoes de Prazo" identico ao card "Alertas de Prazo" em `/notifications` > Preferencias. Ambos controlam as mesmas settings: `dueDate`, `dueDateHours`, `checkInterval`, `snoozeMinutes`.

### Solucao
Remover o card "Notificacoes de Prazo" da aba Produtividade em `Config.tsx` (linhas 1076-1148). Manter apenas "Revisao Diaria" e "Gamificacao" nessa aba. Adicionar um link/botao "Configurar Notificacoes" que redireciona para `/notifications`.

### Arquivos
- `src/pages/Config.tsx` - remover card de notificacoes da aba Produtividade, adicionar link para /notifications

### Risco: Zero | Complexidade: 1/10

---

## 2. Indicador de Templates Conectados ao OneSignal

### Diagnostico
Dos 12 templates, os seguintes estao EFETIVAMENTE conectados ao OneSignal:

| Template | Conectado? | Onde |
|----------|-----------|------|
| `task_created` | NAO | - |
| `task_completed` | SIM | `useTasks.ts` (chamada direta, nao usa template) |
| `task_assigned` | NAO | - |
| `due_overdue` | SIM | `usePushNotifications.ts` |
| `due_urgent` | SIM | `usePushNotifications.ts` |
| `due_warning` | SIM | `usePushNotifications.ts` |
| `due_early` | SIM | `usePushNotifications.ts` |
| `system_update` | NAO | - |
| `system_backup` | NAO | - |
| `system_sync` | NAO | - |
| `achievement_streak` | SIM | `useUserStats.ts` (chamada direta) |
| `achievement_milestone` | NAO | - |
| `achievement_level` | SIM | `useUserStats.ts` (chamada direta) |

### Solucao
Adicionar um badge/indicador visual na lista de templates do `NotificationTemplatesEditor.tsx`. Para cada template, mostrar um icone verde "Push Ativo" ou cinza "Apenas local" ao lado do badge de categoria.

Criar uma constante `ACTIVE_PUSH_TEMPLATES` com os IDs dos templates que estao conectados:
```
['task_completed', 'due_overdue', 'due_urgent', 'due_warning', 'due_early', 'achievement_streak', 'achievement_level']
```

### Arquivos
- `src/components/NotificationTemplatesEditor.tsx` - adicionar indicador visual de push ativo

### Risco: Zero | Complexidade: 1/10

---

## 3. Multiplos Horarios para Templates de Prazo

### Diagnostico
Atualmente o sistema envia UMA notificacao por threshold (overdue, urgent, warning, early). O usuario quer poder configurar ate 2 notificacoes em horarios diferentes para os templates de prazo.

### Solucao
Adicionar nas preferencias de notificacao (`NotificationPreferences.tsx`) uma opcao para configurar um segundo alerta de prazo com antecedencia diferente. Isso sera armazenado em `settings.notifications.dueDateHours2` (segundo alerta).

No `usePushNotifications.ts`, ao processar tarefas, verificar se o segundo alerta esta configurado e agendar notificacao adicional nesse horario.

### Modelo de dados (settings)
```
notifications: {
  ...existentes,
  dueDateHours2: number | null,  // ex: 6 (horas antes), null = desativado
}
```

### Arquivos
- `src/hooks/data/useSettings.ts` - adicionar campo `dueDateHours2` no tipo `NotificationSettings`
- `src/components/notifications/NotificationPreferences.tsx` - adicionar campo para segundo alerta
- `src/hooks/usePushNotifications.ts` - agendar segundo alerta quando configurado

### Risco: Baixo | Complexidade: 3/10

---

## 4. Corrigir Historico Mostrando Erro Falso

### Diagnostico
Os logs no banco mostram `status: 'no_recipients'` com `error_message: 'Nenhum dispositivo encontrado para este usuario'` para TODAS as notificacoes de teste. Isso acontece porque:

1. A edge function `send-onesignal` salva `no_recipients` quando `recipients === 0`
2. Mas a notificacao pode ter sido entregue com sucesso via fallback (tag) ou o OneSignal reporta recipients=0 mesmo quando entregou (bug conhecido no iOS)
3. O historico mostra TODAS as `no_recipients` como erro vermelho

### Solucao
Duas correcoes:

**a) Na edge function:** Quando o fallback por tag funcionar (result.id existe), marcar como `sent_fallback` em vez de `no_recipients`.

**b) No componente de historico:** Tratar `no_recipients` de forma diferente - mostrar como "aviso" (amarelo) em vez de "erro" (vermelho). Tambem:
- Se o `data` do log contiver `used_fallback: true` e tiver `id`, mostrar como "Enviado (fallback)"
- Alterar a mensagem de erro para algo menos alarmante

### Arquivos
- `supabase/functions/send-onesignal/index.ts` - ajustar logica de status no log
- `src/components/notifications/NotificationHistory.tsx` - tratar `no_recipients` como aviso, nao erro

### Risco: Baixo | Complexidade: 2/10

---

## Analise de Impacto Total

| Item | Risco | Complexidade |
|------|-------|-------------|
| Remover duplicata /config | Zero | 1 |
| Indicador push nos templates | Zero | 1 |
| Segundo alerta de prazo | Baixo | 3 |
| Corrigir historico | Baixo | 2 |
| **Total** | **Baixo** | **7/40 - Abaixo do limite seguro** |

---

## Ordem de Execucao

1. Corrigir historico (edge function + componente)
2. Remover duplicata do /config
3. Adicionar indicadores nos templates
4. Implementar segundo alerta de prazo

---

## Checklist de Testes Manuais

### Duplicata removida:
- [ ] Abrir /config > Produtividade - nao deve ter card "Notificacoes de Prazo"
- [ ] Deve ter link/botao para ir a /notifications
- [ ] Abrir /notifications > Preferencias - card "Alertas de Prazo" com todas as opcoes

### Indicadores nos templates:
- [ ] Abrir /notifications > Templates
- [ ] Templates conectados (due_overdue, due_urgent, etc) devem ter badge verde "Push Ativo"
- [ ] Templates nao conectados (task_created, system_backup) devem ter badge cinza

### Segundo alerta:
- [ ] Em Preferencias, ativar segundo alerta com horario diferente
- [ ] Verificar que 2 notificacoes sao enviadas em horarios distintos

### Historico corrigido:
- [ ] Enviar notificacao de teste
- [ ] Verificar no historico - se entregue, nao deve mostrar erro vermelho
- [ ] `no_recipients` deve aparecer como aviso amarelo, nao erro
