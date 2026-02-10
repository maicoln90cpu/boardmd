

# Plano Completo - Push VAPID + WhatsApp Evolution API

---

## Diagnostico do Item 1: Service Worker Push

### O que esta instalado

| Componente | Status | Observacao |
|-----------|--------|------------|
| `sw-push.js` com evento `push` | Instalado | Importado no Workbox SW via `importScripts` |
| `sw-push.js` com evento `notificationclick` | Instalado | Funcional |
| `sw-push.js` com evento `install` | NAO instalado | Nao necessario - Workbox ja faz `skipWaiting` |
| `sw-push.js` com evento `activate` | NAO instalado | Nao necessario - Workbox ja faz `clientsClaim` |
| `skipWaiting()` + `clientsClaim()` | Instalado | Configurado no `vite.config.ts` linhas 49-50 |
| OneSignal SW (`OneSignalSDKWorker.js`) | Instalado | SW SEPARADO do Workbox |
| PushManager subscribe via VAPID | NAO instalado | Apenas secrets existem, sem fluxo de subscribe |
| Edge function para enviar push VAPID | NAO existe | Precisa ser criada (`send-vapid-push`) |

### Problema Arquitetural Atual

Existem **DOIS Service Workers** registrados simultaneamente:

1. **Workbox SW** (gerado pelo vite-plugin-pwa) - scope `/`, importa `sw-push.js`
2. **OneSignalSDKWorker.js** - scope `/`, registrado pelo SDK OneSignal

O OneSignal SDK gerencia seu proprio push subscription. O `sw-push.js` dentro do Workbox SW nunca recebe eventos push do OneSignal porque o OneSignal usa seu proprio SW.

Para VAPID funcionar, o subscribe do PushManager precisa usar o **registration do Workbox SW** (que ja tem o `sw-push.js` importado), nao o do OneSignal.

---

## Solucao Proposta

### Arquitetura de Push com 3 canais

```text
+------------------+     +------------------+     +------------------+
|   OneSignal      |     |   VAPID (Web     |     |   WhatsApp       |
|   (Push via SDK) |     |   Push direto)   |     |   (Evolution API)|
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
  OneSignalSDKWorker.js    Workbox SW + sw-push.js   Edge Function
         |                        |                   (send-whatsapp)
         v                        v                        |
   API OneSignal           Edge Function                   v
                           (send-vapid-push)         Evolution API
                                                          |
                                                          v
                                                    WhatsApp do user
```

---

## Item 1 + 3: Push VAPID (reimplementacao)

### O que precisa ser feito

#### 1. Hook `useVapidPush.ts` (novo)
- Registrar push subscription usando o **Workbox SW** (`navigator.serviceWorker.ready`)
- Usar `PushManager.subscribe()` com `applicationServerKey` = VAPID_PUBLIC_KEY publica
- Salvar subscription na tabela `push_subscriptions` existente
- Nao conflita com OneSignal porque usa SW diferente

#### 2. Edge Function `send-vapid-push` (nova)
- Recebe `user_id`, `title`, `body`, `data`
- Busca subscriptions VAPID do user em `push_subscriptions`
- Usa biblioteca `web-push` (npm) para enviar via VAPID
- Usa secrets ja existentes: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`

#### 3. Ajustes no `sw-push.js`
- Adicionar `install` e `activate` listeners (para garantir ativacao imediata quando registrado standalone)
- O codigo de `push` e `notificationclick` ja esta correto

#### 4. UI - Aba "Ativar Push" reformulada
- Componente `PushProviderSelector` com duas opcoes:
  - **VAPID (Push Direto)** - sem dependencia externa, funciona com o SW do app
  - **OneSignal** - servico gerenciado com dashboard
- Ambos podem estar ativos simultaneamente
- Status individual para cada provedor (inscrito/nao inscrito)

### Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `src/hooks/useVapidPush.ts` | Criar - hook de subscribe/unsubscribe VAPID |
| `supabase/functions/send-vapid-push/index.ts` | Criar - edge function para enviar push |
| `public/sw-push.js` | Modificar - adicionar install/activate |
| `src/components/PushProviderSelector.tsx` | Criar - UI para escolher VAPID e/ou OneSignal |
| `src/pages/NotificationsDashboard.tsx` | Modificar - usar PushProviderSelector na aba config |
| `src/lib/notifications/oneSignalNotifier.ts` | Modificar - fallback para VAPID se OneSignal falhar |

---

## Item 2: WhatsApp via Evolution API

### Fluxo do Usuario

1. Acessar Notificacoes > WhatsApp (nova aba na sidebar dentro de notificacoes)
2. Configurar URL e API Key da Evolution API
3. Sistema verifica se existe instancia criada
4. Se nao existir, cria instancia e mostra QR Code para leitura
5. Apos conectado, usuario configura templates de mensagem
6. Sistema envia notificacoes via WhatsApp conforme templates

### Tabelas necessarias (migracao SQL)

```sql
-- Configuracao da instancia Evolution API por usuario
CREATE TABLE whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  instance_id text,
  phone_number text,
  is_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Templates de mensagem WhatsApp
