# PWA + Push Notifications — Guia Completo de Implementação

> Documento técnico para recriar o sistema completo de PWA + Push Notifications do zero em um projeto Lovable.
> Inclui: configuração PWA, Service Workers, cache, offline, OneSignal, edge function, iOS.
> Ordem de implementação: seguir as partes sequencialmente (1 → 16).
> Última atualização: 2026-02-16

---

## Índice

1. [Fundação PWA](#parte-1-fundação-pwa)
2. [Service Worker de Push](#parte-2-service-worker-de-push)
3. [Registro e Atualização do SW](#parte-3-registro-e-atualização-do-sw)
4. [Offline First](#parte-4-offline-first)
5. [Install Prompts](#parte-5-install-prompts)
6. [OneSignal Web Push — Setup](#parte-6-onesignal-web-push-setup)
7. [OneSignal Provider](#parte-7-onesignal-provider)
8. [Hook useOneSignal](#parte-8-hook-useonesignal)
9. [Edge Function send-onesignal](#parte-9-edge-function-send-onesignal)
10. [Notificador Automático](#parte-10-notificador-automático)
11. [Alertas de Due Date](#parte-11-alertas-de-due-date)
12. [Foreground Push Handler](#parte-12-foreground-push-handler)
13. [Tabela push_logs](#parte-13-tabela-push_logs)
14. [iOS Específico](#parte-14-ios-específico)
15. [Checklist Final](#parte-15-checklist-final)
16. [Troubleshooting](#parte-16-troubleshooting)

---

## Parte 1: Fundação PWA

### O que fazer
Instalar `vite-plugin-pwa` e configurar o Vite para gerar um PWA completo com manifest, service worker e caching.

### Por que
O VitePWA gera automaticamente o service worker via Workbox, gerencia o manifest, e permite importar scripts customizados (como o push handler). Sem isso, não há PWA.

### Passo 1.1: Instalar dependência

```bash
npm install vite-plugin-pwa
```

### Passo 1.2: Configurar vite.config.ts

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'pwa-icon.png', 'robots.txt', 'sw-push.js'],
      manifest: {
        name: 'Meu App',
        short_name: 'App',
        description: 'Descrição do app',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/favicon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // CRÍTICO: importa o push handler customizado no SW do Workbox
        importScripts: ['/sw-push.js'],
        runtimeCaching: [
          // API do backend — Network First com fallback de cache
          {
            urlPattern: /^https:\/\/SEU_PROJETO\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Auth — NUNCA cachear (segurança)
          {
            urlPattern: /^https:\/\/SEU_PROJETO\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly'
          },
          // Storage — Cache First (arquivos estáticos)
          {
            urlPattern: /^https:\/\/SEU_PROJETO\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: { maxEntries: 200, maxAgeSeconds: 2592000 }
            }
          },
          // Google Fonts CSS
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } }
          },
          // Google Fonts Files
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-files', expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } }
          },
          // Imagens
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 7776000 } }
          },
          // JS/CSS
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'static-resources', expiration: { maxEntries: 100, maxAgeSeconds: 604800 } }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        navigateFallbackAllowlist: [/^\/(?!.*\.).*$/]
      },
      devOptions: {
        enabled: true,
        type: 'module',
      }
    })
  ],
});
```

**Pontos críticos:**
- `registerType: 'autoUpdate'` — SW atualiza automaticamente
- `importScripts: ['/sw-push.js']` — importa o handler de push no SW do Workbox
- `skipWaiting: true` + `clientsClaim: true` — novo SW assume imediatamente
- `navigateFallback` — redireciona para index.html quando offline (SPA)
- `'NetworkOnly'` para auth — NUNCA cachear tokens

### Passo 1.3: Criar public/manifest.json

```json
{
  "name": "Meu App - Descrição Completa",
  "short_name": "App",
  "description": "Descrição completa do aplicativo.",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait-primary",
  "scope": "/",
  "start_url": "/",
  "id": "?homescreen=1",
  "categories": ["productivity", "utilities"],
  "lang": "pt-BR",
  "dir": "ltr",
  "prefer_related_applications": false,
  "icons": [
    { "src": "/pwa-icon.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" },
    { "src": "/pwa-icon.png", "sizes": "384x384", "type": "image/png", "purpose": "any" },
    { "src": "/pwa-icon.png", "sizes": "256x256", "type": "image/png", "purpose": "any" },
    { "src": "/favicon.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/pwa-icon.png", "sizes": "180x180", "type": "image/png", "purpose": "any" },
    { "src": "/pwa-icon.png", "sizes": "152x152", "type": "image/png", "purpose": "any" },
    { "src": "/pwa-icon.png", "sizes": "120x120", "type": "image/png", "purpose": "any" },
    { "src": "/favicon.png", "sizes": "96x96", "type": "image/png", "purpose": "any" }
  ],
  "shortcuts": [
    {
      "name": "Ação Principal",
      "short_name": "Ação",
      "description": "Atalho rápido",
      "url": "/",
      "icons": [{ "src": "/favicon.png", "sizes": "192x192" }]
    }
  ]
}
```

**Campos obrigatórios para iOS:**
- `display: "standalone"` — sem isso, push NÃO funciona no iOS
- `id` — identificador único para o PWA
- Ícones em 192x192 e 512x512 no mínimo

### Passo 1.4: Configurar index.html

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/pwa-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Meu App</title>
    <meta name="description" content="Descrição do app">
    
    <!-- PWA Meta Tags (OBRIGATÓRIOS) -->
    <meta name="theme-color" content="#000000" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="App" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="format-detection" content="telephone=no" />
    
    <!-- Apple Touch Icons (múltiplos tamanhos) -->
    <link rel="apple-touch-icon" sizes="180x180" href="/pwa-icon.png" />
    <link rel="apple-touch-icon" sizes="152x152" href="/pwa-icon.png" />
    <link rel="apple-touch-icon" sizes="120x120" href="/pwa-icon.png" />
    
    <!-- Apple Startup Image -->
    <link rel="apple-touch-startup-image" href="/pwa-icon.png" />
    
    <!-- Manifest -->
    <link rel="manifest" href="/manifest.json" />
    
    <!-- Preconnect (performance) -->
    <link rel="preconnect" href="https://SEU_PROJETO.supabase.co" />
    <link rel="dns-prefetch" href="https://SEU_PROJETO.supabase.co" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Ícones Necessários

| Tamanho | Uso | Obrigatório |
|---------|-----|-------------|
| 512x512 | PWA install, splash screen | ✅ |
| 384x384 | Alta resolução | Recomendado |
| 256x256 | OneSignal default icon | Recomendado |
| 192x192 | Android home screen | ✅ |
| 180x180 | Apple touch icon | ✅ (iOS) |
| 152x152 | iPad | Recomendado |
| 120x120 | iPhone retina | Recomendado |
| 96x96 | Favicon grande | Recomendado |

---

## Parte 2: Service Worker de Push

### O que fazer
Criar `public/sw-push.js` com handlers para push notifications, notification clicks, e ações de tarefas.

### Por que
O Workbox gera o SW principal, mas não sabe lidar com push notifications. O `sw-push.js` é importado via `importScripts` e adiciona essa funcionalidade.

### Código completo: public/sw-push.js

```javascript
// Custom Push Notification Service Worker
// Importado pelo SW do Workbox via importScripts

// Ativação imediata
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ==========================================
// PUSH EVENT — Recebe notificação do servidor
// ==========================================
self.addEventListener('push', async (event) => {
  let notificationData = {
    title: 'Nova Notificação',
    body: 'Você tem uma nova atualização',
    icon: '/pwa-icon.png',
    badge: '/favicon.png',
    data: { url: '/' },
    actions: [],
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      
      if (payload.notification) {
        notificationData = { ...notificationData, ...payload.notification };
      } else {
        notificationData = {
          title: payload.title || notificationData.title,
          body: payload.body || notificationData.body,
          icon: payload.icon || notificationData.icon,
          badge: payload.badge || notificationData.badge,
          data: payload.data || notificationData.data,
          actions: payload.actions || notificationData.actions,
        };
      }

      // Ações ricas baseadas no tipo de notificação
      if (payload.data?.type === 'task_reminder' && payload.data?.taskId) {
        notificationData.actions = [
          { action: 'complete', title: '✓ Concluir' },
          { action: 'snooze', title: '⏰ Adiar 1h' },
        ];
        notificationData.data = { ...notificationData.data, taskId: payload.data.taskId, type: 'task_reminder' };
      } else if (payload.data?.type === 'pomodoro') {
        notificationData.actions = [
          { action: 'start_break', title: '☕ Iniciar Pausa' },
          { action: 'skip_break', title: '▶️ Continuar' },
        ];
      } else if (payload.data?.type === 'due_date_alert' && payload.data?.taskId) {
        notificationData.actions = [
          { action: 'view', title: '👁️ Ver Tarefa' },
          { action: 'snooze', title: '⏰ Adiar 1h' },
        ];
      }
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  // Verificar se app está em foreground
  const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  const appIsOpen = windowClients.some(client => client.visibilityState === 'visible');

  if (appIsOpen) {
    // App aberto → enviar mensagem para o client exibir toast customizado
    windowClients.forEach(client => {
      if (client.visibilityState === 'visible') {
        client.postMessage({
          type: 'PUSH_NOTIFICATION_FOREGROUND',
          notification: notificationData,
        });
      }
    });
  } else {
    // App fechado/background → notificação do sistema
    event.waitUntil(
      self.registration.showNotification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        data: notificationData.data,
        actions: notificationData.actions,
        requireInteraction: notificationData.actions?.length > 0,
        tag: notificationData.data?.taskId || 'app-notification',
        renotify: true,
        vibrate: [200, 100, 200],
      })
    );
  }
});

// ==========================================
// NOTIFICATION CLICK — Usuário clicou na notificação
// ==========================================
self.addEventListener('notificationclick', async (event) => {
  const { action, notification } = event;
  const data = notification.data || {};
  notification.close();

  // Ações específicas
  if (action === 'complete' && data.taskId) {
    event.waitUntil(handleTaskAction(data.taskId, 'complete'));
    return;
  }
  if (action === 'snooze' && data.taskId) {
    event.waitUntil(handleTaskAction(data.taskId, 'snooze'));
    return;
  }
  if (action === 'view' && data.taskId) {
    event.waitUntil(openOrFocusWindow(`/?task=${data.taskId}`));
    return;
  }
  if (action === 'start_break') {
    event.waitUntil(openOrFocusWindow('/pomodoro?action=break'));
    return;
  }
  if (action === 'skip_break') {
    event.waitUntil(openOrFocusWindow('/pomodoro?action=work'));
    return;
  }

  // Clique padrão — abrir URL da notificação
  event.waitUntil(openOrFocusWindow(data.url || '/'));
});

// Helper: abrir ou focar janela existente
async function openOrFocusWindow(urlToOpen) {
  const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of windowClients) {
    if ('focus' in client) {
      await client.focus();
      client.postMessage({ type: 'NAVIGATE_TO', url: urlToOpen });
      return;
    }
  }
  if (clients.openWindow) {
    return clients.openWindow(urlToOpen);
  }
}

// Helper: executar ação na tarefa
async function handleTaskAction(taskId, action) {
  const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (windowClients.length > 0) {
    windowClients.forEach(client => {
      client.postMessage({ type: 'TASK_ACTION', taskId, action });
    });
    const client = windowClients[0];
    if ('focus' in client) await client.focus();
  } else {
    if (clients.openWindow) {
      const actionUrl = action === 'complete' ? `/?complete_task=${taskId}` : `/?snooze_task=${taskId}`;
      return clients.openWindow(actionUrl);
    }
  }
}

// Resubscribe se a subscription mudar
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) => {
        return fetch('/api/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        });
      })
  );
});
```

### Lógica de foreground vs background

```
Push chega →
  ├── App visível? → postMessage → client exibe toast customizado
  └── App fechado? → showNotification() → notificação do sistema
