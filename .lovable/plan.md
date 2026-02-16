
# Plano: Corrigir VAPID, Refresh Loop e Integracoes OneSignal

## Diagnostico

### Problema 1: Site piscando (refresh loop)
O script OneSignal no `index.html` executa `OneSignal.init()` incondicionalmente em TODAS as paginas. No dominio de preview (que nao e `board.infoprolab.com.br`), o SDK lanca um erro nao-capturado que causa instabilidade e reloads constantes.

### Problema 2: VAPID "nao foi possivel ativar"
Dois Service Workers estao competindo pelo mesmo scope `/`:
- O Workbox SW (gerado pelo VitePWA) que ja faz `importScripts('/sw-push.js')` na linha 51 do `vite.config.ts`
- O `sw-push.js` registrado SEPARADAMENTE pelo `swPushRegistration.ts`

Resultado: conflito de scopes, o `pushManager.subscribe()` falha porque o navegador nao sabe qual SW controla a pagina.

### Problema 3: Integracao OneSignal com templates
A edge function `send-onesignal` ja existe e envia notificacoes programaticamente via API REST do OneSignal, sem precisar criar templates no dashboard. Todos os templates pre-cadastrados no app (meta batida, lembrete, pomodoro, etc.) ja usam essa edge function automaticamente via `oneSignalNotifier.ts`.

---

## Correcoes

### 1. index.html - Proteger init do OneSignal com verificacao de dominio

Envolver o `OneSignalDeferred.push` com verificacao de dominio para que o SDK so inicialize em `board.infoprolab.com.br` ou `localhost`. Em outros dominios, nao tenta inicializar (evita o erro que causa o refresh loop).

### 2. swPushRegistration.ts - Eliminar registro separado do sw-push.js

O Workbox SW ja importa `sw-push.js` via `importScripts`. Registrar um segundo SW no mesmo scope causa conflito. A correcao e:
- Remover o `navigator.serviceWorker.register('/sw-push.js')` separado
- Usar `navigator.serviceWorker.ready` (que retorna o Workbox SW que ja tem o codigo do sw-push.js embutido)
- Simplificar o `getPushSWRegistration()` para sempre usar o SW principal

### 3. main.tsx - Remover chamada ao registerPushServiceWorker

Remover a chamada separada que registra o SW de push, ja que o Workbox ja cuida disso.

### 4. useVapidPush.ts - Melhorar error handling

Adicionar try/catch mais descritivo para que o toast mostre a causa exata do erro em vez de mensagem generica.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|----------|
| `index.html` | Adicionar verificacao de dominio antes do `OneSignal.init()` |
| `src/lib/push/swPushRegistration.ts` | Remover registro separado; usar `navigator.serviceWorker.ready` |
| `src/main.tsx` | Remover chamada a `registerPushServiceWorker()` |
| `src/hooks/useVapidPush.ts` | Melhorar mensagens de erro |

---

## Sobre a Integracao OneSignal com Templates

A edge function `send-onesignal` ja permite enviar qualquer notificacao programaticamente via API REST, sem precisar criar nada no dashboard do OneSignal. O fluxo atual:

1. Template e definido no app (meta batida, lembrete, pomodoro, etc.)
2. O `oneSignalNotifier.ts` chama a edge function `send-onesignal` passando titulo, corpo e user_id
3. A edge function usa a REST API v1 do OneSignal com `include_aliases.external_id` para entregar ao usuario correto
4. Nao precisa subir templates manualmente no dashboard - tudo e automatizado pelo codigo

---

## Analise de Impacto

| Item | Risco | Complexidade (0-10) |
|------|-------|---------------------|
| Proteger init OneSignal no HTML | Baixo | 1 |
| Simplificar registro SW | Baixo | 2 |
| Remover chamada em main.tsx | Baixo | 1 |
| Melhorar erro VAPID | Baixo | 1 |
| **Total** | | **5/40 - Muito abaixo do limite seguro** |

---

## Checklist de Testes Manuais

- [ ] Site NAO pisca/recarrega mais no preview
- [ ] Console sem erros de OneSignal no preview (mostra apenas log de dominio ignorado)
- [ ] VAPID ativa com sucesso ao clicar "Ativar"
- [ ] Botao "Testar" VAPID envia notificacao
- [ ] Em producao (board.infoprolab.com.br): OneSignal inicializa e ativa
- [ ] Templates automaticos (meta batida, lembrete) continuam funcionando via edge function
