import { supabase } from "@/integrations/supabase/client";

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const pushNotifications = {
  // Request permission for notifications
  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      throw new Error("Este navegador não suporta notificações");
    }

    if (!("serviceWorker" in navigator)) {
      throw new Error("Service Worker não disponível");
    }

    return await Notification.requestPermission();
  },

  // Subscribe to push notifications
  async subscribe(): Promise<PushSubscriptionJSON | null> {
    if (!("serviceWorker" in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        
        if (!vapidPublicKey) {
          console.error('VAPID public key not configured');
          return null;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });
      }

      // Save subscription to Supabase
      const subscriptionJson = subscription.toJSON();
      await this.saveSubscription(subscriptionJson);

      return subscriptionJson;
    } catch (error) {
      console.error("Erro ao registrar push subscription:", error);
      return null;
    }
  },

  // Save subscription to Supabase
  async saveSubscription(subscription: PushSubscriptionJSON): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !subscription.endpoint || !subscription.keys) return;

    try {
      // Get device name
      const deviceName = this.getDeviceName();

      // Insert or update subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          device_name: deviceName,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) {
        console.error('Error saving subscription:', error);
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
    }
  },

  // Remove subscription
  async unsubscribe(): Promise<void> {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user && subscription.endpoint) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint);
        }
      }
    } catch (error) {
      console.error("Erro ao cancelar push subscription:", error);
    }
  },

  // Get active subscriptions for current user
  async getActiveSubscriptions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }

    return data || [];
  },

  // Remove specific subscription by ID
  async removeSubscription(subscriptionId: string): Promise<void> {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) {
      console.error('Error removing subscription:', error);
      throw error;
    }
  },

  // Get push logs for current user
  async getPushLogs(limit = 50) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('push_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching push logs:', error);
      return [];
    }

    return data || [];
  },

  // Schedule local notification (fallback when push not available)
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

  // Schedule local reminder with Notification API (iOS fallback)
  scheduleLocalReminder(
    title: string,
    body: string,
    dueDate: Date,
    taskId: string
  ): void {
    const now = new Date();
    const delay = dueDate.getTime() - now.getTime();

    if (delay <= 0) {
      // Due date is in the past, show immediately
      this.scheduleLocalNotification(title, body, 0, `reminder-${taskId}`);
      return;
    }

    // Schedule notifications at 1 hour and 15 minutes before
    const oneHourBefore = delay - (60 * 60 * 1000);
    const fifteenMinBefore = delay - (15 * 60 * 1000);

    if (oneHourBefore > 0) {
      this.scheduleLocalNotification(
        `⏰ ${title}`,
        `Prazo em 1 hora: ${body}`,
        oneHourBefore,
        `reminder-1h-${taskId}`
      );
    }

    if (fifteenMinBefore > 0) {
      this.scheduleLocalNotification(
        `🚨 ${title}`,
        `Prazo em 15 minutos: ${body}`,
        fifteenMinBefore,
        `reminder-15m-${taskId}`
      );
    }

    // Notification at due time
    this.scheduleLocalNotification(
      `⚠️ ${title}`,
      `Prazo agora: ${body}`,
      delay,
      `reminder-now-${taskId}`
    );
  },

  // Send push notification via Edge Function
  async sendPushNotification(payload: {
    user_id?: string;
    title: string;
    body: string;
    data?: any;
    url?: string;
    notification_type?: string;
  }): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: payload,
      });

      if (error) throw error;
      
      if (import.meta.env.DEV) console.log('Push notification sent:', data);
      return data;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  },

  // Check if push notifications are supported
  isSupported(): boolean {
    return (
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );
  },

  // Get permission status
  getPermissionStatus(): NotificationPermission {
    if (!("Notification" in window)) return "denied";
    return Notification.permission;
  },

  // Get device name for identification
  getDeviceName(): string {
    const ua = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/.test(ua)) {
      return 'iOS Device';
    } else if (/Android/.test(ua)) {
      return 'Android Device';
    } else if (/Mac/.test(ua)) {
      return 'Mac';
    } else if (/Win/.test(ua)) {
      return 'Windows PC';
    } else if (/Linux/.test(ua)) {
      return 'Linux PC';
    }
    
    return 'Unknown Device';
  },
};
