# OneSignal Web Push - Documentação Compilada

> Compilado das páginas oficiais do OneSignal em 2026-02-16.
> Fontes:
> - https://documentation.onesignal.com/docs/en/web-push-setup
> - https://documentation.onesignal.com/docs/en/web-sdk-setup
> - https://documentation.onesignal.com/docs/en/web-push-for-ios
> - https://documentation.onesignal.com/docs/en/custom-events

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

### Design de Notificações
- Suporta texto rico, imagens, botões de ação.
- Chrome suporta imagens grandes (expandir notificação para ver).
- Personalização via templates com tags do usuário.

### Comportamento de Clique
- **Exact Navigate** (padrão): Navega para URL exata se tab já aberta.
- **Origin Navigate**: Navega se a origin corresponder.
- **Exact Focus / Origin Focus**: Foca na tab sem recarregar.

### Persistência
- Padrão: notificações aparecem por ~5 segundos, depois vão para Notification Center (~1 semana).
- Pode ser configurado para persistir até interação (não recomendado, pode irritar usuários).

---

## 2. Web SDK Setup — Guia Completo

### Requisitos
- Website HTTPS (não funciona em HTTP ou incógnito).
- Acesso ao servidor para hospedar o service worker.
- Single origin (Same-origin policy).

### Tipos de Integração
1. **Typical Site** (recomendado): Dashboard configura prompts e SW.
2. **WordPress**: Plugin oficial.
3. **Custom Code**: Controle total via código.

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
- **NÃO pode** ser hospedado via CDN ou em origin diferente com redirect.

#### Configuração no Dashboard:
- **Path to service worker files**: Diretório onde o arquivo está.
- **Service worker registration scope**: Páginas onde o SW pode atuar.

### Inicialização do SDK

#### Método 1: Script Tag (Vanilla JS)
```html
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "YOUR_ONESIGNAL_APP_ID",
    });
  });
</script>
```

#### Método 2: React Package (`react-onesignal`)
```bash
npm install react-onesignal
```
```typescript
import OneSignal from 'react-onesignal';

await OneSignal.init({
  appId: "YOUR_ONESIGNAL_APP_ID",
  allowLocalhostAsSecureOrigin: true,
});
```

**IMPORTANTE**: Usar APENAS UM método de inicialização. Não misturar script tag com package React.

### Identificação de Usuários

#### External ID
```typescript
// Vincular usuário do seu backend ao OneSignal
OneSignal.login("user_123");
```
- Unifica subscriptions de múltiplos dispositivos/browsers.
- Usar sempre que o usuário fizer login.
- Chamar `OneSignal.logout()` no logout.

#### Tags (Dados do Usuário)
```typescript
OneSignal.User.addTags({
  plan: "premium",
  level: "5",
  lang: "pt-BR",
});
```
- Usadas para segmentação e personalização de mensagens.

### Event Listeners

#### Push Notification Events
```typescript
// Quando notificação é clicada
OneSignal.Notifications.addEventListener("click", (event) => {
  console.log("Notification clicked:", event);
});

// Quando notificação chega com app em foreground
OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event) => {
  // event.preventDefault(); // Opcional: impedir exibição automática
  console.log("Foreground notification:", event.notification);
  event.notification.display(); // Exibir manualmente
});
```

#### User State Changes
```typescript
// Quando permissão muda
OneSignal.Notifications.addEventListener("permissionChange", (permission) => {
  console.log("Permission changed:", permission);
});

// Quando subscription push muda
OneSignal.User.PushSubscription.addEventListener("change", (subscription) => {
  console.log("Push subscription changed:", subscription);
});
```

### Privacidade e Consentimento
```typescript
// Impedir coleta de dados até consentimento
OneSignal.setConsentRequired(true);

// Permitir coleta após consentimento
OneSignal.setConsentGiven(true);
```

---

## 3. iOS Web Push — Guia Específico

### Atualizações Importantes (2025)
- **Cross-Browser**: Push funciona em Safari, Chrome e Edge no iOS 16.4+.
- **iOS 17+**: APIs habilitadas por padrão.
- **Confiabilidade**: Podem haver problemas intermitentes onde push para de funcionar. Monitorar taxas de entrega.

