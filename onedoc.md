# OneSignal Web Push — Documentação Completa do Sistema

> Documentação técnica completa do sistema de push notifications via OneSignal.
> Inclui: setup, SDK, iOS, arquitetura interna, edge function, fluxo de identificação, troubleshooting.
> Última atualização: 2026-02-16

---

## Índice

1. [Web Push Setup — Visão Geral](#1-web-push-setup)
2. [Web SDK Setup — Guia Completo](#2-web-sdk-setup)
3. [iOS Web Push — Guia Específico](#3-ios-web-push)
4. [Checklist de Implementação](#4-checklist-de-implementação)
5. [Custom Events](#5-custom-events)
6. [Referências Rápidas](#6-referências-rápidas)
7. [Arquitetura do Sistema Atual](#7-arquitetura-do-sistema-atual)
8. [Edge Function send-onesignal — Especificação Completa](#8-edge-function-send-onesignal)
9. [Fluxo de Identificação (external_id)](#9-fluxo-de-identificação-external_id)
10. [Diagnóstico e Troubleshooting](#10-diagnóstico-e-troubleshooting)
11. [API OneSignal — Formato da Requisição](#11-api-onesignal-formato-da-requisição)

---

## 1. Web Push Setup — Visão Geral

### Requisitos
- **HTTPS obrigatório**: Web push NÃO funciona em HTTP ou em modo incógnito/privado.
- **Single origin**: Segue a Same-origin policy. Múltiplos domínios/subdomínios requerem múltiplos OneSignal apps.
- **Permissão do usuário**: O usuário deve explicitamente conceder permissão.
- **Browsers suportados**: Chrome, Firefox, Edge, Safari.
- **iOS**: Requer setup adicional (manifest.json + "Add to Home Screen").

### Configuração no Dashboard
- **Settings > Push & In-App > Web**
- **Site Name**: Nome do site e título padrão das notificações.
- **Site URL**: Deve corresponder exatamente à origin do site (sem `www.` se não configurado assim).
- **Auto Resubscribe**: Reinscreve automaticamente usuários que limparam dados do browser.
- **Default Icon URL**: Imagem PNG 256x256px quadrada.

### Auto Resubscribe
Se usuários limparem dados do browser, param de receber push. Com esta opção habilitada, ao retornarem ao site são re-inscritos automaticamente (sem novo prompt de permissão).

### Prompts de Permissão
- Usar mensagens claras que expliquem o benefício.
- Mostrar no momento certo (após engajamento).
- Usar pre-prompt antes do diálogo nativo do browser.
- Tipos: Slidedown, Category-based, Native, Subscription Bell.

### Welcome Notification
Notificação de confirmação enviada imediatamente após o usuário se inscrever. Configurável no dashboard ou via `welcomeNotification` no `OneSignal.init`.

### Usuários e Subscriptions
- Cada combinação browser/dispositivo cria uma subscription separada.
- Modo incógnito NÃO pode criar subscriptions.
- Subscriptions são anônimas até atribuição de External ID.
- **External ID**: Identificador do seu backend para unificar usuários entre dispositivos.

### Persistência
- Padrão: notificações aparecem por ~5 segundos, depois vão para Notification Center (~1 semana).
- Pode ser configurado para persistir até interação (não recomendado).

---

## 2. Web SDK Setup — Guia Completo

### Requisitos
- Website HTTPS (não funciona em HTTP ou incógnito).
- Acesso ao servidor para hospedar o service worker.
- Single origin (Same-origin policy).

### Teste Local (localhost)
- Configurar **Site URL** no dashboard com a URL exata do localhost.
- Adicionar `allowLocalhostAsSecureOrigin: true` no `OneSignal.init`.
- Chrome trata `http://localhost` e `http://127.0.0.1` como origens seguras.
- **Recomendação**: Usar um OneSignal app separado para testes.

### Service Worker

#### Arquivo Obrigatório: `OneSignalSDKWorker.js`
```javascript
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
```

#### Requisitos do SW:
- Deve estar no diretório raiz (ou path configurado no dashboard).
- Deve ser publicamente acessível na mesma origin.
- Deve ser servido com `content-type: application/javascript`.
- **NÃO pode** ser hospedado via CDN ou em origin diferente.

### Inicialização do SDK

#### Método Recomendado: CDN Script com Proteção de Domínio

```html
<!-- index.html -->
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  (function() {
    var host = window.location.hostname;
    // PROTEÇÃO: só inicializa em domínios permitidos
    if (host === 'seu-dominio.com' || host === 'localhost') {
      OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
          appId: "SEU_APP_ID",
        });
      });
    } else {
      console.log('[OneSignal] Skipped init on domain:', host);
    }
  })();
</script>
```

> **IMPORTANTE**: A proteção de domínio evita loops de carregamento em ambientes de preview (como Lovable preview URLs). Sem ela, o OneSignal pode tentar registrar SWs em domínios não configurados, causando erros em loop.

#### Sobre o React Package (`react-onesignal`)
O package `react-onesignal` está instalado mas **NÃO é usado para inicialização**. A inicialização é feita via CDN script no `index.html` para garantir que o SDK carregue antes do React. O provider TypeScript (`oneSignalProvider.ts`) apenas aguarda o SDK estar pronto e expõe utilitários.

### Identificação de Usuários

#### External ID (CRÍTICO)
```typescript
// Vincular usuário ao OneSignal — DEVE ser chamado APÓS subscriber existir
OneSignal.login("user_uuid_do_supabase");
```
- Unifica subscriptions de múltiplos dispositivos/browsers.
- **ORDEM CRÍTICA**: Chamar DEPOIS que a permissão é concedida e a subscription está ativa.
- Chamar `OneSignal.logout()` no logout.

#### Tags (Dados do Usuário)
```typescript
OneSignal.User.addTags({
  user_id: "uuid",       // Redundância para fallback de entrega
  platform: "web",
  app_version: "1.1",
});
```
- Usadas para segmentação e fallback de entrega quando external_id falha.

### Event Listeners

```typescript
// Notificação clicada
OneSignal.Notifications.addEventListener("click", (event) => { ... });

// Notificação em foreground
OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event) => { ... });

// Permissão mudou
OneSignal.Notifications.addEventListener("permissionChange", (permission) => { ... });

// Subscription mudou (IMPORTANTE para re-link no iOS)
OneSignal.User.PushSubscription.addEventListener("change", (subscription) => {
  if (subscription.current.optedIn) {
    // Re-vincular external_id aqui
  }
});
```

---

## 3. iOS Web Push — Guia Específico

### Requisitos
- **iOS/iPadOS**: 16.4 ou superior.
- **HTTPS** com design responsivo.
- **manifest.json**: Válido com `display: "standalone"`.
- **Home Screen**: App DEVE ser adicionado à tela inicial.
- **Interação do usuário**: Deve interagir antes do prompt de permissão.

### Manifest.json Obrigatório para iOS

```json
{
  "name": "Meu App",
  "short_name": "App",
  "display": "standalone",
  "start_url": "/",
  "id": "?homescreen=1",
  "icons": [
    { "src": "/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-256x256.png", "sizes": "256x256", "type": "image/png" },
    { "src": "/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Jornada do Usuário iOS (OBRIGATÓRIA)
1. Visitar site no Safari/Chrome/Edge no iOS 16.4+.
2. Tocar no botão **Compartilhar** do browser.
3. Selecionar **"Adicionar à Tela de Início"**.
4. **Abrir o app pela tela inicial** (NÃO pelo browser).
5. Interagir com o botão de inscrição → prompt nativo.

### Limitação FUNDAMENTAL do iOS
- **Service Workers são suspensos quando a PWA é fechada no iOS.**
- Push notifications no iOS PWA só são recebidas de forma confiável quando o app está **em foreground**.
- Para notificações background confiáveis no iOS, a única solução é app nativo (Capacitor/similar).

### Race Condition no iOS (CORRIGIDO)
O iOS é mais lento para criar a subscription após conceder permissão. O fluxo DEVE ser:
1. `requestPermission()` — cria o subscriber
2. `await 2000ms` — esperar subscription ativar
3. `login(userId)` — vincular external_id DEPOIS
4. `addTags()` — redundância para fallback

Ver [Seção 9](#9-fluxo-de-identificação-external_id) para detalhes.

---

## 4. Checklist de Implementação

### Essenciais
- [x] HTTPS configurado
- [x] `OneSignalSDKWorker.js` no diretório raiz com `importScripts`
- [x] `manifest.json` com `display: standalone`, `name`, `start_url`, `icons`
- [x] `<link rel="manifest">` no `<head>` do HTML
- [x] SDK inicializado via CDN script com proteção de domínio
- [x] External ID vinculado APÓS permission concedida (`OneSignal.login(userId)`)
- [x] Re-login automático via listener de subscription change
- [x] Login automático em cada carregamento de página
- [x] `target_channel: "push"` na edge function

### Recomendados
- [x] `id` no manifest.json
- [x] Ícones em 8 tamanhos: 512, 384, 256, 192, 180, 152, 120, 96
- [x] Auto Resubscribe habilitado no dashboard
- [x] Event listeners para foreground, click, subscriptionChange
- [x] Tags do usuário para segmentação e fallback
- [x] Banner "Add to Home Screen" para iOS
- [x] Edge function com fallback por tag (sem `included_segments`)

### Segurança
- [x] App ID é público (seguro no frontend)
- [x] REST API Key é PRIVADO (apenas em edge functions/backend)
- [x] Consentimento LGPD/GDPR se aplicável

---

## 5. Custom Events

### O que são?
Ações de usuário nomeadas enviadas ao OneSignal para acionar automações e Journeys.

### Enviar via SDK
```typescript
OneSignal.trackEvent("task_completed", {
  task_title: "Minha tarefa",
  category: "trabalho",
});
```

### Enviar via API (Edge Function)
```typescript
const eventPayload = {
  events: [{
    name: "task_completed",
    properties: { task_title: "...", category: "..." },
    external_id: userId,
    timestamp: new Date().toISOString(),
    idempotency_key: crypto.randomUUID(),
  }]
};

await fetch(`https://api.onesignal.com/apps/${APP_ID}/events`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${REST_API_KEY}`,
  },
  body: JSON.stringify(eventPayload),
});
```

### Tags vs Custom Events

| Feature | Tags | Custom Events |
|---------|------|---------------|
| Uso | Segmentação e personalização | Trigger Journeys |
| Retenção | Lifetime | 30+ dias |
| Formato | Key-value (strings/números) | JSON |
| Natureza | Propriedades estáticas | Ações dinâmicas |

---

## 6. Referências Rápidas

| Item | Valor/URL |
|------|-----------|
| SDK CDN | `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js` |
| SW CDN | `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js` |
| API Notifications | `https://onesignal.com/api/v1/notifications` |
| API Custom Events | `https://api.onesignal.com/apps/{app_id}/events` |
| Dashboard | `https://dashboard.onesignal.com` |
| Docs | `https://documentation.onesignal.com/docs/en/web-push-setup` |
| iOS Guide | `https://documentation.onesignal.com/docs/en/web-push-for-ios` |

---

## 7. Arquitetura do Sistema Atual

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│                                                      │
│  index.html                                          │
│  └── CDN Script + OneSignalDeferred                  │
│       └── OneSignal.init({ appId })                  │
│                                                      │
│  oneSignalProvider.ts (Provider/Utilitários)         │
│  ├── initOneSignal() — aguarda SDK, setup listeners  │
│  ├── oneSignalUtils.requestPermission()              │
│  ├── oneSignalUtils.setExternalUserId(userId)        │
│  ├── oneSignalUtils.addTags({...})                   │
│  ├── oneSignalUtils.isSubscribed()                   │
│  ├── oneSignalUtils.getDiagnostics()                 │
│  ├── oneSignalUtils.onSubscriptionChange(cb)         │
│  └── oneSignalUtils.offSubscriptionChange(cb)        │
│                                                      │
│  useOneSignal.ts (Hook React)                        │
│  ├── Init automático + login em cada carregamento    │
│  ├── subscribe() — fluxo correto com wait 2s         │
│  ├── unsubscribe()                                   │
│  ├── sendTestNotification()                          │
│  └── Listener de subscriptionChange para re-login    │
│                                                      │
│  oneSignalNotifier.ts (Notificador)                  │
│  ├── send(payload) — genérico                        │
│  ├── sendDueDateAlert(userId, title, hours)          │
│  ├── sendDailyReminder(userId, pending, overdue)     │
│  ├── sendAchievement(userId, title, points)          │
│  └── sendPomodoroComplete(userId, type)              │
│                                                      │
│  OneSignalSettings.tsx (UI)                           │
│  └── Card com status, ativar/desativar, testar       │
│                                                      │
│  useDueDateAlerts.ts                                 │
│  └── 4 níveis: early, warning, urgent, overdue       │
│                                                      │
│  useForegroundPushHandler.ts                         │
│  └── SW postMessage → toast customizado              │
│                                                      │
│  sw-push.js (Service Worker)                         │
│  └── Push handler, notification click, task actions   │
├─────────────────────────────────────────────────────┤
│                    BACKEND                           │
│                                                      │
│  Edge Function: send-onesignal                       │
│  ├── Recebe payload via supabase.functions.invoke     │
│  ├── Tenta entrega por external_id                   │
│  ├── Fallback por tag user_id (se recipients === 0)  │
│  └── Log no push_logs                                │
│                                                      │
│  Secrets:                                            │
│  ├── ONESIGNAL_APP_ID                                │
│  └── ONESIGNAL_REST_API_KEY                          │
│                                                      │
│  Tabela: push_logs                                   │
│  └── user_id, title, body, status, device_name, etc  │
└─────────────────────────────────────────────────────┘
```

### Fluxo de Dados Completo

```
Usuário clica "Ativar Notificações"
  → useOneSignal.subscribe()
    → oneSignalUtils.requestPermission()
      → Notification.requestPermission()  [Browser nativo]
      → OneSignal.User.PushSubscription.optIn()
    → await 2000ms  [Buffer para iOS]
    → oneSignalUtils.setExternalUserId(userId)
      → OneSignal.login(userId)  [Vincula external_id]
    → oneSignalUtils.addTags({ user_id, platform, app_version })
      → OneSignal.User.addTags(...)  [Redundância para fallback]

Envio de notificação:
  → oneSignalNotifier.send(payload)
    → supabase.functions.invoke('send-onesignal', { body: payload })
      → Edge Function recebe payload
      → Monta baseData (app_id, headings, contents, url, data, icons, ttl)
      → Tentativa 1: POST API com include_aliases.external_id + target_channel: "push"
      → Se recipients === 0:
        → Tentativa 2: POST API com filters [tag user_id] (SEM included_segments)
      → Log no push_logs (recipients, used_fallback, status)
```

### Arquivos e Responsabilidades

| Arquivo | Responsabilidade |
|---------|-----------------|
| `index.html` | CDN script + OneSignalDeferred + proteção de domínio |
| `public/OneSignalSDKWorker.js` | Service Worker do OneSignal (importScripts) |
| `public/sw-push.js` | Push handler customizado (foreground/background, actions) |
| `src/lib/push/oneSignalProvider.ts` | Provider: init, event listeners, utilitários, callbacks |
| `src/hooks/useOneSignal.ts` | Hook React: estado, subscribe/unsubscribe, test, auto-login |
| `src/lib/notifications/oneSignalNotifier.ts` | Notificador: send genérico + tipos específicos |
| `src/hooks/useDueDateAlerts.ts` | Alertas progressivos de due date (4 níveis) |
| `src/hooks/useForegroundPushHandler.ts` | SW → client postMessage → toast |
| `src/components/OneSignalSettings.tsx` | UI: card com status e ações |
| `src/components/AddToHomeScreenBanner.tsx` | Banner iOS para "Adicionar à Tela de Início" |
| `supabase/functions/send-onesignal/index.ts` | Edge function: entrega dupla + log |

---

## 8. Edge Function send-onesignal — Especificação Completa

### Payload de Entrada

```typescript
interface NotificationPayload {
  user_id?: string;          // UUID do usuário (Supabase auth.uid)
  title: string;             // Título da notificação
  body: string;              // Corpo da notificação
  data?: Record<string, unknown>;  // Dados extras (tipo, taskId, etc)
  url?: string;              // URL para abrir ao clicar (default: "/")
  notification_type?: string; // Tipo: test, due_date, daily_reminder, achievement, pomodoro
}
```

### Chamada a partir do Frontend

```typescript
const { data, error } = await supabase.functions.invoke('send-onesignal', {
  body: {
    user_id: user.id,
    title: '🔔 Título',
    body: 'Corpo da notificação',
    notification_type: 'test',
    url: '/',
  },
});
```

### Lógica Interna da Edge Function

1. Valida secrets (`ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`)
2. Monta `baseData`:
   ```typescript
   {
     app_id: ONESIGNAL_APP_ID,
     headings: { en: title, pt: title },
     contents: { en: body, pt: body },
     url: payload.url || '/',
     data: { ...payload.data, notification_type, timestamp },
     chrome_web_icon: '/pwa-icon.png',
     firefox_icon: '/pwa-icon.png',
     ttl: 86400,  // 24 horas
   }
   ```
3. **Se `user_id` fornecido:**
   - **Tentativa 1**: `include_aliases: { external_id: [user_id] }` + `target_channel: "push"`
   - Se `recipients === 0` ou `undefined` (sem erros): **Fallback**
   - **Tentativa 2**: `filters: [{ field: "tag", key: "user_id", relation: "=", value: user_id }]`
   - ⚠️ **NUNCA** incluir `included_segments` junto com `filters`
4. **Se `user_id` não fornecido:**
   - `included_segments: ['Subscribed Users']` (broadcast)
5. Salva log no `push_logs`

### Estratégia de Entrega Dupla

```
Tentativa 1: external_id
  ├── recipients > 0 → ✅ Sucesso
  └── recipients === 0 → Fallback
       └── Tentativa 2: tag filter
            ├── recipients > 0 → ✅ Sucesso (via fallback)
            └── recipients === 0 → ❌ Nenhum dispositivo encontrado
```

### Resposta da Edge Function

```typescript
// Sucesso
{
  success: true,
  notification_id: "uuid-da-notificacao",
  recipients: 1,
  used_fallback: false
}

// Sem destinatários
{
  success: true,
  notification_id: "uuid",
  recipients: 0,
  used_fallback: true
}
```

### Log no push_logs

```typescript
{
  user_id: payload.user_id,
  title: payload.title,
  body: payload.body,
  data: { ...payload.data, recipients, used_fallback },
  notification_type: payload.notification_type || 'onesignal',
  status: recipients > 0 ? 'sent' : 'no_recipients',
  error_message: recipients === 0 ? 'Nenhum dispositivo encontrado' : null,
  device_name: 'OneSignal',
}
```

---

## 9. Fluxo de Identificação (external_id)

### O Problema Original

O `external_id` não estava sendo vinculado aos subscribers iOS. Nos logs, TODAS as tentativas de entrega mostravam `recipients: 0`.

**Causa raiz**: `OneSignal.login(userId)` era chamado ANTES da permissão ser concedida. No iOS, o subscriber ainda não existia no momento do login, então o external_id não tinha a quem se vincular.

### A Solução: Ordem Correta

```
❌ ANTES (bugado):
  1. login(userId)         ← subscriber não existe ainda no iOS
  2. requestPermission()   ← cria subscriber, mas external_id já foi descartado
  3. wait 1500ms
  4. addTags()

✅ DEPOIS (correto):
  1. requestPermission()   ← cria o subscriber
  2. wait 2000ms           ← iOS é mais lento para criar subscription
  3. login(userId)         ← agora o subscriber existe, external_id vincula
  4. addTags()             ← tags redundantes para fallback de entrega
```

### Código do Fluxo Correto (useOneSignal.ts)

```typescript
const subscribe = async () => {
  // 1. Request permission FIRST — creates the subscriber on iOS
  const permissionGranted = await oneSignalUtils.requestPermission();
  if (!permissionGranted) return false;
  
  // 2. Wait for iOS PWA subscription to activate (iOS is slower)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 3. Confirm subscription is active
  const subscribed = await oneSignalUtils.isSubscribed();
  
  // 4. AFTER subscription exists, link external_id and tags
  const { data: { user } } = await supabase.auth.getUser();
  if (subscribed && user) {
    await oneSignalUtils.setExternalUserId(user.id);  // OneSignal.login(userId)
    await oneSignalUtils.addTags({
      app_version: '1.1',
      platform: 'web',
      user_id: user.id,  // Fallback para entrega por tag
    });
  }
  
  return subscribed;
};
```

### Re-login Automático via Subscription Change

O iOS pode criar a subscription com atraso. Um listener garante que o external_id é re-vinculado:

```typescript
// No oneSignalProvider.ts
OS.User.PushSubscription.addEventListener('change', (subscription) => {
  if (subscription.current.optedIn) {
    // Notifica callbacks registrados (useOneSignal re-faz login)
    subscriptionChangeCallbacks.forEach(cb => cb());
  }
});

// No useOneSignal.ts
useEffect(() => {
  const handleSubscriptionChange = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await oneSignalUtils.setExternalUserId(user.id);
      await oneSignalUtils.addTags({ user_id: user.id, ... });
    }
  };
  oneSignalUtils.onSubscriptionChange(handleSubscriptionChange);
  return () => oneSignalUtils.offSubscriptionChange(handleSubscriptionChange);
}, [isInitialized]);
```

### Login Automático em Cada Carregamento

No `useEffect` inicial do `useOneSignal`, após confirmar que o SDK está inicializado:

```typescript
// Vincular external_id em cada carregamento para garantir entrega
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  await oneSignalUtils.setExternalUserId(user.id);
  await oneSignalUtils.addTags({ user_id: user.id, platform: 'web', app_version: '1.1' });
}
```

---

## 10. Diagnóstico e Troubleshooting

### getDiagnostics() — Campos Retornados

```typescript
{
  'App ID': '36035...47',
  'Domínio': '✅ board.infoprolab.com.br' | '❌ dominio-errado.com',
  'SDK Carregado': '✅ Sim' | '❌ Não',
  'Permissão': 'granted' | 'denied' | 'default',
  'Service Worker': 'Encontrado' | 'Não encontrado' | 'Erro',
  'Subscription ID': 'uuid-da-subscription' | 'N/A',
  'External User ID': 'uuid-do-usuario' | 'N/A',
}
```

> Se "External User ID" mostra "N/A", o external_id NÃO está vinculado e a entrega por `include_aliases` falhará.

### Problemas Comuns e Soluções

| Problema | Causa | Solução |
|----------|-------|---------|
| `recipients: 0` nos logs | external_id não vinculado | Verificar se `login(userId)` é chamado DEPOIS da permission |
| Push não chega no iOS | App aberto pelo Safari, não pela tela inicial | Instruir usuário a abrir pela tela inicial |
| SDK não carrega | Domínio não está na lista `ALLOWED_DOMAINS` | Adicionar domínio ou testar em localhost |
| `External User ID: N/A` | login() chamado antes da subscription existir | Seguir fluxo correto (seção 9) |
| Warning "included_segments ignored" | `included_segments` misturado com `filters` | Usar APENAS `filters` no fallback |
| Push para no iOS após fechar app | SW suspenso quando PWA fechada (limitação iOS) | Informar usuário; usar app nativo para background |
| Permission "denied" | Usuário bloqueou no browser | Instruir a desbloquear via ícone de cadeado |
| Subscription muda mas external_id perde | iOS recria subscription | Listener de subscriptionChange re-faz login |

### O que Procurar nos Logs da Edge Function

```
✅ Bom:
[send-onesignal] Attempt 1 response: {"id":"uuid","recipients":1}
[send-onesignal] Log saved. Recipients: 1 Fallback: false

⚠️ Fallback ativado (funcional mas indica external_id não vinculado):
[send-onesignal] 0 recipients via external_id, trying fallback by tag user_id
[send-onesignal] Fallback response: {"id":"uuid","recipients":1}
[send-onesignal] Log saved. Recipients: 1 Fallback: true

❌ Problema (nenhum dispositivo encontrado):
[send-onesignal] Attempt 1 response: {"id":"uuid","recipients":0}
[send-onesignal] Fallback response: {"id":"uuid","recipients":0}
[send-onesignal] Log saved. Recipients: 0 Fallback: true
```

---

## 11. API OneSignal — Formato da Requisição

### Endpoint

```
POST https://onesignal.com/api/v1/notifications
```

### Headers

```
Content-Type: application/json
Authorization: Basic <REST_API_KEY>
```

> **REST_API_KEY** é PRIVADO. NUNCA expor no frontend. Usar apenas em edge functions/backend.

### Targeting por external_id (Método Primário)

```json
{
  "app_id": "36035405-9aa5-4e4f-b6cf-237d873bcd47",
  "headings": { "en": "Título", "pt": "Título" },
  "contents": { "en": "Corpo", "pt": "Corpo" },
  "include_aliases": {
    "external_id": ["uuid-do-usuario"]
  },
  "target_channel": "push",
  "url": "/",
  "data": {
    "notification_type": "test",
    "timestamp": "2026-02-16T12:00:00.000Z"
  },
  "chrome_web_icon": "/pwa-icon.png",
  "firefox_icon": "/pwa-icon.png",
  "ttl": 86400
}
```

### Fallback por Tag (Quando external_id falha)

```json
{
  "app_id": "36035405-9aa5-4e4f-b6cf-237d873bcd47",
  "headings": { "en": "Título", "pt": "Título" },
  "contents": { "en": "Corpo", "pt": "Corpo" },
  "filters": [
    { "field": "tag", "key": "user_id", "relation": "=", "value": "uuid-do-usuario" }
  ],
  "url": "/",
  "data": { ... },
  "chrome_web_icon": "/pwa-icon.png",
  "firefox_icon": "/pwa-icon.png",
  "ttl": 86400
}
```

### ⚠️ REGRAS IMPORTANTES

1. **`target_channel: "push"`** — Obrigatório quando usando `include_aliases`. Sem isso, o OneSignal pode tentar enviar por email/SMS.
2. **NUNCA misturar `included_segments` com `filters`** — O OneSignal ignora `included_segments` quando `filters` está presente e gera warning nos logs.
3. **`include_aliases` vs `include_subscription_ids`**:
   - `include_aliases` usa o external_id (UUID do seu backend) — **RECOMENDADO**
   - `include_subscription_ids` usa o ID interno do OneSignal — evitar
4. **`headings` e `contents`** — Devem incluir pelo menos a key `"en"`. A key `"pt"` é usada para usuários com idioma português.

### Respostas da API

```json
// Sucesso
{
  "id": "notification-uuid",
  "recipients": 1,
  "external_id": "uuid-do-usuario"
}

// Sem destinatários (external_id não vinculado)
{
  "id": "notification-uuid",
  "recipients": 0
}

// Erro
{
  "errors": ["...mensagem de erro..."]
}
```

### Campos do baseData na Edge Function

| Campo | Valor | Descrição |
|-------|-------|-----------|
| `app_id` | Secret `ONESIGNAL_APP_ID` | Identificador do app OneSignal |
| `headings` | `{ en: title, pt: title }` | Título em múltiplos idiomas |
| `contents` | `{ en: body, pt: body }` | Corpo em múltiplos idiomas |
| `url` | `payload.url \|\| '/'` | URL ao clicar na notificação |
| `data` | Objeto com tipo, timestamp, extras | Dados customizados |
| `chrome_web_icon` | `/pwa-icon.png` | Ícone para Chrome |
| `firefox_icon` | `/pwa-icon.png` | Ícone para Firefox |
| `ttl` | `86400` | Time-to-live: 24 horas |
| `target_channel` | `"push"` | Apenas para `include_aliases` |

---

## Notas Finais

- O sistema foi testado e confirmado funcionando em Android, Desktop e iOS (com as limitações documentadas).
- A estratégia de entrega dupla (external_id + fallback por tag) garante máxima confiabilidade.
- O re-login automático via listener de subscription change garante vinculação mesmo com delays do iOS.
- Logs completos são salvos no `push_logs` para monitoramento e debugging.
