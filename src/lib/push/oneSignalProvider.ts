import { logger, prodLogger } from '@/lib/logger';

// OneSignal is initialized via CDN script in index.html
// We use window.OneSignal directly instead of react-onesignal package

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

const ALLOWED_DOMAINS = ['board.infoprolab.com.br', 'localhost'];

let initialized = false;
const subscriptionChangeCallbacks: Set<() => void> = new Set();

/**
 * Wait for OneSignal SDK to be ready (loaded via CDN in index.html)
 */
export const initOneSignal = async (): Promise<boolean> => {
  if (initialized) return true;

  const hostname = window.location.hostname;
  const isAllowed = ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));

  if (!isAllowed) {
    logger.warn(`[OneSignal] Domain "${hostname}" not allowed. OneSignal only works on: ${ALLOWED_DOMAINS.join(', ')}`);
    return false;
  }

  try {
    // Wait up to 5s for the SDK to load from CDN
    let attempts = 0;
    while (!window.OneSignal && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    if (!window.OneSignal) {
      prodLogger.error('[OneSignal] SDK not loaded after 5s. Check CDN script in index.html');
      return false;
    }

    // SDK is already initialized by the script in index.html via OneSignalDeferred
    // Just set up event listeners
    setupEventListeners();
    initialized = true;
    logger.log('[OneSignal] SDK ready');
    return true;
  } catch (error) {
    prodLogger.error('[OneSignal] Init error:', error);
    return false;
  }
};

function setupEventListeners() {
  try {
    const OS = window.OneSignal;
    if (!OS?.Notifications) return;

    OS.Notifications.addEventListener('click', (event: any) => {
      logger.log('[OneSignal] Notification clicked:', event?.notification?.title);
    });

    OS.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
      logger.log('[OneSignal] Foreground notification:', event?.notification?.title);
    });

    OS.Notifications.addEventListener('permissionChange', (permission: boolean) => {
      logger.log('[OneSignal] Permission changed:', permission);
    });

    OS.User?.PushSubscription?.addEventListener('change', (subscription: any) => {
      logger.log('[OneSignal] Subscription changed:', {
        optedIn: subscription?.current?.optedIn,
        id: subscription?.current?.id,
      });
      // Notify all registered callbacks (used to re-link external_id on iOS)
      if (subscription?.current?.optedIn) {
        subscriptionChangeCallbacks.forEach(cb => {
          try { cb(); } catch (e) { prodLogger.error('[OneSignal] Subscription callback error:', e); }
        });
      }
    });

    logger.log('[OneSignal] Event listeners registered');
  } catch (error) {
    prodLogger.error('[OneSignal] Error setting up event listeners:', error);
  }
}

function getOS() {
  return window.OneSignal;
}

export const oneSignalUtils = {
  isInitialized(): boolean {
    return initialized;
  },

  onSubscriptionChange(callback: () => void): void {
    subscriptionChangeCallbacks.add(callback);
  },

  offSubscriptionChange(callback: () => void): void {
    subscriptionChangeCallbacks.delete(callback);
  },

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        logger.warn('[OneSignal] Permission denied by user');
        return false;
      }
      await getOS()?.User?.PushSubscription?.optIn();
      logger.log('[OneSignal] Permission granted and opted in');
      return true;
    } catch (error) {
      prodLogger.error('[OneSignal] Permission request error:', error);
      return false;
    }
  },

  async isSubscribed(): Promise<boolean> {
    try {
      return getOS()?.User?.PushSubscription?.optedIn ?? false;
    } catch (error) {
      return false;
    }
  },

  async getSubscriptionId(): Promise<string | null> {
    try {
      return getOS()?.User?.PushSubscription?.id ?? null;
    } catch {
      return null;
    }
  },

  async setExternalUserId(userId: string): Promise<void> {
    try {
      await getOS()?.login(userId);
      logger.log('[OneSignal] External user ID set:', userId);
    } catch (error) {
      prodLogger.error('[OneSignal] Set external user ID error:', error);
    }
  },

  async addTags(tags: Record<string, string>): Promise<void> {
    try {
      await getOS()?.User?.addTags(tags);
      logger.log('[OneSignal] Tags added:', tags);
    } catch (error) {
      prodLogger.error('[OneSignal] Add tags error:', error);
    }
  },

  async removeTags(tagKeys: string[]): Promise<void> {
    try {
      await getOS()?.User?.removeTags(tagKeys);
    } catch (error) {
      prodLogger.error('[OneSignal] Remove tags error:', error);
    }
  },

  async unsubscribe(): Promise<void> {
    try {
      await getOS()?.User?.PushSubscription?.optOut();
      logger.log('[OneSignal] Unsubscribed');
    } catch (error) {
      prodLogger.error('[OneSignal] Unsubscribe error:', error);
    }
  },

  async resubscribe(): Promise<void> {
    try {
      await getOS()?.User?.PushSubscription?.optIn();
    } catch (error) {
      prodLogger.error('[OneSignal] Resubscribe error:', error);
    }
  },

  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  },

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  },

  async logout(): Promise<void> {
    try {
      await getOS()?.logout();
    } catch (error) {
      prodLogger.error('[OneSignal] Logout error:', error);
    }
  },

  /** Diagnostic info for UI */
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
      // Try to get external_id from User identity
      const identity = OS?.User?.getIdentity?.();
      externalId = identity?.external_id || OS?.User?.onesignalId || 'N/A';
    } catch {}

    return {
      'App ID': '36035...47',
      'Domínio': isAllowed ? `✅ ${hostname}` : `❌ ${hostname} (esperado: board.infoprolab.com.br)`,
      'SDK Carregado': OS ? '✅ Sim' : '❌ Não',
      'Permissão': Notification.permission,
      'Service Worker': swStatus,
      'Subscription ID': subscriptionId,
      'External User ID': externalId,
    };
  },
};
