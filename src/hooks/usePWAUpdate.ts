import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger, prodLogger } from '@/lib/logger';

interface PWAUpdateState {
  isChecking: boolean;
  updateAvailable: boolean;
  lastCheck: Date | null;
  isStandalone: boolean;
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
      (window.navigator as any).standalone === true;
    
    setState(prev => ({ ...prev, isStandalone }));

    // Load last check from localStorage
    const savedLastCheck = localStorage.getItem('pwa_last_update_check');
    if (savedLastCheck) {
      setState(prev => ({ ...prev, lastCheck: new Date(savedLastCheck) }));
    }
  }, []);

  // Check for service worker updates
  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      toast.error('Service Worker não suportado neste navegador');
      return;
    }

    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      
      const now = new Date();
      localStorage.setItem('pwa_last_update_check', now.toISOString());
      
      // Check if there's a waiting service worker
      if (registration.waiting) {
        setState(prev => ({ 
          ...prev, 
          updateAvailable: true, 
          lastCheck: now,
          isChecking: false 
        }));
        toast.success('Nova versão disponível!', {
          action: {
            label: 'Atualizar',
            onClick: () => applyUpdate(),
          },
        });
      } else {
        setState(prev => ({ 
          ...prev, 
          updateAvailable: false, 
          lastCheck: now,
          isChecking: false 
        }));
        toast.success('App está na versão mais recente');
      }

      logger.log('[PWA] Update check completed');
    } catch (error) {
      prodLogger.error('[PWA] Update check failed:', error);
      setState(prev => ({ ...prev, isChecking: false }));
      toast.error('Erro ao verificar atualizações');
    }
  }, []);

  // Apply pending update
  const applyUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (registration.waiting) {
        // Tell the waiting service worker to activate
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        toast.success('Atualizando aplicativo...');
        
        // Reload after a short delay to allow SW activation
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
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        logger.log('[PWA] All caches cleared');
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        logger.log('[PWA] Service workers unregistered');
      }

      // Clear localStorage marker
      localStorage.setItem('pwa_force_reinstall', Date.now().toString());
      
      toast.success('Cache limpo. Recarregando...');
      
      // Force hard reload
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
      setState(prev => ({ ...prev, updateAvailable: false }));
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
      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        setState(prev => ({ ...prev, updateAvailable: true }));
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
