import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger, prodLogger } from '@/lib/logger';

interface PWAUpdateState {
  isChecking: boolean;
  updateAvailable: boolean;
  lastCheck: Date | null;
  isStandalone: boolean;
}

/** Wraps navigator.serviceWorker.ready with a timeout so it never hangs. */
function getRegistrationWithTimeout(ms = 5000): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export function usePWAUpdate() {
  const [state, setState] = useState<PWAUpdateState>({
    isChecking: false,
    updateAvailable: false,
    lastCheck: null,
    isStandalone: false,
  });

  // Check if running as PWA
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setState((prev) => ({ ...prev, isStandalone }));

    const savedLastCheck = localStorage.getItem('pwa_last_update_check');
    if (savedLastCheck) {
      setState((prev) => ({ ...prev, lastCheck: new Date(savedLastCheck) }));
    }
  }, []);

  // Check for service worker updates
  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      toast.error('Service Worker não suportado neste navegador');
      return;
    }

    setState((prev) => ({ ...prev, isChecking: true }));

    try {
      const registration = await getRegistrationWithTimeout(5000);

      if (!registration) {
        setState((prev) => ({ ...prev, isChecking: false }));
        toast.info('Nenhum Service Worker ativo. O app já está atualizado.');
        return;
      }

      await registration.update();

      const now = new Date();
      localStorage.setItem('pwa_last_update_check', now.toISOString());

      if (registration.waiting) {
        setState((prev) => ({
          ...prev,
          updateAvailable: true,
          lastCheck: now,
          isChecking: false,
        }));
        toast.success('Nova versão disponível!', {
          action: {
            label: 'Atualizar',
            onClick: () => applyUpdate(),
          },
        });
      } else {
        setState((prev) => ({
          ...prev,
          updateAvailable: false,
          lastCheck: now,
          isChecking: false,
        }));
        toast.success('App está na versão mais recente');
      }

      logger.log('[PWA] Update check completed');
    } catch (error) {
      prodLogger.error('[PWA] Update check failed:', error);
      setState((prev) => ({ ...prev, isChecking: false }));
      toast.error('Erro ao verificar atualizações');
    }
  }, []);

  // Apply pending update
  const applyUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await getRegistrationWithTimeout(3000);

      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        toast.success('Atualizando aplicativo...');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      prodLogger.error('[PWA] Apply update failed:', error);
      toast.error('Erro ao aplicar atualização');
    }
  }, []);

  // Force reinstall - clear all caches and reload
  const forceReinstall = useCallback(async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        logger.log('[PWA] All caches cleared');
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
        logger.log('[PWA] Service workers unregistered');
      }

      localStorage.setItem('pwa_force_reinstall', Date.now().toString());
      toast.success('Cache limpo. Recarregando...');

      setTimeout(() => {
        window.location.href = window.location.href + '?t=' + Date.now();
      }, 500);
    } catch (error) {
      prodLogger.error('[PWA] Force reinstall failed:', error);
      toast.error('Erro ao reinstalar app');
    }
  }, []);

  // Listen for controller change (new SW activated)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      logger.log('[PWA] Controller changed - new SW active');
      setState((prev) => ({ ...prev, updateAvailable: false }));
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Check for updates on mount and listen for waiting SW
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkWaitingSW = async () => {
      const registration = await getRegistrationWithTimeout(3000);
      if (registration?.waiting) {
        setState((prev) => ({ ...prev, updateAvailable: true }));
      }
    };

    checkWaitingSW();
  }, []);

  return {
    isChecking: state.isChecking,
    updateAvailable: state.updateAvailable,
    lastCheck: state.lastCheck,
    isStandalone: state.isStandalone,
    checkForUpdates,
    applyUpdate,
    forceReinstall,
  };
}
