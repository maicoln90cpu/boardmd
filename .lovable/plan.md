

# Plano: Corrigir Salvamento de Preferencias + Toggle por Template

## Problema 1: Preferencias nao salvam (dados voltam ao reiniciar)

### Causa Raiz

Em `NotificationPreferences.tsx` linha 28-31, o `handleSave` faz:

```typescript
updateSettings({ notifications: localNotifications }); // linha 30
await saveSettings(); // linha 31
```

O problema esta em `saveSettings()` (useSettings.ts linha 513-542). Apos chamar `flushPendingChanges()`, ele faz um **segundo** save usando `settings` da closure (linha 529):

```typescript
.update({ settings: settings as any }) // settings = valor ANTIGO da closure
```

Isso sobrescreve as alteracoes que acabaram de ser salvas por `flushPendingChanges()` com o estado antigo. Resultado: as mudancas sao gravadas por 1 instante e imediatamente revertidas.

### Solucao

Remover o save duplicado de `saveSettings()`. A funcao so precisa chamar `flushPendingChanges()`, que ja usa `settingsRef.current` (sempre atualizado). O segundo save com `settings` da closure e redundante e destrutivo.

### Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/data/useSettings.ts` | Simplificar `saveSettings` para apenas chamar `flushPendingChanges()` sem o save duplicado (linhas 519-541 removidas) |

### Codigo atual vs sugerido

**Atual (bugado):**
```typescript
const saveSettings = useCallback(async () => {
  if (!user) return;
  await flushPendingChanges(); // salva com settingsRef (correto)
  // ... segundo save com settings da closure (SOBRESCREVE com dado antigo)
  .update({ settings: settings as any }) // settings = stale!
}, [user, settings, flushPendingChanges]);
```

**Sugerido (corrigido):**
```typescript
const saveSettings = useCallback(async () => {
  if (!user) return;
  // Garante que updateSettings ja atualizou o ref
  await flushPendingChanges(); // usa settingsRef.current (sempre fresco)
  setIsDirty(false);
}, [user, flushPendingChanges]);
```

---

## Problema 2 (duvida - respondida): Desativar alertas globais vs cards individuais

Desativar "Alertas de Prazo" no menu `/notifications` **NAO** afeta lembretes configurados dentro dos cards individuais. O sistema ja implementa a logica de prioridade: `task.notification_settings` tem precedencia sobre configuracoes globais. Se a tarefa nao tem configuracao propria, ai sim usa o global. Se o global esta desativado e a tarefa nao tem config propria, nenhuma notificacao e enviada para ela.

---

## Problema 3: Toggle ativar/desativar cada template individualmente

### Situacao Atual

Os templates de notificacao nao tem campo de ativacao. Todos estao sempre ativos (se conectados ao OneSignal) ou inativos (se apenas locais). Nao ha como desativar um template especifico.

### Solucao

Adicionar campo `enabled` (boolean, default `true`) na interface `NotificationTemplate`. Na UI do editor de templates, adicionar um Switch ao lado de cada template na lista. Nos locais que disparam notificacoes, verificar `template.enabled !== false` antes de enviar.

### Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/defaultNotificationTemplates.ts` | Adicionar `enabled?: boolean` na interface `NotificationTemplate` (default true) |
| `src/components/NotificationTemplatesEditor.tsx` | Adicionar Switch de ativar/desativar por template na lista lateral; mostrar badge "Desativado" quando off |
| `src/lib/notifications/oneSignalNotifier.ts` | Antes de enviar, verificar se o template do tipo esta enabled |
| `src/hooks/useDueDateAlerts.ts` | Verificar `template.enabled !== false` antes de disparar push/toast |

### Detalhe da UI

Na lista de templates (ScrollArea), adicionar um Switch compacto no canto direito de cada item. Quando desativado:
- O item fica com opacidade reduzida
- Badge muda para "Desativado" (cinza)
- O template nao e usado para enviar notificacoes

---

## Analise de Impacto

| Item | Risco | Complexidade |
|------|-------|-------------|
| Corrigir saveSettings (stale closure) | Baixo | 2/10 |
| Toggle por template | Baixo | 3/10 |
| **Total** | **Baixo** | **5/20 - Abaixo do limite seguro** |

### Vantagens
- Preferencias finalmente persistem corretamente entre dispositivos e recarregamentos
- Controle granular sobre quais tipos de notificacao estao ativos
- Zero alteracao destrutiva: templates existentes mantem `enabled: true` por padrao

### Desvantagens
- Nenhuma funcionalidade removida
- Complexidade adicional minima

## Checklist de Testes Manuais

### Salvamento de preferencias:
- [ ] Ir em /notifications > Preferencias
- [ ] Alterar qualquer configuracao (ex: Antecedencia do alerta para 6 horas)
- [ ] Clicar em "Salvar Preferencias"
- [ ] Recarregar a pagina (F5)
- [ ] Verificar que a alteracao foi mantida (6 horas, nao voltou para valor antigo)
- [ ] Testar em outro dispositivo e confirmar sincronizacao

### Toggle de templates:
- [ ] Ir em /notifications > Templates
- [ ] Desativar um template (ex: "Nova Tarefa")
- [ ] Salvar alteracoes
- [ ] Criar uma nova tarefa
- [ ] Verificar que a notificacao "Nova Tarefa" NAO foi disparada
- [ ] Reativar o template e verificar que volta a funcionar