```

---

## Parte 3: Registro e Atualização do SW

### O que fazer
Configurar o registro do SW no `main.tsx` e criar hook para verificar/aplicar atualizações.

### Passo 3.1: main.tsx

```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

// Registrar SW com handling de atualização
const updateSW = registerSW({
  onNeedRefresh() {
    toast.info('Nova versão disponível!', {
      duration: Infinity,
      action: {
        label: 'Atualizar',
        onClick: () => updateSW(true),
      },
      cancel: {
        label: 'Depois',
        onClick: () => {},
      },
    });
  },
  onOfflineReady() {
    toast.success('App pronto para funcionar offline!', { duration: 3000 });
  },
  onRegistered(registration) {
    // Verificar updates a cada hora
    if (registration) {
      setInterval(() => registration.update(), 60 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error('SW registration error:', error);
  },
  immediate: true
});

// Background sync ao ficar online
window.addEventListener('online', () => {
  toast.success('Conexão restaurada! Sincronizando...', { duration: 3000 });
});

window.addEventListener('offline', () => {
  toast.warning('Você está offline. Alterações salvas localmente.', { duration: 5000 });
});

createRoot(document.getElementById("root")!).render(<App />);
```

### Passo 3.2: Hook usePWAUpdate

```typescript
// src/hooks/usePWAUpdate.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function usePWAUpdate() {
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    setIsChecking(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      const now = new Date();
      setLastCheck(now);
      if (registration.waiting) {
        setUpdateAvailable(true);
        toast.success('Nova versão disponível!', {
          action: { label: 'Atualizar', onClick: () => applyUpdate() },
        });
      } else {
        setUpdateAvailable(false);
        toast.success('App na versão mais recente');
      }
    } catch {
      toast.error('Erro ao verificar atualizações');
    } finally {
      setIsChecking(false);
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      toast.success('Atualizando...');
      setTimeout(() => window.location.reload(), 500);
    }
  }, []);

  const forceReinstall = useCallback(async () => {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    }
    toast.success('Cache limpo. Recarregando...');
    setTimeout(() => window.location.href = window.location.href + '?t=' + Date.now(), 500);
  }, []);

  return { isChecking, updateAvailable, lastCheck, isStandalone, checkForUpdates, applyUpdate, forceReinstall };
}
```

---

## Parte 4: Offline First

### O que fazer
Criar fila de operações offline com sincronização automática quando a conexão voltar.

### Passo 4.1: offlineSync.ts

```typescript
// src/lib/sync/offlineSync.ts

