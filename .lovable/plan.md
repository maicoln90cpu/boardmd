
# Plano: Documentacao Completa - onedoc.md e pwapush.md

## Objetivo

Criar dois documentos completos:

1. **onedoc.md** - Atualizar com documentacao completa do sistema atual (OneSignal, fluxos, edge function, diagnostico, troubleshooting, e tudo que foi corrigido)
2. **pwapush.md** - Documento tecnico completo para recriar TODO o sistema PWA + Push do zero em um projeto Lovable limpo

---

## 1. onedoc.md - Atualizacoes

O documento atual tem 530 linhas com secoes 1-7. Sera reescrito completamente para incluir:

### Secoes existentes (manter e melhorar):
- Secao 1: Web Push Setup
- Secao 2: Web SDK Setup
- Secao 3: iOS Web Push
- Secao 4: Checklist de Implementacao
- Secao 5: Referencias Rapidas
- Secao 6: Custom Events
- Secao 7: Referencias Rapidas (atualizada)

### Novas secoes a adicionar:

**Secao 8: Arquitetura do Sistema Atual**
- Diagrama de componentes (provider, hook, notifier, edge function)
- Fluxo de dados completo: usuario -> subscribe -> OneSignal -> edge function -> entrega
- Arquivos envolvidos e suas responsabilidades

**Secao 9: Edge Function send-onesignal - Especificacao Completa**
- Payload de entrada completo
- Estrutura da requisicao para API OneSignal
- Estrategia de entrega dupla (external_id + fallback por tag)
- Formato da resposta
- Log no push_logs
- Campos: `target_channel: "push"`, `include_aliases`, `filters`

**Secao 10: Fluxo de Identificacao (external_id)**
- Problema original: external_id null
- Solucao: ordem correta do fluxo
- Fluxo correto: permission -> wait 2s -> login(userId) -> addTags
- Re-login automatico via subscriptionChange listener
- Login automatico em cada carregamento de pagina

**Secao 11: Diagnostico e Troubleshooting**
- Tabela de problemas comuns e solucoes
- Como verificar vinculacao do external_id
- getDiagnostics() - campos retornados
- Logs da edge function - o que procurar

**Secao 12: API OneSignal - Formato da Requisicao**
- Formato correto para iOS web push
- Campos obrigatorios: `target_channel: "push"`, `headings`, `contents`
- Diferenca entre `include_aliases` e `include_subscription_ids`
- Diferenca entre `included_segments` e `filters` (NAO misturar)
- Exemplos de payloads reais

---

## 2. pwapush.md - Documento Completo de Replicacao

Documento tecnico exaustivo com TODOS os passos para recriar o sistema inteiro em um projeto Lovable limpo. Sera organizado em ordem cronologica de implementacao.

### Estrutura do documento:

**Parte 1: Fundacao PWA**
- Dependencias necessarias (vite-plugin-pwa)
- vite.config.ts - configuracao completa do VitePWA
  - workbox settings (globPatterns, runtimeCaching, importScripts)
  - manifest inline vs arquivo separado
  - devOptions
- public/manifest.json - todos os campos, tamanhos de icones
- index.html - meta tags obrigatorias (apple-mobile-web-app-capable, theme-color, etc)
- Icones necessarios: 512, 384, 256, 192, 180, 152, 120, 96

**Parte 2: Service Worker**
- sw-push.js completo (push handler, notification click, task actions)
- Estrategia de importScripts no workbox
- Foreground vs background notification handling
- OneSignalSDKWorker.js

**Parte 3: Registro e Atualizacao do SW**
- main.tsx - registerSW com onNeedRefresh, onOfflineReady
- usePWAUpdate hook - verificar atualizacoes, limpar cache, reinstalar
- UpdateNotification component

**Parte 4: Offline First**
- offlineSync.ts - fila de operacoes no localStorage
- backgroundSync.ts - sincronizacao com retry exponencial
- Suporte a Background Sync API + fallback polling

**Parte 5: Install Prompts**
- InstallPrompt.tsx (Chrome/Android - beforeinstallprompt)
- AddToHomeScreenBanner.tsx (iOS - instrucoes visuais)
- Logica de dismissal com localStorage

**Parte 6: OneSignal Web Push - Setup**
- Criar conta e app no OneSignal dashboard
- Configurar Site URL, Auto Resubscribe, Default Icon
- CDN script no index.html com OneSignalDeferred
- Protecao de dominio (ALLOWED_DOMAINS)
- OneSignalSDKWorker.js no public/

**Parte 7: OneSignal Provider (oneSignalProvider.ts)**
- Codigo completo com explicacao linha a linha
- initOneSignal() - aguardar SDK carregar (5s timeout)
- setupEventListeners() - push click, foreground, permission, subscription change
- oneSignalUtils - todas as funcoes: requestPermission, isSubscribed, setExternalUserId, addTags, getDiagnostics, etc
- subscriptionChangeCallbacks - pattern de callback externo

