import { useState, useEffect, useCallback } from 'react';
import { oneSignalUtils, initOneSignal } from '@/lib/push/oneSignalProvider';
import { supabase } from '@/integrations/supabase/client';

export function useOneSignal() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);

  // Verificar status inicial
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      const supported = oneSignalUtils.isSupported();
      setIsSupported(supported);
      
      if (supported) {
        const initialized = await initOneSignal();
        setIsInitialized(initialized);
        
        if (initialized) {
          const subscribed = await oneSignalUtils.isSubscribed();
          setIsSubscribed(subscribed);
          setPermission(oneSignalUtils.getPermissionStatus());
        }
      }
      
      setIsLoading(false);
    };

    init();
  }, []);

  // Solicitar permissão e inscrever
  const subscribe = useCallback(async () => {
    if (!isInitialized) {
      console.warn('[useOneSignal] Not initialized');
      return false;
    }

    try {
      setIsLoading(true);
      
      // Solicitar permissão
      await oneSignalUtils.requestPermission();
      
      // Vincular ao usuário Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await oneSignalUtils.setExternalUserId(user.id);
        await oneSignalUtils.addTags({
          app_version: '1.1',
          platform: 'web',
        });
      }
      
      const subscribed = await oneSignalUtils.isSubscribed();
      setIsSubscribed(subscribed);
      setPermission(oneSignalUtils.getPermissionStatus());
      
      return subscribed;
    } catch (error) {
      console.error('[useOneSignal] Subscribe error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Cancelar inscrição
  const unsubscribe = useCallback(async () => {
    if (!isInitialized) return false;

    try {
      setIsLoading(true);
      await oneSignalUtils.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('[useOneSignal] Unsubscribe error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Enviar notificação de teste
  const sendTestNotification = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[useOneSignal] No user for test notification');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('send-onesignal', {
        body: {
          user_id: user.id,
          title: '🔔 Teste OneSignal',
          body: 'Se você viu isso, as notificações estão funcionando!',
          notification_type: 'test',
          url: '/',
        },
      });

      if (error) {
        console.error('[useOneSignal] Test notification error:', error);
        return false;
      }

      console.log('[useOneSignal] Test notification sent:', data);
      return true;
    } catch (error) {
      console.error('[useOneSignal] Test notification error:', error);
      return false;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isInitialized,
    permission,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