export interface QueuedOperation {
  id: string;
  type: 'task' | 'note' | 'category';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = 'offline_operations_queue';

export const offlineSync = {
  queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp'>) {
    const queue = this.getQueue();
    const newOp: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    queue.push(newOp);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return newOp.id;
  },

  getQueue(): QueuedOperation[] {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  },

  removeOperation(id: string) {
    const queue = this.getQueue().filter(op => op.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  clearQueue() { localStorage.removeItem(QUEUE_KEY); },
  hasQueuedOperations(): boolean { return this.getQueue().length > 0; }
};
```

### Passo 4.2: backgroundSync.ts

```typescript
// src/lib/sync/backgroundSync.ts
import { offlineSync, QueuedOperation } from './offlineSync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const backgroundSync = {
  async register() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('supabase-sync');
      } catch {
        this.startPolling();
      }
    } else {
      this.startPolling();
    }
  },

  startPolling() {
    let retryCount = 0;
    const poll = async () => {
      if (navigator.onLine && offlineSync.hasQueuedOperations()) {
        const success = await this.syncQueue();
        retryCount = success ? 0 : retryCount + 1;
      }
      // Retry exponencial: 1s, 2s, 4s, 8s, 16s, max 30s
      setTimeout(poll, Math.min(1000 * Math.pow(2, retryCount), 30000));
    };
    poll();
  },

  async syncQueue(): Promise<boolean> {
    const queue = offlineSync.getQueue();
    if (queue.length === 0) return true;
    let hasErrors = false;
    let successCount = 0;

    toast.info(`Sincronizando ${queue.length} alterações...`);
    for (const op of queue) {
      try {
        await this.processOperation(op);
        offlineSync.removeOperation(op.id);
        successCount++;
      } catch { hasErrors = true; }
    }
    if (successCount > 0) toast.success(`${successCount} alterações sincronizadas!`);
    return !hasErrors;
  },

  async processOperation(operation: QueuedOperation) {
    const { type, action, data } = operation;
    const id = data.id as string | undefined;

    if (action === 'create') {
      return supabase.from(type === 'task' ? 'tasks' : type === 'note' ? 'notes' : 'categories').insert(data as any);
    }
    if (action === 'update' && id) {
      return supabase.from(type === 'task' ? 'tasks' : type === 'note' ? 'notes' : 'categories').update(data as any).eq('id', id);
    }
    if (action === 'delete' && id) {
      return supabase.from(type === 'task' ? 'tasks' : type === 'note' ? 'notes' : 'categories').delete().eq('id', id);
    }
  },
};
```

---

## Parte 5: Install Prompts

### O que fazer
Criar dois componentes: um para Chrome/Android (`beforeinstallprompt`) e outro para iOS (instruções visuais).

### Passo 5.1: InstallPrompt.tsx (Chrome/Android)

```typescript
// src/components/InstallPrompt.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) {
      const days = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (days < 7) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') toast.success('App instalado!');
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-card border rounded-lg shadow-lg p-4 z-50 max-w-sm">
      <button onClick={handleDismiss} className="absolute top-2 right-2 p-1 hover:bg-accent rounded-full">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <Download className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Instalar App</h3>
          <p className="text-xs text-muted-foreground mb-3">Acesso rápido e uso offline</p>
          <Button onClick={handleInstall} size="sm" className="w-full">Instalar</Button>
        </div>
      </div>
    </div>
  );
}
```

### Passo 5.2: AddToHomeScreenBanner.tsx (iOS)

```typescript
// src/components/AddToHomeScreenBanner.tsx
import { useState, useEffect } from 'react';
import { X, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AddToHomeScreenBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in window.navigator && (window.navigator as any).standalone);
    const dismissed = localStorage.getItem('aths_banner_dismissed');

    if (!isIOS || isStandalone) return;
    if (dismissed) {
      const days = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (days < 14) return;
    }

    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('aths_banner_dismissed', Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="bg-card border rounded-xl shadow-2xl p-4 max-w-md mx-auto relative">
        <button onClick={handleDismiss} className="absolute top-3 right-3 p-1 hover:bg-accent rounded-full">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex items-start gap-3 mb-3">
          <Smartphone className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Instale para Notificações</h3>
            <p className="text-xs text-muted-foreground">No iOS, push funciona apenas com o app na tela inicial.</p>
          </div>
        </div>
        <div className="space-y-2 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">1</span>
            Toque em <Share className="h-3.5 w-3.5 text-primary" /> Compartilhar
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">2</span>
            Selecione <Plus className="h-3.5 w-3.5 text-primary" /> "Adicionar à Tela de Início"
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">3</span>
            Abra o app pela tela inicial
          </div>
        </div>
        <Button onClick={handleDismiss} variant="outline" size="sm" className="w-full text-xs">Entendi</Button>
      </div>
    </div>
  );
}
```

---

## Parte 6: OneSignal Web Push — Setup

### O que fazer
Configurar o OneSignal no dashboard e adicionar o SDK via CDN no index.html.

### Passo 6.1: Dashboard OneSignal
1. Criar conta em https://dashboard.onesignal.com
2. Criar novo app → Web Push
3. Configurar:
   - **Site Name**: Nome do seu app
   - **Site URL**: URL exata de produção (ex: `https://meuapp.com`)
   - **Auto Resubscribe**: Ativar
   - **Default Icon URL**: URL do ícone 256x256px
