import { logger } from '@/lib/logger';

/**
 * Get the main service worker registration for push.
 * We rely on the Workbox SW which already imports sw-push.js via importScripts.
 * No separate registration needed — avoids scope conflicts.
 */
export async function getPushSWRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported');
  }

  const registration = await navigator.serviceWorker.ready;
  logger.log('[swPushRegistration] Using main SW for push, scope:', registration.scope);
  return registration;
}

/**
 * @deprecated No longer registers a separate SW. Kept for backward compatibility.
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    return await getPushSWRegistration();
  } catch {
    return null;
  }
}
