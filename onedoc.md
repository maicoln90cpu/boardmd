# OneSignal Web Push - Documentação Compilada

> Compilado das páginas oficiais do OneSignal em 2026-02-16.
> Fontes:
> - https://documentation.onesignal.com/docs/en/web-push-setup
> - https://documentation.onesignal.com/docs/en/web-sdk-setup
> - https://documentation.onesignal.com/docs/en/web-push-for-ios

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