4. Copiar o **App ID** (público, vai no frontend)
5. Copiar a **REST API Key** (PRIVADA, vai APENAS no backend/edge function)

### Passo 6.2: OneSignalSDKWorker.js

Criar `public/OneSignalSDKWorker.js`:

```javascript
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
```

### Passo 6.3: CDN Script no index.html

Adicionar no `<head>` do `index.html`:

```html
<!-- OneSignal Web Push SDK v16 (official CDN) -->
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  (function() {
    var host = window.location.hostname;
    // PROTEÇÃO DE DOMÍNIO — evita loops em ambientes de preview
    if (host === 'SEU_DOMINIO.com' || host === 'localhost') {
      OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
          appId: "SEU_APP_ID_AQUI",
        });
      });
    } else {
      console.log('[OneSignal] Skipped init on domain:', host);
    }
  })();
</script>
```

**⚠️ PROTEÇÃO DE DOMÍNIO É OBRIGATÓRIA**

Sem a verificação de domínio, o OneSignal tentará inicializar em ambientes de preview do Lovable, causando loops de erros porque o domínio não está configurado no dashboard. A proteção garante que o SDK só inicializa nos domínios corretos.

### Passo 6.4: Secrets no Backend

Adicionar como secrets na edge function:
- `ONESIGNAL_APP_ID` — App ID do dashboard
- `ONESIGNAL_REST_API_KEY` — REST API Key (PRIVADA)

---

## Parte 7: OneSignal Provider

### O que fazer
Criar o provider TypeScript que abstrai o acesso ao SDK do OneSignal.

### Por que
O SDK é carregado via CDN de forma assíncrona. O provider aguarda o carregamento e expõe utilitários tipados. Também gerencia callbacks de subscription change para re-linking no iOS.

### Código completo: src/lib/push/oneSignalProvider.ts