CREATE TABLE whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_type text NOT NULL, -- 'due_date', 'daily_reminder', 'pomodoro', etc.
  message_template text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Log de mensagens enviadas
CREATE TABLE whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_type text,
  phone_number text,
  message text,
  status text DEFAULT 'pending',
  error_message text,
  sent_at timestamptz DEFAULT now()
);
```

### Edge Functions necessarias

| Function | Descricao |
|----------|-----------|
| `whatsapp-instance` | Criar/verificar/conectar instancia, retornar QR Code |
| `send-whatsapp` | Enviar mensagem via Evolution API |

### Secrets necessarios

| Secret | Descricao |
|--------|-----------|
| `EVOLUTION_API_URL` | URL base da Evolution API (ex: `https://evo.seudominio.com`) |
| `EVOLUTION_API_KEY` | API Key global da Evolution API |

### Componentes UI (novos)

| Componente | Descricao |
|-----------|-----------|
| `WhatsAppSettings.tsx` | Config principal com sub-abas |
| `WhatsAppConnection.tsx` | Conectar instancia + QR Code |
| `WhatsAppTemplates.tsx` | Editor de templates de mensagem |
| `WhatsAppLogs.tsx` | Historico de mensagens enviadas |

### Fluxo da Evolution API

1. `POST /instance/create` - criar instancia com `instanceName: "boardmd-{userId}"`
2. `GET /instance/connect/{instanceName}` - obter QR Code (retorna base64)
3. `GET /instance/connectionState/{instanceName}` - verificar se conectou
4. `POST /message/sendText/{instanceName}` - enviar mensagem de texto

### Layout da pagina WhatsApp

Dentro de NotificationsDashboard, nova aba "WhatsApp" com sub-abas:
- **Conexao** - Status da instancia, QR Code, reconectar
- **Templates** - Editar mensagens padrao (due_date, daily_reminder, etc.)
- **Historico** - Log de mensagens enviadas

---

## Resumo de alteracoes

| # | Area | Arquivos novos | Arquivos modificados | Complexidade |
|---|------|---------------|---------------------|-------------|
| 1 | VAPID Push | 3 | 3 | 6/10 |
| 2 | WhatsApp | 5 componentes + 2 edge functions | 1 (NotificationsDashboard) | 8/10 |
| 3 | Banco de dados | 1 migracao (3 tabelas + RLS) | 0 | 4/10 |

**Pontuacao Total de Risco: 18/25** - Medio-alto (principalmente pela integracao externa Evolution API).

---

## Checklist de Testes Manuais

### VAPID Push:
- [ ] Ativar VAPID Push na aba "Ativar Push"
- [ ] Verificar que subscription foi salva no banco (`push_subscriptions`)
- [ ] Enviar notificacao de teste VAPID - deve aparecer como notificacao do sistema
- [ ] Fechar o app e enviar push - deve aparecer como notificacao do SO
- [ ] Desativar VAPID e verificar que subscription foi removida

### OneSignal (regressao):
- [ ] Verificar que OneSignal continua funcionando apos adicionar VAPID
- [ ] Ativar ambos (VAPID + OneSignal) e enviar teste - ambos devem funcionar

### WhatsApp:
- [ ] Acessar Notificacoes > WhatsApp
- [ ] Inserir credenciais da Evolution API
- [ ] Criar instancia e escanear QR Code
- [ ] Verificar status "Conectado"
- [ ] Editar template de mensagem
- [ ] Enviar mensagem de teste
- [ ] Verificar historico de mensagens

