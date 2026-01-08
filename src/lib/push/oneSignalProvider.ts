import OneSignal from 'react-onesignal';

let isInitialized = false;

export const initOneSignal = async (): Promise<boolean> => {
  if (isInitialized) {
    console.log('[OneSignal] Already initialized');
    return true;
  }

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  
  if (!appId) {
    console.warn('[OneSignal] App ID not configured');
    return false;
  }

  try {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: {
        scope: '/',
      },
      serviceWorkerPath: '/OneSignalSDKWorker.js',
    });

    isInitialized = true;
    console.log('[OneSignal] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[OneSignal] Init error:', error);
    return false;
  }
};

export const oneSignalUtils = {
  // Verificar se está inicializado
  isInitialized(): boolean {
    return isInitialized;
  },

  // Solicitar permissão de notificação
  async requestPermission(): Promise<boolean> {
    try {
      await OneSignal.Slidedown.promptPush();
      return true;
    } catch (error) {
      console.error('[OneSignal] Permission request error:', error);
      return false;
    }
  },

  // Verificar se está inscrito
  async isSubscribed(): Promise<boolean> {
    try {
      const subscription = OneSignal.User.PushSubscription;
      return subscription.optedIn ?? false;
    } catch (error) {
      console.error('[OneSignal] Subscription check error:', error);
      return false;
    }
  },

  // Obter ID do push subscription
  async getSubscriptionId(): Promise<string | null> {
    try {
      const subscription = OneSignal.User.PushSubscription;
      return subscription.id ?? null;
    } catch (error) {
      console.error('[OneSignal] Get subscription ID error:', error);
      return null;
    }
  },

  // Vincular usuário Supabase ao OneSignal
  async setExternalUserId(userId: string): Promise<void> {
    try {
      await OneSignal.login(userId);
      console.log('[OneSignal] External user ID set:', userId);
    } catch (error) {
      console.error('[OneSignal] Set external user ID error:', error);
    }
  },

  // Adicionar tags para segmentação
  async addTags(tags: Record<string, string>): Promise<void> {
    try {
      await OneSignal.User.addTags(tags);
      console.log('[OneSignal] Tags added:', tags);
    } catch (error) {
      console.error('[OneSignal] Add tags error:', error);
    }
  },

  // Remover tags
  async removeTags(tagKeys: string[]): Promise<void> {
    try {
      await OneSignal.User.removeTags(tagKeys);
      console.log('[OneSignal] Tags removed:', tagKeys);
    } catch (error) {
      console.error('[OneSignal] Remove tags error:', error);
    }
  },

  // Cancelar inscrição
  async unsubscribe(): Promise<void> {
    try {
      await OneSignal.User.PushSubscription.optOut();
      console.log('[OneSignal] Unsubscribed');
    } catch (error) {
      console.error('[OneSignal] Unsubscribe error:', error);
    }
  },

  // Reinscrever
  async resubscribe(): Promise<void> {
    try {
      await OneSignal.User.PushSubscription.optIn();
      console.log('[OneSignal] Resubscribed');
    } catch (error) {
      console.error('[OneSignal] Resubscribe error:', error);
    }
  },

  // Obter permissão atual
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  },

  // Verificar suporte
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  },

  // Logout (remover external user ID)
  async logout(): Promise<void> {
    try {
      await OneSignal.logout();
      console.log('[OneSignal] Logged out');
    } catch (error) {
      console.error('[OneSignal] Logout error:', error);
    }
  },
};

export default OneSignal;