```typescript
declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

const ALLOWED_DOMAINS = ['seu-dominio.com', 'localhost'];

let initialized = false;
const subscriptionChangeCallbacks: Set<() => void> = new Set();

/**
 * Aguarda o SDK OneSignal estar pronto (carregado via CDN)
 * Timeout de 5s — se não carregar, retorna false
 */
export const initOneSignal = async (): Promise<boolean> => {
  if (initialized) return true;

  const hostname = window.location.hostname;
  const isAllowed = ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
  if (!isAllowed) {
    console.warn(`[OneSignal] Domain "${hostname}" not allowed`);
    return false;
  }

  try {
    // Polling: aguarda até 5s para o SDK carregar do CDN
    let attempts = 0;
    while (!window.OneSignal && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    if (!window.OneSignal) {
      console.error('[OneSignal] SDK not loaded after 5s');
      return false;
    }

    setupEventListeners();
    initialized = true;
    return true;
  } catch (error) {
    console.error('[OneSignal] Init error:', error);
    return false;
  }
};

function setupEventListeners() {
  const OS = window.OneSignal;
  if (!OS?.Notifications) return;

  // Notificação clicada
  OS.Notifications.addEventListener('click', (event: any) => {
    console.log('[OneSignal] Clicked:', event?.notification?.title);
  });

  // Notificação em foreground
  OS.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
    console.log('[OneSignal] Foreground:', event?.notification?.title);
  });

  // Permissão mudou
  OS.Notifications.addEventListener('permissionChange', (permission: boolean) => {
    console.log('[OneSignal] Permission:', permission);
  });

  // Subscription mudou — CRÍTICO para re-link no iOS
  OS.User?.PushSubscription?.addEventListener('change', (subscription: any) => {
    console.log('[OneSignal] Subscription changed:', subscription?.current?.optedIn);
    if (subscription?.current?.optedIn) {
      // Notifica callbacks registrados (useOneSignal re-faz login)
      subscriptionChangeCallbacks.forEach(cb => {
        try { cb(); } catch (e) { console.error('[OneSignal] Callback error:', e); }
      });
    }
  });
}

function getOS() { return window.OneSignal; }

export const oneSignalUtils = {
  isInitialized: () => initialized,

  // Callbacks de subscription change (para re-link externo)
  onSubscriptionChange(cb: () => void) { subscriptionChangeCallbacks.add(cb); },
  offSubscriptionChange(cb: () => void) { subscriptionChangeCallbacks.delete(cb); },

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;
      await getOS()?.User?.PushSubscription?.optIn();
      return true;
    } catch { return false; }
  },

  async isSubscribed(): Promise<boolean> {
    try { return getOS()?.User?.PushSubscription?.optedIn ?? false; }
    catch { return false; }
  },

  async getSubscriptionId(): Promise<string | null> {
    try { return getOS()?.User?.PushSubscription?.id ?? null; }
    catch { return null; }
  },

  // CRÍTICO: vincula o external_id ao subscriber
  // DEVE ser chamado APÓS a subscription existir (após permission granted)
  async setExternalUserId(userId: string): Promise<void> {
    try {
      await getOS()?.login(userId);
      console.log('[OneSignal] External user ID set:', userId);
    } catch (error) {
      console.error('[OneSignal] Set external user ID error:', error);
    }
  },

  async addTags(tags: Record<string, string>): Promise<void> {
    try { await getOS()?.User?.addTags(tags); }
    catch (error) { console.error('[OneSignal] Add tags error:', error); }
  },

  async removeTags(tagKeys: string[]): Promise<void> {
    try { await getOS()?.User?.removeTags(tagKeys); }
    catch {}
  },

  async unsubscribe(): Promise<void> {
    try { await getOS()?.User?.PushSubscription?.optOut(); }
    catch {}
  },

  async resubscribe(): Promise<void> {
    try { await getOS()?.User?.PushSubscription?.optIn(); }
    catch {}
  },

  getPermissionStatus(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'denied';
  },

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  },

  async logout(): Promise<void> {
    try { await getOS()?.logout(); }
    catch {}
  },

  async getDiagnostics(): Promise<Record<string, string>> {
    const OS = getOS();
    const hostname = window.location.hostname;
    const isAllowed = ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));

    let swStatus = 'N/A';
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const osSW = regs.find(r => r.active?.scriptURL?.includes('OneSignal'));
      swStatus = osSW ? 'Encontrado' : 'Não encontrado';
    } catch { swStatus = 'Erro'; }

    let subscriptionId = 'N/A';
    let externalId = 'N/A';
    try {
      subscriptionId = OS?.User?.PushSubscription?.id || 'N/A';
      const identity = OS?.User?.getIdentity?.();
      externalId = identity?.external_id || OS?.User?.onesignalId || 'N/A';
    } catch {}

    return {
      'Domínio': isAllowed ? `✅ ${hostname}` : `❌ ${hostname}`,
      'SDK Carregado': OS ? '✅ Sim' : '❌ Não',
      'Permissão': Notification.permission,
      'Service Worker': swStatus,
      'Subscription ID': subscriptionId,
      'External User ID': externalId,
    };
  },
};
```

---

## Parte 8: Hook useOneSignal

### O que fazer
Criar o hook React que gerencia o estado do OneSignal e expõe funções para a UI.

### ⚠️ ORDEM CRÍTICA NO SUBSCRIBE

```
1. requestPermission()           ← Cria o subscriber
2. await 2000ms                  ← Buffer para iOS (mais lento)
3. isSubscribed()                ← Confirmar subscription ativa
4. setExternalUserId(userId)     ← Vincular DEPOIS que subscriber existe
5. addTags({ user_id, ... })     ← Redundância para fallback de entrega
```

### Código completo: src/hooks/useOneSignal.ts

```typescript
import { useState, useEffect, useCallback } from 'react';
import { initOneSignal, oneSignalUtils } from '@/lib/push/oneSignalProvider';
import { supabase } from '@/integrations/supabase/client';

export function useOneSignal() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({});

  // Init automático + login em cada carregamento
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        const initialized = await initOneSignal();
        setIsInitialized(initialized);
        
        if (initialized) {
          // Login automático em cada carregamento
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await oneSignalUtils.setExternalUserId(user.id);
            await oneSignalUtils.addTags({
              app_version: '1.0',
              platform: 'web',
              user_id: user.id,
            });
          }
          await new Promise(resolve => setTimeout(resolve, 500));
          const subscribed = await oneSignalUtils.isSubscribed();
          setIsSubscribed(subscribed);
          setPermission(Notification.permission);
        } else {
          setInitError('Falha ao carregar SDK OneSignal');
        }
        const diag = await oneSignalUtils.getDiagnostics();
        setDiagnostics(diag);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  // Re-login automático quando subscription muda (CRÍTICO para iOS)
  useEffect(() => {
    if (!isInitialized) return;
    const handleChange = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await oneSignalUtils.setExternalUserId(user.id);
        await oneSignalUtils.addTags({ user_id: user.id, platform: 'web', app_version: '1.0' });
        const subscribed = await oneSignalUtils.isSubscribed();
        setIsSubscribed(subscribed);
      }
    };
    oneSignalUtils.onSubscriptionChange(handleChange);
    return () => oneSignalUtils.offSubscriptionChange(handleChange);
  }, [isInitialized]);

  // Subscribe com ordem CORRETA
  const subscribe = useCallback(async () => {
    if (!isInitialized) {
      const init = await initOneSignal();
      if (!init) return false;
    }
    try {
      setIsLoading(true);
      
      // 1. Permission PRIMEIRO — cria subscriber
      const granted = await oneSignalUtils.requestPermission();
      if (!granted) { setPermission(Notification.permission); return false; }
      
      // 2. Esperar iOS ativar subscription
      await new Promise(r => setTimeout(r, 2000));
      
      // 3. Confirmar
      const subscribed = await oneSignalUtils.isSubscribed();
      
      // 4. Vincular external_id DEPOIS
      const { data: { user } } = await supabase.auth.getUser();
      if (subscribed && user) {
        await oneSignalUtils.setExternalUserId(user.id);
        await oneSignalUtils.addTags({ user_id: user.id, platform: 'web', app_version: '1.0' });
      }
      
      setIsSubscribed(subscribed);
      setPermission(Notification.permission);
      return subscribed;
    } catch { return false; }
    finally { setIsLoading(false); }
  }, [isInitialized]);

  const unsubscribe = useCallback(async () => {
    if (!isInitialized) return false;
    try {
      setIsLoading(true);
      await oneSignalUtils.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch { return false; }
    finally { setIsLoading(false); }
  }, [isInitialized]);

  const sendTestNotification = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.functions.invoke('send-onesignal', {
      body: {
        user_id: user.id,
        title: '🔔 Teste',
        body: 'Se você viu isso, as notificações estão funcionando!',
        notification_type: 'test',
        url: '/',
      },
    });
    return !error;
  }, []);

  return {
    isSupported, isSubscribed, isInitialized, initError,
    permission, isLoading, diagnostics,
    subscribe, unsubscribe, sendTestNotification,
  };
}
```