### Requisitos
- **iOS/iPadOS**: 16.4 ou superior.
- **HTTPS**: Com design responsivo.
- **manifest.json**: Válido com campos corretos.
- **Home Screen**: App deve ser adicionado à tela inicial.
- **Interação do usuário**: Deve interagir antes do prompt de permissão.
- **OneSignal Service Worker**: Obrigatório.

### Manifest.json Obrigatório

#### Campos Obrigatórios:
- `name` (required): Nome completo do app.
- `display` (required): DEVE ser `"standalone"` ou `"fullscreen"`.
- `start_url` (required): URL de entrada.
- `icons` (required): Array com múltiplos tamanhos.
- `id` (recommended): Identificador único.

#### Exemplo:
```json
{
  "$schema": "https://json.schemastore.org/web-manifest-combined.json",
  "name": "My App",
  "short_name": "App",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#E54B4D",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-256x256.png", "sizes": "256x256", "type": "image/png" },
    { "src": "/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "id": "?homescreen=1"
}
```

#### Tamanhos de Ícones Recomendados:
- 192x192 (obrigatório)
- 256x256 (recomendado)
- 384x384 (recomendado)
- 512x512 (obrigatório)

### Implementação:
1. Colocar `manifest.json` no diretório raiz.
2. Adicionar `<link rel="manifest" href="/manifest.json"/>` no `<head>`.
3. Criar ícones PNG de alta qualidade nos tamanhos listados.

### Jornada do Usuário iOS (OBRIGATÓRIA)
1. Visitar site no Safari/Chrome/Edge no iOS 16.4+.
2. Tocar no botão **Compartilhar** do browser.
3. Selecionar **"Adicionar à Tela de Início"**.
4. Salvar o app no dispositivo.
5. **Abrir o app pela tela inicial** (NÃO pelo browser).
6. Interagir com o botão de inscrição para acionar prompt nativo.

### Estratégias de Onboarding para iOS
- **Banners no site**: Mostrar especificamente em dispositivos Apple mobile.
- **Guias visuais**: Screenshots e setas mostrando onde tocar.
- **Timing**: Apresentar após engajamento demonstrado.

### Testes

