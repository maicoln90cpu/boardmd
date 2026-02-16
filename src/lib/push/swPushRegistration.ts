import { logger, prodLogger } from '@/lib/logger';

let pushSWRegistration: ServiceWorkerRegistration | null = null;
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Register the dedicated push service worker (sw-push.js) independently
 * from the Workbox PWA service worker. This ensures push notifications
 * work autonomously even if the Workbox SW fails or is updated.
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    if (!('serviceWorker' in navigator)) {
      logger.warn('[swPushRegistration] Service Worker not supported');
      return null;
    }

    try {
      // Register sw-push.js without restrictive scope so it controls all pages
      const registration = await navigator.serviceWorker.register('/sw-push.js');

      pushSWRegistration = registration;
      logger.log('[swPushRegistration] Push SW registered with scope:', registration.scope);

      // Wait for the SW to be active
      if (registration.installing) {
        await new Promise<void>((resolve) => {
          registration.installing!.addEventListener('statechange', (e) => {
            if ((e.target as ServiceWorker).state === 'activated') {
              resolve();
            }
          });
        });
      } else if (registration.waiting) {
        await new Promise<void>((resolve) => {
          registration.waiting!.addEventListener('statechange', (e) => {
            if ((e.target as ServiceWorker).state === 'activated') {
              resolve();
            }
          });
        });
      }

      logger.log('[swPushRegistration] Push SW is active');
      return registration;
    } catch (error) {
      prodLogger.error('[swPushRegistration] Registration failed:', error);
      registrationPromise = null;
      return null;
    }
  })();

  return registrationPromise;
}

/**
 * Get the dedicated push SW registration, or fall back to the main SW
 */
export async function getPushSWRegistration(): Promise<ServiceWorkerRegistration> {
  // Try dedicated push SW first
  if (pushSWRegistration) {
    return pushSWRegistration;
  }

  // Try to register it
  const reg = await registerPushServiceWorker();
  if (reg) return reg;

  // Fallback to main (Workbox) SW
  logger.warn('[swPushRegistration] Falling back to main SW for push');
  return navigator.serviceWorker.ready;
}