---

## Parte 9: Edge Function send-onesignal

### O que fazer
Criar a edge function que envia notificações via API do OneSignal com estratégia de entrega dupla.

### Secrets necessários
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `SUPABASE_URL` (automático)
- `SUPABASE_SERVICE_ROLE_KEY` (automático)

### Estratégia de entrega

```
user_id fornecido?
  ├── SIM → Tentativa 1: include_aliases.external_id + target_channel: "push"
  │         ├── recipients > 0 → ✅ Sucesso
  │         └── recipients === 0 → Fallback: filters [tag user_id]
  │              ├── recipients > 0 → ✅ Sucesso via fallback
  │              └── recipients === 0 → ❌ Sem dispositivo
  └── NÃO → included_segments: ['Subscribed Users'] (broadcast)
```

### ⚠️ REGRA CRÍTICA
**NUNCA misturar `included_segments` com `filters`**. O OneSignal ignora `included_segments` quando `filters` está presente e gera warning.

### Código completo: supabase/functions/send-onesignal/index.ts

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  url?: string;
  notification_type?: string;
}

async function sendToOneSignal(data: Record<string, unknown>, apiKey: string) {
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${apiKey}`,
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: NotificationPayload = await req.json();

    // Base data — comum a todas as tentativas
    const baseData: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: payload.title, pt: payload.title },
      contents: { en: payload.body, pt: payload.body },
      url: payload.url || '/',
      data: {
        ...payload.data,
        notification_type: payload.notification_type || 'general',
        timestamp: new Date().toISOString(),
      },
      chrome_web_icon: '/pwa-icon.png',
      firefox_icon: '/pwa-icon.png',
      ttl: 86400,
    };

    let result: Record<string, unknown>;
    let usedFallback = false;

    if (payload.user_id) {
      // Tentativa 1: external_id + target_channel
      const primaryData = {
        ...baseData,
        include_aliases: { external_id: [payload.user_id] },
        target_channel: 'push',
      };
      result = await sendToOneSignal(primaryData, ONESIGNAL_REST_API_KEY);

      // Fallback se 0 recipients
      const recipients = (result as any).recipients;
      if ((recipients === 0 || recipients === undefined) && !result.errors) {
        usedFallback = true;
        // APENAS filters — SEM included_segments
        const fallbackData = {
          ...baseData,
          filters: [
            { field: 'tag', key: 'user_id', relation: '=', value: payload.user_id },
          ],
        };
        result = await sendToOneSignal(fallbackData, ONESIGNAL_REST_API_KEY);
      }
    } else {
      // Broadcast para todos inscritos
      result = await sendToOneSignal(
        { ...baseData, included_segments: ['Subscribed Users'] },
        ONESIGNAL_REST_API_KEY
      );
    }

    // Log no banco
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && payload.user_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const recipients = (result as any).recipients ?? 0;
        await supabase.from('push_logs').insert({
          user_id: payload.user_id,
          title: payload.title,
          body: payload.body,
          data: { ...payload.data, recipients, used_fallback: usedFallback },
          notification_type: payload.notification_type || 'onesignal',
          status: result.id ? (recipients > 0 ? 'sent' : 'no_recipients') : 'failed',
          error_message: result.errors ? JSON.stringify(result.errors) : null,
          device_name: 'OneSignal',
        });
      } catch {}
    }

    if (result.errors) {
      return new Response(
        JSON.stringify({ success: false, errors: result.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: result.id,
        recipients: (result as any).recipients ?? 0,
        used_fallback: usedFallback,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Formato EXATO da requisição para API OneSignal

```
POST https://onesignal.com/api/v1/notifications

Headers:
  Content-Type: application/json
  Authorization: Basic <REST_API_KEY>

Body (targeting por external_id):
{
  "app_id": "<APP_ID>",
  "headings": { "en": "Título", "pt": "Título" },
  "contents": { "en": "Corpo", "pt": "Corpo" },
  "include_aliases": { "external_id": ["<UUID>"] },
  "target_channel": "push",
  "url": "/",
  "data": { "notification_type": "test", "timestamp": "ISO" },
  "chrome_web_icon": "/pwa-icon.png",
  "firefox_icon": "/pwa-icon.png",
  "ttl": 86400
}

Body (fallback por tag — SEM included_segments):
{
  "app_id": "<APP_ID>",
  "headings": { ... },
  "contents": { ... },
  "filters": [
    { "field": "tag", "key": "user_id", "relation": "=", "value": "<UUID>" }
  ],
  "url": "/",
  "data": { ... },
  "chrome_web_icon": "/pwa-icon.png",
  "ttl": 86400
}

Resposta (sucesso):
{ "id": "notif-uuid", "recipients": 1, "external_id": "<UUID>" }

Resposta (sem destinatários):
{ "id": "notif-uuid", "recipients": 0 }
```

---

## Parte 10: Notificador Automático

### O que fazer
Criar um módulo que abstrai o envio de diferentes tipos de notificações.

### Código: src/lib/notifications/oneSignalNotifier.ts

```typescript
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  notification_type: string;
  url?: string;
  data?: Record<string, unknown>;
}

