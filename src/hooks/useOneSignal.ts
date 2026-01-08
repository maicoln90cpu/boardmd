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
      
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        const initialized = await initOneSignal();
        setIsInitialized(initialized);
        
        if (initialized) {
          // Aguardar um momento para o SDK estar totalmente pronto
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const subscribed = await oneSignalUtils.isSubscribed();
          setIsSubscribed(subscribed);
          setPermission(Notification.permission);
        }
      }
      
      setIsLoading(false);
    };

    init();
  }, []);

  // Solicitar permissão e inscrever
  const subscribe = useCallback(async () => {
    if (!isInitialized) {
      console.warn('[useOneSignal] Not initialized, trying to initialize...');
      const initialized = await initOneSignal();
      if (!initialized) {
        console.error('[useOneSignal] Failed to initialize');
        return false;
      }
    }

    try {
      setIsLoading(true);
      
      // 1. Primeiro, vincular o usuário Supabase ANTES de solicitar permissão
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('[useOneSignal] Linking user:', user.id);
        await oneSignalUtils.setExternalUserId(user.id);
      }
      
      // 2. Solicitar permissão (o opt-in acontece após permissão)
      await oneSignalUtils.requestPermission();
      
      // 3. Aguardar um pouco para a inscrição propagar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 4. Adicionar tags após inscrição
      if (user) {
        await oneSignalUtils.addTags({
          app_version: '1.1',
          platform: 'web',
          user_id: user.id,
        });
        console.log('[useOneSignal] Tags added for user:', user.id);
      }
      
      const subscribed = await oneSignalUtils.isSubscribed();
      setIsSubscribed(subscribed);
      setPermission(Notification.permission);
      
      console.log('[useOneSignal] Subscribe complete. Subscribed:', subscribed);
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
