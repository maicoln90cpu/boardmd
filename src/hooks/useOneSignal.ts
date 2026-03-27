import { useState, useEffect, useCallback, useRef } from 'react';
import { initOneSignal, oneSignalUtils } from '@/lib/push/oneSignalProvider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export function useOneSignal() {
  const { user } = useAuth();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        const initialized = await initOneSignal();
        setIsInitialized(initialized);
        
        if (!initialized) {
          const hostname = window.location.hostname;
          if (hostname !== 'taskflow.infoprolab.com.br' && hostname !== 'localhost') {
            setInitError(`Disponível apenas em taskflow.infoprolab.com.br (atual: ${hostname})`);
          } else {
            setInitError('Falha ao carregar SDK OneSignal');
          }
        } else {
          // Vincular external_id em cada carregamento para garantir entrega via API
          const currentUser = userRef.current;
          if (currentUser) {
            await oneSignalUtils.setExternalUserId(currentUser.id);
            await oneSignalUtils.addTags({
              app_version: '1.1',
              platform: 'web',
              user_id: currentUser.id,
            });
          }
          await new Promise(resolve => setTimeout(resolve, 500));
          const subscribed = await oneSignalUtils.isSubscribed();
          setIsSubscribed(subscribed);
          setPermission(Notification.permission);
        }

        // Load diagnostics
        const diag = await oneSignalUtils.getDiagnostics();
        setDiagnostics(diag);
      }
      
      setIsLoading(false);
    };

    init();
  }, []);

  // Register subscription change callback to re-link external_id on iOS
  useEffect(() => {
    if (!isInitialized) return;

    const handleSubscriptionChange = async () => {
      const currentUser = userRef.current;
      if (currentUser) {
        logger.log('[useOneSignal] Subscription changed, re-linking external_id');
        await oneSignalUtils.setExternalUserId(currentUser.id);
        await oneSignalUtils.addTags({
          app_version: '1.1',
          platform: 'web',
          user_id: currentUser.id,
        });
        const subscribed = await oneSignalUtils.isSubscribed();
        setIsSubscribed(subscribed);
      }
    };

    oneSignalUtils.onSubscriptionChange(handleSubscriptionChange);
    return () => oneSignalUtils.offSubscriptionChange(handleSubscriptionChange);
  }, [isInitialized]);

  const subscribe = useCallback(async () => {
    if (!isInitialized) {
      const initialized = await initOneSignal();
      if (!initialized) return false;
    }

    try {
      setIsLoading(true);
      
      // 1. Request permission FIRST — creates the subscriber on iOS
      const permissionGranted = await oneSignalUtils.requestPermission();
      if (!permissionGranted) {
        setPermission(Notification.permission);
        return false;
      }
      
      // 2. Wait for iOS PWA subscription to activate (iOS is slower)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const subscribed = await oneSignalUtils.isSubscribed();
      
      // 3. AFTER subscription exists, link external_id and tags
      const currentUser = userRef.current;
      if (subscribed && currentUser) {
        await oneSignalUtils.setExternalUserId(currentUser.id);
        await oneSignalUtils.addTags({
          app_version: '1.1',
          platform: 'web',
          user_id: currentUser.id,
        });
      }
      
      setIsSubscribed(subscribed);
      setPermission(Notification.permission);
      return subscribed;
    } catch (error) {
      logger.error('[useOneSignal] Subscribe error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const unsubscribe = useCallback(async () => {
    if (!isInitialized) return false;
    try {
      setIsLoading(true);
      await oneSignalUtils.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch (error) {
      logger.error('[useOneSignal] Unsubscribe error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  const sendTestNotification = useCallback(async () => {
    try {
      const currentUser = userRef.current;
      if (!currentUser) return false;

      const { error } = await supabase.functions.invoke('send-onesignal', {
        body: {
          user_id: currentUser.id,
          title: '🔔 Teste OneSignal',
          body: 'Se você viu isso, as notificações estão funcionando!',
          notification_type: 'test',
          url: '/',
        },
      });

      if (error) return false;
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isInitialized,
    initError,
    permission,
    isLoading,
    diagnostics,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
