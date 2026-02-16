import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceName } from "@/lib/push/pushNotifications";
import { getPushSWRegistration } from "@/lib/push/swPushRegistration";
import { logger } from "@/lib/logger";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useVapidPush() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(true);

  // Check initial state
  useEffect(() => {
    const checkStatus = async () => {
      const supported =
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);

        try {
          const registration = await getPushSWRegistration();
          const subscription = await (registration as any).pushManager?.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (e) {
          logger.error("[useVapidPush] Error checking subscription:", e);
        }
      }

      setIsLoading(false);
    };

    checkStatus();
  }, []);

  const subscribe = useCallback(async () => {
    try {
      setIsLoading(true);

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        logger.error("[useVapidPush] VAPID public key not found");
        return false;
      }

      // Use the dedicated push SW for VAPID subscriptions
      const registration = await getPushSWRegistration();

      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        logger.error("[useVapidPush] Invalid subscription");
        return false;
      }

      // Save to push_subscriptions table
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          device_name: getDeviceName(),
        },
        { onConflict: "endpoint" }
      );

      if (error) {
        logger.error("[useVapidPush] Error saving subscription:", error);
        return false;
      }

      setIsSubscribed(true);
      logger.log("[useVapidPush] Subscribed successfully");
      return true;
    } catch (e: any) {
      const msg = e?.message || String(e);
      logger.error("[useVapidPush] Subscribe error:", msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true);

      const registration = await getPushSWRegistration();
      const subscription = await (registration as any).pushManager?.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", endpoint);
      }

      setIsSubscribed(false);
      return true;
    } catch (e) {
      logger.error("[useVapidPush] Unsubscribe error:", e);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendTestNotification = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.functions.invoke("send-vapid-push", {
        body: {
          user_id: user.id,
          title: "🔔 Teste VAPID Push",
          body: "Se você viu isso, o push direto está funcionando!",
          notification_type: "test",
          url: "/",
        },
      });

      return !error;
    } catch {
      return false;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
