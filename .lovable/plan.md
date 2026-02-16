

# Plano: Corrigir OneSignal + VAPID Push Notifications

## Diagnostico Completo

### 1. OneSignal fica carregando infinitamente

**Causa raiz:** O OneSignal esta sendo inicializado APENAS via `react-onesignal` package, mas o OneSignal recomenda usar o script CDN oficial + `window.OneSignalDeferred`. A abordagem via package pode falhar silenciosamente quando o dominio nao e o esperado. Alem disso, o `index.html` tem apenas um comentario dizendo "initialized via react-onesignal package only" mas nao tem o script CDN.

**Correcao:**
- Adicionar o script CDN oficial do OneSignal v16 no `index.html` conforme recomendado
- Substituir a inicializacao via `react-onesignal` pelo metodo `window.OneSignalDeferred` (conforme codigo enviado pelo usuario)
- Atualizar `oneSignalProvider.ts` para usar `window.OneSignal` em vez de importar o package
- Atualizar dominio de verificacao para `board.infoprolab.com.br`
- Extrair e copiar o arquivo `OneSignalSDKWorker.js` do ZIP enviado para `public/`

### 2. Botoes de teste ao lado do Ativar

**Situacao atual:** Os botoes "Testar" so aparecem quando o push JA esta ativo. Quando inativo, so aparece "Ativar".

**Correcao no `PushProviderSelector.tsx`:**
- Manter botao "Testar" sempre visivel (ao lado de Ativar ou Desativar)
- VAPID: botao testa enviando via edge function `send-vapid-push`
- OneSignal: botao testa enviando via edge function `send-onesignal`
- Layout: `[Ativar] [Testar]` quando inativo, `[Desativar] [Testar]` quando ativo

### 3. Erro "Nao foi possivel ativar o push direto" (VAPID)

**Causa raiz:** O `sw-push.js` esta registrado com scope `/push/`. Quando a pagina esta em `/notifications` ou qualquer outra rota, o SW com scope `/push/` NAO controla aquela pagina. O `PushManager.subscribe()` falha porque precisa de um SW que controle a pagina atual.

**Correcao:**
- Remover o scope restritivo do `swPushRegistration.ts` - registrar sem scope especifico (usa `/` por padrao quando o arquivo esta na raiz)
- Manter fallback para `navigator.serviceWorker.ready`
- Melhorar logs de erro no `useVapidPush.ts`

### 4. Checklist de configuracao OneSignal

**Adicionar secao de diagnostico** no card OneSignal do `PushProviderSelector.tsx`:
- App ID
- Dominio configurado
- Status do Service Worker
- Permissao do navegador
- Subscription ID
- External User ID

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|----------|
| `index.html` | Adicionar script CDN OneSignal v16 + `OneSignalDeferred` init |
| `public/OneSignalSDKWorker.js` | Substituir pelo arquivo oficial do ZIP (v16 Service Worker) |
| `src/lib/push/oneSignalProvider.ts` | Usar `window.OneSignal` em vez de `react-onesignal`; verificar dominio `board.infoprolab.com.br`; adicionar event listeners |
| `src/hooks/useOneSignal.ts` | Adicionar `initError` state; expor diagnostico |
| `src/lib/push/swPushRegistration.ts` | Remover scope `/push/` - registrar com scope padrao `/` |
| `src/hooks/useVapidPush.ts` | Melhorar error handling com mensagens descritivas |
| `src/components/PushProviderSelector.tsx` | Botoes de teste sempre visiveis; secao de diagnostico OneSignal |
| `onedoc.md` | Atualizar com dominio correto `board.infoprolab.com.br` |

---

## Detalhes Tecnicos

### index.html - Script OneSignal (conforme recomendado)
```text
Adicionar no <head>:
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "36035405-9aa5-4e4f-b6cf-237d873bcd47",
    });
  });
</script>
```

### oneSignalProvider.ts - Refatoracao
```text
- Remover import do 'react-onesignal'
- Usar window.OneSignal (ja inicializado pelo script no HTML)
- Verificar se estamos em board.infoprolab.com.br ou localhost
- Se OneSignal nao existir no window, retornar false com erro claro
- Manter todos os utils usando window.OneSignal
```

### swPushRegistration.ts - Correcao de scope
```text
Antes:  register('/sw-push.js', { scope: '/push/' })
Depois: register('/sw-push.js')  // scope padrao '/' 
```

### PushProviderSelector.tsx - Nova UI
```text
VAPID:
  [Badge: Ativo/Inativo]
  [Ativar/Desativar] [Testar]  <-- teste sempre visivel

OneSignal:
  [Badge: Inicializado/Nao] [Badge: Ativo/Inativo]  
  [Ativar/Desativar] [Testar]  <-- teste quando inicializado
  
  --- Diagnostico ---
  App ID: 36035...47
  Dominio: board.infoprolab.com.br
  Permissao: granted/denied/default
  SW OneSignal: Encontrado/Nao
  Subscription: abc123 / N/A
```

---

## Analise de Impacto

| Item | Risco | Complexidade (0-10) |
|------|-------|---------------------|
| Migrar OneSignal para script CDN | Baixo | 3 |
| Correcao scope SW VAPID | Baixo | 2 |
| Botoes de teste | Baixo | 2 |
| Diagnostico OneSignal | Baixo | 3 |
| **Total** | | **10/40 - Abaixo do limite seguro** |

---

## Checklist de Testes Manuais

- [ ] OneSignal inicializa sem ficar carregando infinitamente
- [ ] Badge mostra "Inicializado" quando no dominio correto
- [ ] Badge mostra mensagem clara quando fora do dominio (preview)
- [ ] Botao "Ativar" OneSignal funciona e inscreve o usuario
- [ ] Botao "Testar" OneSignal envia notificacao com sucesso
- [ ] Botao "Ativar" VAPID funciona sem erro de scope
- [ ] Botao "Testar" VAPID envia notificacao com sucesso
- [ ] Secao de diagnostico mostra dados corretos do OneSignal
- [ ] Console sem erros relacionados a push/OneSignal
- [ ] Testar em board.infoprolab.com.br (producao)

