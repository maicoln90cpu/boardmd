import { toast } from 'sonner';
import { logger, prodLogger } from '@/lib/logger';

export class PWAUpdater {
  private static registration: ServiceWorkerRegistration | null = null;
  private static updateAvailable = false;

  static async initialize() {
    if (!('serviceWorker' in navigator)) {
      logger.log('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.registration = registration;

      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Listen for new service worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.showUpdateNotification();
            }
          });
        }
      });

      // Handle controller change (when new SW takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.updateAvailable) {
          window.location.reload();
        }
      });

    } catch (error) {
      prodLogger.error('SW registration failed:', error);
    }
  }

  private static showUpdateNotification() {
    toast.info(
      'Nova versão disponível!',
      {
        duration: Infinity,
        action: {
          label: 'Atualizar',
          onClick: () => this.applyUpdate(),
        },
        cancel: {
          label: 'Depois',
          onClick: () => {},
        },
      }
    );
  }

  static async applyUpdate() {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    // Tell the waiting service worker to activate
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    toast.success('Atualizando aplicativo...');
  }

  static async checkForUpdates() {
    if (this.registration) {
      try {
        await this.registration.update();
        logger.log('Checked for updates');
      } catch (error) {
        prodLogger.error('Update check failed:', error);
      }
    }
  }
}