export const oneSignalNotifier = {
  async send(payload: NotificationPayload): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('send-onesignal', { body: payload });
      return !error;
    } catch { return false; }
  },

  async sendDueDateAlert(userId: string, taskTitle: string, hoursUntilDue: number) {
    let title: string, body: string;
    if (hoursUntilDue <= 0) { title = '⏰ Tarefa Atrasada!'; body = `"${taskTitle}" já passou do prazo`; }
    else if (hoursUntilDue <= 1) { title = '🔥 Prazo Urgente!'; body = `"${taskTitle}" vence em menos de 1 hora`; }
    else if (hoursUntilDue <= 24) { title = '⚠️ Prazo Próximo'; body = `"${taskTitle}" vence em ${Math.floor(hoursUntilDue)}h`; }
    else { title = '📋 Lembrete'; body = `"${taskTitle}" vence em ${Math.floor(hoursUntilDue / 24)} dia(s)`; }
    return this.send({ user_id: userId, title, body, notification_type: 'due_date', url: '/', data: { hoursUntilDue } });
  },

  async sendDailyReminder(userId: string, pending: number, overdue: number) {
    const body = overdue > 0
      ? `${pending} pendente(s) e ${overdue} atrasada(s)`
      : `${pending} tarefa(s) pendente(s) para hoje`;
    return this.send({ user_id: userId, title: '📋 Resumo do Dia', body, notification_type: 'daily_reminder', url: '/' });
  },

  async sendAchievement(userId: string, title: string, points: number) {
    return this.send({ user_id: userId, title: '🏆 Nova Conquista!', body: `${title} (+${points} pts)`, notification_type: 'achievement', url: '/dashboard' });
  },

  async sendPomodoroComplete(userId: string, type: 'work' | 'break') {
    return this.send({
      user_id: userId,
      title: type === 'work' ? '🍅 Pomodoro Completo!' : '☕ Pausa Terminada!',
      body: type === 'work' ? 'Hora de fazer uma pausa!' : 'Hora de voltar ao trabalho!',
      notification_type: 'pomodoro', url: '/pomodoro',
    });
  },
};
```

---

## Parte 11: Alertas de Due Date

### O que fazer
Criar hook que monitora tarefas com due date e emite alertas progressivos.

### 4 Níveis de Alerta

| Nível | Threshold | Comportamento |
|-------|-----------|---------------|
| Early | 2x horas configuradas | Toast + notificação do browser |
| Warning | Horas configuradas | Toast + notificação do browser |
| Urgent | 1 hora antes | Toast destrutivo + notificação persistente |
| Overdue | Passado do prazo | Toast destrutivo + notificação persistente |

### Persistência
Usa localStorage para evitar repetir notificações. Cada entrada tem `{ key, timestamp }` e respeita o `snoozeMinutes` configurado pelo usuário.

### Função pura: getTaskUrgency
```typescript
export function getTaskUrgency(task: Task): 'overdue' | 'urgent' | 'warning' | 'normal' {
  if (!task.due_date) return 'normal';
  const dueDate = new Date(task.due_date);
  if (isPast(dueDate)) return 'overdue';
  const minutes = differenceInMinutes(dueDate, new Date());
  if (minutes <= 60) return 'urgent';
  if (minutes <= 24 * 60) return 'warning';
  return 'normal';
}
```

Essa função é pura (sem side effects) e pode ser usada em TaskCard para visual de urgência sem disparar notificações.

---

## Parte 12: Foreground Push Handler

### O que fazer
Criar hook que escuta mensagens do SW e exibe toast customizado em vez de notificação do sistema.

### Código: src/hooks/useForegroundPushHandler.ts

```typescript
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useForegroundPushHandler() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_FOREGROUND') {
        const notification = event.data.notification;
        toast(notification.title, {
          description: notification.body,
          duration: 5000,
          action: notification.data?.url ? {
            label: 'Abrir',
            onClick: () => { window.location.href = notification.data.url; },
          } : undefined,
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);
}
```

### Fluxo

```
Push chega com app aberto →
  sw-push.js detecta app visível →
  postMessage({ type: 'PUSH_NOTIFICATION_FOREGROUND', notification }) →
  useForegroundPushHandler escuta →
  Exibe toast customizado via sonner
```

---

## Parte 13: Tabela push_logs

### O que fazer
Criar a tabela para armazenar logs de notificações enviadas.

### SQL de criação

```sql
CREATE TABLE public.push_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  notification_type TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  device_name TEXT,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  latency_ms INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push logs"
  ON public.push_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert push logs"
  ON public.push_logs FOR INSERT
  WITH CHECK (true);
```

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| user_id | UUID | ID do usuário destinatário |
| title | TEXT | Título da notificação |
| body | TEXT | Corpo da notificação |
| data | JSONB | Dados extras (recipients, used_fallback, tipo, etc) |
| notification_type | TEXT | test, due_date, daily_reminder, achievement, pomodoro |
| status | TEXT | sent, no_recipients, failed |
| error_message | TEXT | Mensagem de erro (se houver) |
| device_name | TEXT | 'OneSignal' |
| delivered_at | TIMESTAMPTZ | Quando foi entregue |
| clicked_at | TIMESTAMPTZ | Quando foi clicada |
| latency_ms | INTEGER | Latência de entrega |

---

## Parte 14: iOS Específico

### Limitação Fundamental
**Service Workers são suspensos quando a PWA é fechada no iOS.** Push notifications só funcionam de forma confiável quando o app está em foreground.

### Fluxo Obrigatório no iOS

```
1. Abrir site no Safari iOS 16.4+
2. Tocar Compartilhar → "Adicionar à Tela de Início"
3. Abrir app pela tela inicial (NÃO pelo Safari)
4. Clicar "Ativar Notificações"
5. Aceitar permissão nativa
6. Aguardar 2s (buffer para subscription ativar)
7. external_id vinculado automaticamente
```

### Meta Tags Obrigatórias

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="App" />
<link rel="apple-touch-icon" sizes="180x180" href="/pwa-icon.png" />
<link rel="apple-touch-icon" sizes="152x152" href="/pwa-icon.png" />
<link rel="apple-touch-icon" sizes="120x120" href="/pwa-icon.png" />
<link rel="apple-touch-startup-image" href="/pwa-icon.png" />
```