**Parte 8: Hook useOneSignal**
- Codigo completo com explicacao
- Init automatico com login em cada carregamento
- Fluxo de subscribe CORRETO (ordem critica):
  1. requestPermission() - cria subscriber
  2. await 2000ms - iOS e mais lento
  3. isSubscribed() - confirmar
  4. setExternalUserId(userId) - vincular DEPOIS
  5. addTags() - redundancia para fallback
- Listener de subscription change para re-login

**Parte 9: Edge Function send-onesignal**
- Codigo completo
- Secrets necessarios: ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY
- Payload de entrada (NotificationPayload)
- Construcao do baseData
- Estrategia de entrega:
  1. Tentar por include_aliases.external_id
  2. Se recipients === 0, fallback por filters com tag user_id
  3. NUNCA misturar included_segments com filters
- Log no push_logs com recipients, used_fallback, status
- Formato EXATO da requisicao para API OneSignal

**Parte 10: Notificador Automatico (oneSignalNotifier.ts)**
- Tipos de notificacao: due_date, daily_reminder, achievement, pomodoro
- Funcao send() generica via supabase.functions.invoke
- Funcoes especificas com logica de urgencia

**Parte 11: Alertas de Due Date (useDueDateAlerts)**
- 3 niveis progressivos: early, warning, urgent, overdue
- Persistencia de estado no localStorage
- Snooze configuravel
- getTaskUrgency() como funcao pura

**Parte 12: Foreground Push Handler**
- useForegroundPushHandler hook
- Comunicacao SW -> client via postMessage
- Toast customizado em vez de notificacao do sistema

**Parte 13: Tabela push_logs (banco de dados)**
- Schema completo da tabela
- Campos: user_id, title, body, data, notification_type, status, error_message, device_name
- RLS policies

**Parte 14: iOS Especifico**
- Limitacoes de background push (SW suspenso quando fechado)
- Fluxo obrigatorio: Safari -> Add to Home Screen -> Abrir PWA -> Aceitar permissao
- Meta tags Apple no head
- Banner instrutivo (AddToHomeScreenBanner)
- Race condition no subscribe: esperar 2s apos permission

**Parte 15: Checklist Final de Implementacao**
- Ordem exata de implementacao (numerada)
- Verificacoes pos-implementacao
- Testes manuais por plataforma (Android, iOS, Desktop)

**Parte 16: Troubleshooting Completo**
- Tabela de erros comuns com solucoes
- Como debugar external_id null
- Como verificar entrega nos logs
- Como testar fallback por tag

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `onedoc.md` | Reescrever completamente (~800 linhas) |
| `pwapush.md` | Criar novo (~1500+ linhas) |

---

## Detalhes Tecnicos

### Formato do pwapush.md

O documento sera formatado como um **prompt tecnico para o Lovable**, com blocos de codigo completos, explicacoes em PT-BR, e instrucoes passo a passo. Cada secao tera:

1. **O que fazer** (instrucao clara)
2. **Por que** (justificativa tecnica)
3. **Codigo completo** (copiar e colar)
4. **Ordem de execucao** (dependencias entre passos)

### Formato da requisicao API OneSignal (sera documentado em ambos os arquivos)

```text
POST https://onesignal.com/api/v1/notifications
Headers:
  Content-Type: application/json
  Authorization: Basic <REST_API_KEY>

Body (targeting por external_id):
{
  "app_id": "<APP_ID>",
  "headings": { "en": "Titulo", "pt": "Titulo" },
  "contents": { "en": "Corpo", "pt": "Corpo" },
  "include_aliases": { "external_id": ["<USER_UUID>"] },
  "target_channel": "push",
  "url": "/",
  "data": { ... },
  "chrome_web_icon": "/pwa-icon.png",
  "ttl": 86400
}

Body (fallback por tag - SEM included_segments):
{
  "app_id": "<APP_ID>",
  "headings": { ... },
  "contents": { ... },
  "filters": [
    { "field": "tag", "key": "user_id", "relation": "=", "value": "<USER_UUID>" }
  ],
  "target_channel": "push",
  ...
}

Resposta esperada (sucesso):
{
  "id": "notification-uuid",
  "recipients": 1,
  "external_id": "<USER_UUID>"
}

Resposta com problema:
{
  "id": "notification-uuid",
  "external_id": null
  // SEM campo recipients = 0 destinatarios
}
```

---

## Analise de Impacto

| Item | Risco | Complexidade (0-10) |
|------|-------|---------------------|
| Reescrever onedoc.md | Zero (documentacao) | 4 |
| Criar pwapush.md | Zero (documentacao) | 6 |
| **Total** | **Zero risco** | **10/20** |

Nenhuma alteracao de codigo. Apenas documentacao.
