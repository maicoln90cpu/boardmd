
# Plano: Corrigir Entrega de Notificacoes OneSignal via API

## Diagnostico Principal

### Por que as notificacoes do dashboard chegam mas as da plataforma nao?

**Causa raiz identificada nos logs da edge function:**

A resposta do OneSignal mostra:
```
{"id":"ee9c90d9-...","external_id":null}
```

- `external_id: null` = OneSignal NAO encontrou nenhum subscriber com aquele external_id
- Sem campo `recipients` = 0 destinatarios = notificacao criada mas NAO entregue a ninguem

**Por que isso acontece:**

O `OneSignal.login(userId)` (que vincula o Supabase user ID como external_id no OneSignal) so e chamado quando o usuario clica "Ativar" no card do OneSignal (`useOneSignal.ts` linha 62). Ele NAO e chamado em cada carregamento da pagina. Se o usuario:
- Ativou o OneSignal antes dessa funcionalidade existir
- Limpou cache do navegador
- O SDK reiniciou

...a vinculacao se perde. O OneSignal sabe que existe um subscriber (por isso o dashboard consegue enviar para "All Subscribers"), mas NAO sabe qual external_id pertence a ele.

**Dashboard funciona** porque envia para segmentos ("Subscribed Users") que usa o subscription ID interno do OneSignal.

**API nao funciona** porque usa `include_aliases.external_id` que requer `OneSignal.login()` ativo.

---

## Correcoes

### 1. Chamar OneSignal.login(userId) em CADA carregamento de pagina

Adicionar no `useOneSignal.ts`: apos a inicializacao bem-sucedida, verificar se o usuario esta autenticado no Supabase e chamar `OneSignal.login(userId)` automaticamente. Isso garante que o external_id esteja SEMPRE vinculado.

Atualmente (linhas 33-37):
```typescript
} else {
  await new Promise(resolve => setTimeout(resolve, 500));
  const subscribed = await oneSignalUtils.isSubscribed();
  setIsSubscribed(subscribed);
  setPermission(Notification.permission);
}
```

Proposta - adicionar login automatico:
```typescript
} else {
  // Vincular external_id em cada carregamento
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await oneSignalUtils.setExternalUserId(user.id);
  }
  await new Promise(resolve => setTimeout(resolve, 500));
  const subscribed = await oneSignalUtils.isSubscribed();
  setIsSubscribed(subscribed);
  setPermission(Notification.permission);
}
```

### 2. Adicionar log de recipients na edge function

O `send-onesignal` loga a resposta mas nao verifica o campo `recipients`. Adicionar verificacao:
- Se `recipients === 0`: logar warning e retornar erro claro ("Nenhum dispositivo encontrado para este usuario")
- Salvar `recipients` no push_logs para facilitar debug

### 3. Adicionar fallback para segmento com filtro

Se `include_aliases` resultar em 0 recipients, a edge function pode tentar um fallback usando `included_segments: ['All']` com filtro por tag `user_id`. Isso funciona se as tags foram definidas no subscribe.

### 4. Atualizar onedoc.md com documentacao de Custom Events

Anexar toda a documentacao de Custom Events fornecida ao arquivo onedoc.md.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|----------|
| `src/hooks/useOneSignal.ts` | Chamar `OneSignal.login(userId)` no init automatico |
| `supabase/functions/send-onesignal/index.ts` | Verificar `recipients`, log de warning, fallback |
| `onedoc.md` | Adicionar secao de Custom Events |

---

## Detalhes Tecnicos

### send-onesignal - Verificacao de recipients e fallback

Apos receber a resposta do OneSignal, verificar:

```text
1. Se result.recipients === 0 ou result.recipients undefined:
   - Logar warning: "0 recipients com external_id, tentando fallback por tag"
   - Tentar novamente com:
     included_segments: ['All']
     filters: [{ field: 'tag', key: 'user_id', relation: '=', value: payload.user_id }]
   - Se fallback tambem falhar, retornar erro claro
2. Salvar recipients no push_logs
```

### useOneSignal.ts - Login automatico

No init (useEffect), apos confirmar que o SDK inicializou:
1. Buscar usuario do Supabase via `supabase.auth.getUser()`
2. Chamar `oneSignalUtils.setExternalUserId(user.id)` (que faz `OneSignal.login()`)
3. Isso garante que o external_id esteja sempre atualizado

---

## Analise de Impacto

| Item | Risco | Complexidade (0-10) |
|------|-------|---------------------|
| Login automatico no init | Baixo (ja existe a funcao) | 2 |
| Verificacao de recipients | Baixo | 2 |
| Fallback por tag | Baixo | 3 |
| Atualizar onedoc.md | Zero | 1 |
| **Total** | | **8/40 - Muito abaixo do limite seguro** |

---

## Checklist de Testes Manuais

- [ ] Abrir o site em board.infoprolab.com.br e verificar no console se `[OneSignal] External user ID set:` aparece automaticamente
- [ ] Clicar "Testar" no card OneSignal e verificar se a notificacao chega no celular/desktop
- [ ] Verificar nos logs da edge function se `recipients` agora mostra valor > 0
- [ ] Verificar na tabela push_logs se o status mostra "sent" com recipients
- [ ] Testar envio de notificacao automatica (ex: criar tarefa com prazo vencido) e confirmar entrega
- [ ] Verificar que o fallback por tag funciona caso external_id falhe