#### Validação do Manifest:
- Usar Chrome DevTools > Application > Manifest.
- Verificar se todos os campos obrigatórios estão presentes.
- Verificar se ícones carregam corretamente.
- Usar [Manifest Tester](https://manifesttester.com/) ou [SimiCart Generator](https://www.simicart.com/manifest-generator.html/).

#### Teste End-to-End:
1. Abrir site no Safari iOS.
2. Adicionar à Tela de Início.
3. Abrir PWA pela Tela de Início.
4. Acionar prompt de notificações.
5. Aceitar permissão.
6. Enviar notificação de teste.
7. Verificar recebimento.

#### Notas de Teste:
- Testar em dispositivo iOS real (simuladores podem não funcionar).
- Garantir que o manifest é carregado com `content-type: application/json`.
- Verificar que o service worker está acessível.

### Troubleshooting iOS
- **Push não aparece**: Verificar se o app foi aberto da Tela de Início (não do browser).
- **Prompt não aparece**: Verificar `display: standalone` no manifest.
- **SW não registra**: Verificar HTTPS e acessibilidade do arquivo.
- **Parou de funcionar**: iOS pode suspender SWs quando PWA está fechado (limitação da plataforma).

---

## 4. Checklist de Implementação Completa

### Essenciais
- [ ] HTTPS configurado.
- [ ] `OneSignalSDKWorker.js` no diretório raiz com `importScripts`.
- [ ] `manifest.json` com `display: standalone`, `name`, `start_url`, `icons`.
- [ ] `<link rel="manifest">` no `<head>` do HTML.
- [ ] SDK inicializado (via script tag OU package React, não ambos).
- [ ] External ID vinculado no login (`OneSignal.login(userId)`).
- [ ] Logout implementado (`OneSignal.logout()`).

### Recomendados
- [ ] `id` no manifest.json.
- [ ] Ícones em 4 tamanhos: 192, 256, 384, 512.
- [ ] Auto Resubscribe habilitado no dashboard.
- [ ] Event listeners para foreground, click, subscriptionChange.
- [ ] Tags do usuário para segmentação.
- [ ] Banner "Add to Home Screen" para iOS.
- [ ] Welcome Notification configurada.

### Segurança
- [ ] App ID é público (seguro no frontend).
- [ ] REST API Key é PRIVADO (apenas no backend/edge functions).
- [ ] Consentimento LGPD/GDPR se aplicável.

---

## 5. Referências Rápidas

| Item | Valor/URL |
|------|-----------|
| SDK CDN | `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js` |
| SW CDN | `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js` |
| React Package | `react-onesignal` v3.4.6 |
| API Base | `https://api.onesignal.com/notifications` |
| Dashboard | `https://dashboard.onesignal.com` |
| Docs | `https://documentation.onesignal.com/docs/en/web-push-setup` |
| SDK Reference | `https://documentation.onesignal.com/docs/en/web-sdk-reference` |
| iOS Guide | `https://documentation.onesignal.com/docs/en/web-push-for-ios` |

---

## 6. Custom Events — Documentação Completa

> Fonte: https://documentation.onesignal.com/docs/en/custom-events

### O que são Custom Events?

Custom Events são ações de usuário (ou inação) nomeadas que você envia ao OneSignal. Eventos são enviados do seu app, website ou sistemas externos para acionar automações, controlar fluxos de Journey e personalizar experiências em tempo real.

**Exemplos:**
- Completed onboarding
- Made a purchase
- Abandoned a cart
- Canceled a subscription
- Reached a new game level

**Quando o OneSignal recebe um Custom Event, você pode:**
- Iniciar um Journey
- Continuar um Journey com step "Wait Until"
- Remover usuários de um Journey
- Personalizar mensagens usando propriedades do evento
- Segmentar usuários por comportamento (Early Access)

### Quando usar Custom Events?

**Use quando:**
- Mensagens devem responder a comportamento do usuário em tempo real
- Os dados representam algo que aconteceu (não estado permanente)
- Você precisa de propriedades do evento para personalização ou lógica de Journey

**NÃO use quando:**
- Você quer armazenar atributos de usuário de longo prazo (use Tags)

> Custom Events representam algo que aconteceu em um ponto específico no tempo. Diferente de Tags, eles NÃO atualizam permanentemente o perfil do usuário — eles registram comportamento.

### Estrutura do Custom Event

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|------------|-----------|
| `name` | string | Sim | Nome do evento. Máximo 128 caracteres |
| `properties` | object | Não | Parâmetros que descrevem o evento (ex: nome do plano, ID do produto, preço) |
| `external_id` | string | Sim* | External ID do usuário. *Obrigatório via API (external_id OU onesignal_id) |
| `timestamp` | string | Não | Horário do evento em ISO 8601 |
| `idempotency_key` | string | Não | UUID único para prevenir processamento duplicado |

**Limites de tamanho:**
- Payload máximo por evento: 2024 bytes
- Tamanho máximo da request (múltiplos eventos): 1 MB

### Como enviar Custom Events

#### 1. Create Custom Events API

```json
POST https://api.onesignal.com/apps/{app_id}/events
{
  "events": [
    {
      "name": "purchase",
      "properties": {
        "item": "T-shirt",
        "size": "small",
        "color": "blue",
        "price": 24.99
      },
      "external_id": "user_12345",
      "timestamp": "2025-10-21T19:09:32.263Z",
      "idempotency_key": "123e4567-e89b-12d3-a456-426614174000"
    }
  ]
}
```

#### 2. trackEvent() via SDK (Mobile e Web)

```typescript
// Web SDK
OneSignal.trackEvent("purchase", {
  item: "T-shirt",
  price: 24.99,
});
```

#### 3. Integrações externas

Todos os eventos são tratados igualmente para fins de billing, independente da fonte.

### Verificar que eventos foram recebidos

Após enviar eventos, confirme no dashboard: **Data > Custom Events**

#### Aba Event List
- Visão geral de todos os Custom Events organizados por nome
- Para cada tipo de evento: total ingerido, evento mais recente (JSON completo), fonte (SDK, API, integração), timestamp
- Clique em um evento para ver detalhes: Source Breakdown, Activities (10 mais recentes), Usage (Journeys ou segmentos)

#### Aba Event Activity
- Feed ao vivo dos eventos mais recentes
- Filtrar por nome, fonte ou external ID
- Inspecionar payloads JSON completos
- Útil para debug de integrações
- **Não atualiza automaticamente** — refresh manual necessário

### Usar Custom Events no OneSignal

#### 1. Trigger de entrada/saída de Journey
Defina um Custom Event como regra de entrada ou saída de Journey.

**Exemplo:**
- `signup_completed` → Iniciar onboarding ou remover de Journey de trial
- `purchase` → Enviar confirmação e cross-sell ou remover de Journey de carrinho abandonado

#### 2. Controlar fluxo de Journey (Wait Until)
Use step "Wait Until" para segurar usuários até um Custom Event ocorrer.

**Exemplo:**
- Esperar `purchase` após `added_to_cart`
- Definir janela de expiração: se o evento não ocorrer a tempo, enviar mensagem de fallback ou sair do Journey

#### 3. Personalizar Journeys com propriedades do evento
Referenciar propriedades usando Liquid nos templates:

```liquid
Thanks for purchasing {{ journey.first_event.properties.item }}!
```

#### 4. Segmentar usuários com Custom Events (Early Access)
Criar segmento baseado na ocorrência de um Custom Event.

**Limitações atuais:**
- Não suportado com Email Warm Up ou A/B tests
- Não pode acionar Journeys
- Não pode ser combinado com outros filtros de segmento

Para solicitar acesso: email support@onesignal.com com nome da empresa e App ID(s).

### Disponibilidade e custos de retenção

Custom Events estão disponíveis em todos os planos pagos.

### Tags vs Custom Events

| Feature | Tags | Custom Events |
|---------|------|---------------|
| Uso de dados | Segmentação e personalização | Trigger Journeys, Wait Until, personalização em Journeys |
| Retenção | Lifetime | 30+ dias (lifetime disponível) |
| Formato | Key-value (strings ou números) | JSON |
| Fonte | SDK, API ou integrações (limitado) | SDK, API ou integrações |
| Acesso | Segmentação e personalização de mensagens | Journeys e personalização em templates de Journey, Segmentação (Coming soon) |

**Distinção chave:**
- **Tags** são propriedades do usuário (Nome, Status da Conta, Localização) — estáticas
- **Events** são coisas que o usuário fez (Compra, Completar Nível, Convidar Amigo) — dinâmicas

**Na prática, use ambos:**
- Tags para propriedades estáticas que não mudam frequentemente
- Custom Events para cenários em tempo real, segmentação complexa e workflows sofisticados de Journey

### Exemplo de integração no nosso sistema

A edge function `send-onesignal` pode ser estendida para também enviar Custom Events via API:

```typescript
// Enviar Custom Event via API
const eventPayload = {
  events: [{
    name: "task_completed",
    properties: {
      task_title: "Minha tarefa",
      category: "trabalho",
    },
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

---

## 7. Referências Rápidas (Atualizada)

| Item | Valor/URL |
|------|-----------|
| SDK CDN | `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js` |
| SW CDN | `https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js` |
| React Package | `react-onesignal` v3.4.6 |
| Notifications API | `https://api.onesignal.com/notifications` |
| Custom Events API | `https://api.onesignal.com/apps/{app_id}/events` |
| Dashboard | `https://dashboard.onesignal.com` |
| Docs | `https://documentation.onesignal.com/docs/en/web-push-setup` |
| Custom Events Docs | `https://documentation.onesignal.com/docs/en/custom-events` |
| SDK Reference | `https://documentation.onesignal.com/docs/en/web-sdk-reference` |
| iOS Guide | `https://documentation.onesignal.com/docs/en/web-push-for-ios` |
