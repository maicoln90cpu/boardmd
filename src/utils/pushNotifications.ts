import { supabase } from "@/integrations/supabase/client";

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const pushNotifications = {
  // Solicitar permissão para notificações
  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      throw new Error("Este navegador não suporta notificações");
    }

    if (!("serviceWorker" in navigator)) {
      throw new Error("Service Worker não disponível");
    }

    return await Notification.requestPermission();
  },

  // Registrar subscription de push
  async subscribe(): Promise<PushSubscriptionJSON | null> {
    if (!("serviceWorker" in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Verificar se já tem subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Criar nova subscription
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });
      }

      // Salvar subscription no Supabase (se necessário)
      const subscriptionJson = subscription.toJSON();
      await this.saveSubscription(subscriptionJson);

      return subscriptionJson;
    } catch (error) {
      console.error("Erro ao registrar push subscription:", error);
      return null;
    }
  },

  // Salvar subscription no backend
  async saveSubscription(subscription: PushSubscriptionJSON): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Salvar em localStorage por enquanto (pode ser expandido para o backend)
    localStorage.setItem(
      `push-subscription-${user.id}`,
      JSON.stringify(subscription)
    );
  },

  // Cancelar subscription
  async unsubscribe(): Promise<void> {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          localStorage.removeItem(`push-subscription-${user.id}`);
        }
      }
    } catch (error) {
      console.error("Erro ao cancelar push subscription:", error);
    }
  },

  // Agendar notificação local (fallback para quando push não está disponível)
  scheduleLocalNotification(
    title: string,
    body: string,
    delay: number,
    tag: string
  ): void {
    setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/pwa-icon.png",
          badge: "/favicon.png",
          tag,
          requireInteraction: false,
        });
      }
    }, delay);
  },

  // Verificar se push notifications estão disponíveis
  isSupported(): boolean {
    return (
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );
  },

  // Obter status da permissão
  getPermissionStatus(): NotificationPermission {
    if (!("Notification" in window)) return "denied";
    return Notification.permission;
  },
};
