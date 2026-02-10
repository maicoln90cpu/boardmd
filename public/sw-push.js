// Custom Push Notification Service Worker
// Handles push events, notification clicks, install and activate

// Immediate activation
self.addEventListener('install', (event) => {
  console.log('[sw-push] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[sw-push] Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', async (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'Nova Notificação',
    body: 'Você tem uma nova atualização',
    icon: '/pwa-icon.png',
    badge: '/favicon.png',
    data: {
      url: '/',
    },
    // Default actions
    actions: [],
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      
      if (payload.notification) {
        notificationData = {
          ...notificationData,
          ...payload.notification,
        };
      } else {
        notificationData = {
          title: payload.title || notificationData.title,
          body: payload.body || notificationData.body,
          icon: payload.icon || notificationData.icon,
          badge: payload.badge || notificationData.badge,
          data: payload.data || notificationData.data,
          actions: payload.actions || notificationData.actions,
        };
      }

      // Add rich notification actions based on notification type
      if (payload.data?.type === 'task_reminder' && payload.data?.taskId) {
        notificationData.actions = [
          { action: 'complete', title: '✓ Concluir', icon: '/pwa-icon.png' },
          { action: 'snooze', title: '⏰ Adiar 1h', icon: '/pwa-icon.png' },
        ];
        notificationData.data = {
          ...notificationData.data,
          taskId: payload.data.taskId,
          type: 'task_reminder',
        };
      } else if (payload.data?.type === 'pomodoro') {
        notificationData.actions = [
          { action: 'start_break', title: '☕ Iniciar Pausa', icon: '/pwa-icon.png' },
          { action: 'skip_break', title: '▶️ Continuar', icon: '/pwa-icon.png' },
        ];
        notificationData.data = {
          ...notificationData.data,
          type: 'pomodoro',
        };
      } else if (payload.data?.type === 'due_date_alert' && payload.data?.taskId) {
        notificationData.actions = [
          { action: 'view', title: '👁️ Ver Tarefa', icon: '/pwa-icon.png' },
          { action: 'snooze', title: '⏰ Adiar 1h', icon: '/pwa-icon.png' },
        ];
        notificationData.data = {
          ...notificationData.data,
          taskId: payload.data.taskId,
          type: 'due_date_alert',
        };
      }
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  // Check if app is in foreground
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  const appIsOpen = windowClients.some(client => client.visibilityState === 'visible');

  if (appIsOpen) {
    // App is open - send message to client to show custom toast instead of system notification
    windowClients.forEach(client => {
      if (client.visibilityState === 'visible') {
        client.postMessage({
          type: 'PUSH_NOTIFICATION_FOREGROUND',
          notification: notificationData,
        });
      }
    });
  } else {
    // App is closed/background - show system notification with actions
    const promiseChain = self.registration.showNotification(
      notificationData.title,
      {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        data: notificationData.data,
        actions: notificationData.actions,
        requireInteraction: notificationData.actions?.length > 0, // Keep notification open if it has actions
        tag: notificationData.data?.taskId || 'app-notification',
        renotify: true,
        vibrate: [200, 100, 200],
      }
    );

    event.waitUntil(promiseChain);
  }
});

self.addEventListener('notificationclick', async (event) => {
  console.log('Notification clicked:', event);
  const { action, notification } = event;
  const data = notification.data || {};

  notification.close();

  // Handle action buttons
  if (action === 'complete' && data.taskId) {
    // Complete the task via API
    event.waitUntil(
      handleTaskAction(data.taskId, 'complete')
    );
    return;
  }

  if (action === 'snooze' && data.taskId) {
    // Snooze the task by 1 hour
    event.waitUntil(
      handleTaskAction(data.taskId, 'snooze')
    );
    return;
  }

  if (action === 'view' && data.taskId) {
    const urlToOpen = `/?task=${data.taskId}`;
    event.waitUntil(
      openOrFocusWindow(urlToOpen)
    );
    return;
  }

  if (action === 'start_break') {
    event.waitUntil(
      openOrFocusWindow('/pomodoro?action=break')
    );
    return;
  }

  if (action === 'skip_break') {
    event.waitUntil(
      openOrFocusWindow('/pomodoro?action=work')
    );
    return;
  }

  // Default click behavior - open the URL from notification data
  const urlToOpen = data.url || '/';
  event.waitUntil(
    openOrFocusWindow(urlToOpen)
  );
});

// Helper function to open or focus existing window
async function openOrFocusWindow(urlToOpen) {
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Check if there's already a window open
  for (const client of windowClients) {
    if ('focus' in client) {
      await client.focus();
      client.postMessage({
        type: 'NAVIGATE_TO',
        url: urlToOpen,
      });
      return;
    }
  }
  
  // If no window is open, open a new one
  if (clients.openWindow) {
    return clients.openWindow(urlToOpen);
  }
}

// Helper function to handle task actions (complete/snooze)
async function handleTaskAction(taskId, action) {
  try {
    // Get any visible client to send message
    const windowClients = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    if (windowClients.length > 0) {
      // Send action to client to handle
      windowClients.forEach(client => {
        client.postMessage({
          type: 'TASK_ACTION',
          taskId,
          action,
        });
      });
      
      // Focus the first available window
      const client = windowClients[0];
      if ('focus' in client) {
        await client.focus();
      }
    } else {
      // No windows open - open app with action parameter
      if (clients.openWindow) {
        const actionUrl = action === 'complete' 
          ? `/?complete_task=${taskId}`
          : `/?snooze_task=${taskId}`;
        return clients.openWindow(actionUrl);
      }
    }
  } catch (error) {
    console.error('Error handling task action:', error);
  }
}

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);

  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) => {
        console.log('Resubscribed:', subscription);
        
        // Send new subscription to server
        return fetch('/api/push-subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription.toJSON()),
        });
      })
  );
});
