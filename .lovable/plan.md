

# Plano: Corrigir Vinculacao external_id no iOS e Melhorar Edge Function

## Diagnostico

### Problema confirmado pelo suporte OneSignal

O `external_id` NAO esta sendo vinculado aos subscribers iOS. Nos logs da edge function, TODAS as tentativas mostram `recipients: 0` tanto por `external_id` quanto por tag `user_id`.

### Causa raiz no codigo

No `useOneSignal.ts`, o fluxo de subscribe faz:

```text
1. setExternalUserId(user.id)  ← linha 72 - ANTES da permissao
2. requestPermission()          ← linha 75 - subscription ainda nao existe
3. addTags(...)                 ← linha 84 - DEPOIS, mas pode ser tarde demais no iOS
```

No iOS, o `OneSignal.login(userId)` chamado ANTES da subscription existir nao vincula nada, porque o subscriber ainda nao foi criado. O login precisa ser chamado DEPOIS que a permissao e concedida e a subscription esta ativa.

### Problema adicional na edge function

O fallback usa `included_segments: ['All']` junto com `filters`, e o OneSignal retorna warning: "included_segments are ignored since filters are set". Isso nao causa erro, mas e incorreto.

---

## Correcoes

### 1. useOneSignal.ts - Reordenar fluxo de subscribe

Mover `setExternalUserId` e `addTags` para DEPOIS da permissao ser concedida e aguardar a subscription ficar ativa:

```text
ANTES (bugado):
  1. login(userId)         ← subscriber nao existe ainda
  2. requestPermission()
  3. wait 1500ms
  4. addTags()

DEPOIS (corrigido):
  1. requestPermission()   ← cria o subscriber
  2. wait 2000ms           ← aguardar subscription ativar (iOS e mais lento)
  3. login(userId)         ← agora o subscriber existe
  4. addTags()             ← tags vinculam ao subscriber correto
```

### 2. useOneSignal.ts - Re-login apos subscription change

Adicionar um listener de `subscriptionChange` que re-chama `login(userId)` sempre que a subscription muda. Isso garante que se o iOS criar a subscription com atraso, o external_id sera vinculado.

### 3. Edge function - Remover included_segments do fallback

Remover `included_segments: ['All']` do fallback e usar apenas `filters`. Isso elimina o warning do OneSignal.

### 4. Diagnostico - Mostrar external_id real

No diagnostico, tentar obter o external_id real via `OneSignal.User.getIdentity()` ou similar para confirmar a vinculacao.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|----------|
| `src/hooks/useOneSignal.ts` | Reordenar subscribe: permissao primeiro, login depois; adicionar re-login em subscription change |
| `src/lib/push/oneSignalProvider.ts` | Adicionar callback de subscription change que re-faz login; melhorar getDiagnostics |
| `supabase/functions/send-onesignal/index.ts` | Remover `included_segments` do fallback |

---

## Detalhes Tecnicos

### useOneSignal.ts - Novo fluxo subscribe

```text
subscribe():
  1. requestPermission() + optIn()
  2. await 2000ms (iOS precisa mais tempo)
  3. verificar isSubscribed()
  4. SE subscribed:
     a. login(userId) — vincula external_id
     b. addTags({ user_id, platform, app_version })
  5. retornar resultado
```

### oneSignalProvider.ts - Listener de subscription

No `setupEventListeners`, o listener de `PushSubscription.change` ja existe mas so faz log. Adicionar logica para:
- Quando `optedIn` muda para `true`, chamar um callback registrado externamente
- O `useOneSignal` registra esse callback para re-fazer `login(userId)`

### send-onesignal - Fallback limpo

```text
ANTES:
  included_segments: ['All'],
  filters: [{ field: 'tag', key: 'user_id', ... }]

DEPOIS:
  filters: [{ field: 'tag', key: 'user_id', ... }]
```

---

## Analise de Impacto

| Item | Risco | Complexidade (0-10) |
|------|-------|---------------------|
| Reordenar subscribe | Baixo | 3 |
| Re-login em subscription change | Baixo | 2 |
| Remover included_segments | Zero | 1 |
| Melhorar diagnostico | Zero | 1 |
| **Total** | | **7/40 - Abaixo do limite seguro** |

---

## Checklist de Testes Manuais

- [ ] No iOS: adicionar site a tela inicial, abrir como PWA
- [ ] Clicar "Ativar" no card OneSignal
- [ ] Aceitar permissao de notificacao
- [ ] Verificar no diagnostico se "External User ID" mostra valor (nao "N/A")
- [ ] Clicar "Testar" e verificar se a notificacao chega no iOS
- [ ] Verificar nos logs da edge function se `recipients > 0`
- [ ] Verificar que o warning "included_segments are ignored" desapareceu dos logs
- [ ] No Android/Desktop: confirmar que o fluxo continua funcionando normalmente

