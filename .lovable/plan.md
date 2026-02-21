
# Plano: Conectar Alertas de Prazo ao OneSignal

## Diagnostico Completo

### Causa Raiz
O hook `usePushNotifications.ts` que contem toda a logica de envio via OneSignal para templates de prazo (due_overdue, due_urgent, due_warning, due_early) **nunca e importado ou usado** em nenhum lugar da aplicacao. E codigo morto.

O hook que REALMENTE roda e o `useDueDateAlerts.ts`, chamado em `Index.tsx` linha 50. Este hook:
- Usa `new Notification()` (notificacao local do navegador) — so aparece no browser atual
- Usa `toast()` para feedback visual
- **Nunca chama** `oneSignalNotifier.send()` nem a edge function `send-onesignal`

### Por que o teste funciona mas automaticos nao
| Fluxo | Caminho | Resultado |
|-------|---------|-----------|
| Botao "Testar" | `useOneSignal.sendTestNotification()` -> edge function -> OneSignal API | Chega no iOS |
| Due date alerts | `useDueDateAlerts` -> `new Notification()` | So browser local |
| Task completed | `useTasks.ts` -> `oneSignalNotifier.send()` -> edge function | Deveria funcionar |
| Achievements | `useUserStats.ts` -> `oneSignalNotifier.sendAchievement()` -> edge function | Deveria funcionar |

### Evidencia no banco
A tabela `push_logs` contem APENAS registros do tipo `test` e `test_task_created`. Zero registros de `due_overdue`, `due_urgent`, `due_warning` ou `due_early` — confirmando que a edge function nunca e chamada para alertas de prazo.

---

## Solucao

Modificar o `useDueDateAlerts.ts` para chamar `oneSignalNotifier.send()` quando o usuario estiver inscrito no OneSignal, ALEM da notificacao local e toast que ja existem.

### Alteracoes no `src/hooks/useDueDateAlerts.ts`

1. Importar `oneSignalNotifier` e `supabase`
2. Buscar o `user` atual uma vez no inicio do check
3. Em cada nivel de alerta (overdue, urgent, warning, early), APOS o toast e a notificacao local, chamar `oneSignalNotifier.send()` com o template correto e dados da tarefa
4. Usar `formatNotificationTemplate()` para respeitar os templates editados pelo usuario

### Codigo atual vs proposto (para cada nivel de alerta)

**Atual (apenas local):**
```typescript
toast({ title: "Tarefa Atrasada!", description: "..." });
showBrowserNotification("Tarefa Atrasada!", "...", true);
```

**Proposto (local + OneSignal):**
```typescript
toast({ title: "Tarefa Atrasada!", description: "..." });
showBrowserNotification("Tarefa Atrasada!", "...", true);

// Push via OneSignal (chega em todos os dispositivos incluindo iOS)
if (user) {
  const template = getTemplateById(userTemplates, 'due_overdue');
  if (template) {
    const formatted = formatNotificationTemplate(template, { taskTitle: task.title });
    oneSignalNotifier.send({
      user_id: user.id,
      title: formatted.title,
      body: formatted.body,
      notification_type: 'due_overdue',
      url: '/',
      data: { taskId: task.id },
    });
  }
}
```

### Aplicar para todos os 4 niveis:
- `overdue` -> template `due_overdue`
- `urgent` -> template `due_urgent`
- `warning` -> template `due_warning`
- `early` -> template `due_early`

### Arquivo `usePushNotifications.ts`
Manter como esta (nao deletar ainda), pois contem logica de WhatsApp que pode ser reaproveitada futuramente. Mas o envio OneSignal agora sera feito pelo `useDueDateAlerts`.

---

## Analise de Impacto

| Item | Risco | Complexidade |
|------|-------|-------------|
| Adicionar OneSignal ao useDueDateAlerts | Baixo | 3/10 |
| **Total** | **Baixo** | **3/30 - Abaixo do limite seguro** |

- Nenhuma logica existente e removida (toast e notificacao local continuam)
- Apenas ADICIONA a chamada ao OneSignal
- Templates editados pelo usuario serao respeitados
- Dedup existente (notifiedTasksRef + snooze) continua funcionando e previne chamadas duplicadas ao OneSignal

---

## Checklist de Testes Manuais

- [ ] Criar tarefa com prazo para daqui a 30 minutos
- [ ] Aguardar alerta de "Prazo Proximo" aparecer como toast no browser
- [ ] Verificar se a mesma notificacao chega no iOS via push
- [ ] Verificar na tabela `push_logs` se aparece registro com `notification_type: 'due_warning'`
- [ ] Criar tarefa com prazo ja passado e recarregar a pagina
- [ ] Verificar se push "Tarefa Atrasada" chega no iOS
- [ ] Confirmar que o snooze funciona (nao envia duplicata dentro do periodo configurado)