### Race Condition do iOS (RESOLVIDA)

O iOS é mais lento para criar a subscription após conceder permissão. A solução é:

1. Chamar `requestPermission()` primeiro (cria subscriber)
2. Aguardar `2000ms` (buffer para iOS)
3. Verificar `isSubscribed()`
4. Só então chamar `login(userId)` (vincula external_id)
5. E `addTags()` (redundância)

Adicionalmente, um listener de `subscriptionChange` re-faz o login automaticamente se a subscription for criada com atraso.

### Banner Instrutivo

O componente `AddToHomeScreenBanner` aparece apenas para:
- Dispositivos iOS
- Quando NÃO está em modo standalone
- Após 5 segundos de engajamento
- Se não foi dismissado nos últimos 14 dias

---

## Parte 15: Checklist Final

### Ordem Exata de Implementação

1. ✅ Instalar `vite-plugin-pwa`
2. ✅ Configurar `vite.config.ts` com VitePWA
3. ✅ Criar `public/manifest.json`
4. ✅ Configurar meta tags no `index.html`
5. ✅ Criar `public/sw-push.js`
6. ✅ Configurar `main.tsx` com `registerSW`
7. ✅ Criar `offlineSync.ts` e `backgroundSync.ts`
8. ✅ Criar `InstallPrompt.tsx` e `AddToHomeScreenBanner.tsx`
9. ✅ Criar conta OneSignal e configurar dashboard
10. ✅ Criar `public/OneSignalSDKWorker.js`
11. ✅ Adicionar CDN script no `index.html` COM proteção de domínio
12. ✅ Criar `oneSignalProvider.ts`
13. ✅ Criar `useOneSignal.ts` com fluxo de subscribe correto
14. ✅ Criar edge function `send-onesignal` com entrega dupla
15. ✅ Adicionar secrets: `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`
16. ✅ Criar tabela `push_logs` com RLS
17. ✅ Criar `oneSignalNotifier.ts`
18. ✅ Criar `useDueDateAlerts.ts`
19. ✅ Criar `useForegroundPushHandler.ts`
20. ✅ Criar `OneSignalSettings.tsx` (UI)
21. ✅ Criar `usePWAUpdate.ts`

### Verificações Pós-Implementação

- [ ] PWA instala corretamente no Android/Chrome
- [ ] PWA instala corretamente no iOS (Add to Home Screen)
- [ ] App funciona offline (navegação, visualização de dados cacheados)
- [ ] Sync automático ao voltar online
- [ ] OneSignal inicializa apenas nos domínios permitidos
- [ ] Notificações funcionam no Android/Desktop
- [ ] Notificações funcionam no iOS (quando app está aberto)
- [ ] External User ID aparece no diagnóstico (não "N/A")
- [ ] Edge function logs mostram `recipients > 0`
- [ ] Fallback por tag funciona quando external_id falha
- [ ] Toast customizado aparece quando push chega com app aberto
- [ ] Notificação do sistema aparece quando app está fechado

### Testes por Plataforma

| Plataforma | Teste | Resultado Esperado |
|-----------|-------|-------------------|
| Android Chrome | Instalar PWA | Ícone na home, modo standalone |
| Android Chrome | Ativar push + testar | Notificação recebida |
| Android Chrome | Fechar app + enviar push | Notificação do sistema |
| Desktop Chrome | Ativar push + testar | Notificação recebida |
| Desktop Chrome | App aberto + push | Toast customizado |
| iOS Safari | Add to Home Screen | Ícone na home |
| iOS PWA | Ativar push | Permissão concedida, external_id vinculado |
| iOS PWA | App aberto + push | Toast customizado |
| iOS PWA | App fechado + push | ⚠️ Pode não receber (limitação iOS) |

---

## Parte 16: Troubleshooting

### Problemas Comuns

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| `recipients: 0` | external_id não vinculado | Verificar ordem: permission → wait 2s → login |
| Push não chega iOS | App aberto pelo Safari | Instruir: abrir pela tela inicial |
| SDK não carrega | Domínio fora de ALLOWED_DOMAINS | Adicionar domínio |
| External User ID: N/A | login() antes da subscription | Corrigir ordem no subscribe |
| Warning "included_segments ignored" | Misturou segments com filters | Usar APENAS filters no fallback |
| Loop de erros no preview | OneSignal init em domínio errado | Proteção de domínio no script |
| Permission "denied" | Usuário bloqueou | Desbloquear via cadeado do browser |
| Foreground notification dupla | SW e client ambos exibindo | sw-push.js verifica visibilidade |

### Como Debugar external_id null

1. Abrir app → Settings → OneSignal card
2. Verificar "External User ID" no diagnóstico
3. Se "N/A": o login() falhou
4. Verificar console: procurar `[OneSignal] External user ID set:`
5. Se não aparece: verificar se `supabase.auth.getUser()` retorna user
6. Se retorna: verificar se `OneSignal.login()` é chamado DEPOIS da permission
7. Testar: desativar → reativar notificações → verificar diagnóstico novamente

### Como Verificar Entrega nos Logs

```sql
SELECT status, data->>'recipients' as recipients, data->>'used_fallback' as fallback, error_message
FROM push_logs
WHERE user_id = 'UUID'
ORDER BY timestamp DESC
LIMIT 10;
```

- `status: 'sent'` + `recipients > 0` → ✅ Entregue
- `status: 'no_recipients'` + `fallback: true` → ❌ Nenhum dispositivo
- `status: 'failed'` → ❌ Erro na API

### Como Testar Fallback por Tag

1. No dashboard OneSignal: verificar se o subscriber tem a tag `user_id`
2. Na edge function: procurar log "trying fallback by tag user_id"
3. Se fallback também falha: a tag não foi definida no subscriber
4. Solução: garantir que `addTags({ user_id })` é chamado no subscribe e em cada carregamento
