import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { backgroundSync } from './utils/backgroundSync';
import { toast } from 'sonner';

// Register service worker with enhanced update handling
const updateSW = registerSW({
  onNeedRefresh() {
    toast.info(
      'Nova versão disponível!',
      {
        duration: Infinity,
        action: {
          label: 'Atualizar',
          onClick: () => {
            updateSW(true);
          },
        },
        cancel: {
          label: 'Depois',
          onClick: () => {},
        },
      }
    );
  },
  onOfflineReady() {
    toast.success('App pronto para funcionar offline!', {
      duration: 3000,
    });
  },
  onRegistered(registration) {
    if (import.meta.env.DEV) console.log('SW registered:', registration);
    
    // Check for updates every hour
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error('SW registration error:', error);
  },
  immediate: true
});

// Initialize background sync
if (navigator.onLine) {
  backgroundSync.register();
}

// Handle online/offline events
window.addEventListener('online', () => {
  backgroundSync.register();
  toast.success('Conexão restaurada! Sincronizando dados...', {
    duration: 3000,
  });
});

window.addEventListener('offline', () => {
  toast.warning('Você está offline. Alterações serão salvas localmente.', {
    duration: 5000,
  });
});

// Detect iOS standalone mode
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;

if (isIOS && isStandalone) {
  if (import.meta.env.DEV) console.log('Running as iOS PWA');
  // Add any iOS-specific PWA handling here
}

createRoot(document.getElementById("root")!).render(<App />);
