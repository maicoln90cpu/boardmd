import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Hook to handle push notifications when app is in foreground
 * Listens for messages from service worker and displays custom toasts
 */
export function useForegroundPushHandler() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PUSH_NOTIFICATION_FOREGROUND") {
        const notification = event.data.notification;
        
        // Show custom toast instead of system notification
        toast(notification.title, {
          description: notification.body,
          duration: 5000,
          action: notification.data?.url ? {
            label: "Abrir",
            onClick: () => {
              window.location.href = notification.data.url;
            },
          } : undefined,
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);
}
