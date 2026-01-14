import OneSignal from 'react-onesignal';
import { logger, prodLogger } from '@/lib/logger';

let initPromise: Promise<boolean> | null = null;

export const initOneSignal = async (): Promise<boolean> => {
  // Se já existe uma promessa de inicialização, aguardar ela
  if (initPromise) {
    logger.log('[OneSignal] Returning existing init promise');
    return initPromise;
  }

  // App ID é público e seguro de expor no frontend
  const appId = '36035405-9aa5-4e4f-b6cf-237d873bcd47';

  initPromise = (async () => {
    try {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: {
          scope: '/',
        },
        serviceWorkerPath: '/OneSignalSDKWorker.js',
      });

      logger.log('[OneSignal] Initialized successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Se o SDK já foi inicializado, tratamos como sucesso
      if (errorMessage.includes('already initialized')) {
        logger.log('[OneSignal] SDK was already initialized (OK)');
        return true;
      }

      prodLogger.error('[OneSignal] Init error:', error);
      initPromise = null; // Reset para permitir retry
      return false;
    }
  })();

  return initPromise;
};

export const oneSignalUtils = {
  // Verificar se está inicializado
  isInitialized(): boolean {
    return initPromise !== null;
  },

  // Solicitar permissão de notificação E fazer opt-in
  async requestPermission(): Promise<boolean> {
    try {
      // 1. Solicitar permissão nativa do navegador
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        logger.warn('[OneSignal] Permission denied by user');
        return false;
      }
      
      // 2. Fazer opt-in no OneSignal (CRÍTICO!)
      await OneSignal.User.PushSubscription.optIn();
      logger.log('[OneSignal] Permission granted and opted in');
      
      return true;
    } catch (error) {
      prodLogger.error('[OneSignal] Permission request error:', error);
      return false;
    }
  },

  // Verificar se está inscrito
  async isSubscribed(): Promise<boolean> {
    try {
      const subscription = OneSignal.User.PushSubscription;
      return subscription.optedIn ?? false;
    } catch (error) {
      prodLogger.error('[OneSignal] Subscription check error:', error);
      return false;
    }
  },

  // Obter ID do push subscription
  async getSubscriptionId(): Promise<string | null> {
    try {
      const subscription = OneSignal.User.PushSubscription;
      return subscription.id ?? null;
    } catch (error) {
      prodLogger.error('[OneSignal] Get subscription ID error:', error);
      return null;
    }
  },

  // Vincular usuário Supabase ao OneSignal
  async setExternalUserId(userId: string): Promise<void> {
    try {
      await OneSignal.login(userId);
      logger.log('[OneSignal] External user ID set:', userId);
    } catch (error) {
      prodLogger.error('[OneSignal] Set external user ID error:', error);
    }
  },

  // Adicionar tags para segmentação
  async addTags(tags: Record<string, string>): Promise<void> {
    try {
      await OneSignal.User.addTags(tags);
      logger.log('[OneSignal] Tags added:', tags);
    } catch (error) {
      prodLogger.error('[OneSignal] Add tags error:', error);
    }
  },

  // Remover tags
  async removeTags(tagKeys: string[]): Promise<void> {
    try {
      await OneSignal.User.removeTags(tagKeys);
      logger.log('[OneSignal] Tags removed:', tagKeys);
    } catch (error) {
      prodLogger.error('[OneSignal] Remove tags error:', error);
    }
  },

  // Cancelar inscrição
  async unsubscribe(): Promise<void> {
    try {
      await OneSignal.User.PushSubscription.optOut();
      logger.log('[OneSignal] Unsubscribed');
    } catch (error) {
      prodLogger.error('[OneSignal] Unsubscribe error:', error);
    }
  },

  // Reinscrever
  async resubscribe(): Promise<void> {
    try {
      await OneSignal.User.PushSubscription.optIn();
      logger.log('[OneSignal] Resubscribed');
    } catch (error) {
      prodLogger.error('[OneSignal] Resubscribe error:', error);
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
      logger.log('[OneSignal] Logged out');
    } catch (error) {
      prodLogger.error('[OneSignal] Logout error:', error);
    }
  },
};

export default OneSignal;
