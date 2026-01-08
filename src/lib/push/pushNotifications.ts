/**
 * Utilitários de notificação local (browser)
 * Para push notifications via OneSignal, use src/lib/notifications/oneSignalNotifier.ts
 */

// Schedule local notification (fallback when push not available)
export function scheduleLocalNotification(
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
}

// Schedule local reminder with Notification API (iOS fallback)
export function scheduleLocalReminder(
  title: string,
  body: string,
  dueDate: Date,
  taskId: string
): void {
  const now = new Date();
  const delay = dueDate.getTime() - now.getTime();

  if (delay <= 0) {
    // Due date is in the past, show immediately
    scheduleLocalNotification(title, body, 0, `reminder-${taskId}`);
    return;
  }

  // Schedule notifications at 1 hour and 15 minutes before
  const oneHourBefore = delay - 60 * 60 * 1000;
  const fifteenMinBefore = delay - 15 * 60 * 1000;

  if (oneHourBefore > 0) {
    scheduleLocalNotification(
      `⏰ ${title}`,
      `Prazo em 1 hora: ${body}`,
      oneHourBefore,
      `reminder-1h-${taskId}`
    );
  }

  if (fifteenMinBefore > 0) {
    scheduleLocalNotification(
      `🚨 ${title}`,
      `Prazo em 15 minutos: ${body}`,
      fifteenMinBefore,
      `reminder-15m-${taskId}`
    );
  }

  // Notification at due time
  scheduleLocalNotification(
    `⚠️ ${title}`,
    `Prazo agora: ${body}`,
    delay,
    `reminder-now-${taskId}`
  );
}

// Check if push notifications are supported
export function isNotificationSupported(): boolean {
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

// Get permission status
export function getPermissionStatus(): NotificationPermission {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

// Get device name for identification
export function getDeviceName(): string {
  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(ua)) {
    return "iOS Device";
  } else if (/Android/.test(ua)) {
    return "Android Device";
  } else if (/Mac/.test(ua)) {
    return "Mac";
  } else if (/Win/.test(ua)) {
    return "Windows PC";
  } else if (/Linux/.test(ua)) {
    return "Linux PC";
  }

  return "Unknown Device";
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    throw new Error("Este navegador não suporta notificações");
  }

  return await Notification.requestPermission();
}

// Legacy export for backwards compatibility
export const pushNotifications = {
  scheduleLocalNotification,
  scheduleLocalReminder,
  isSupported: isNotificationSupported,
  getPermissionStatus,
  getDeviceName,
  requestPermission: requestNotificationPermission,
};
