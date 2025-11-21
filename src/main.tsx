import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { backgroundSync } from './utils/backgroundSync';

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New version available');
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  immediate: true
});

// Initialize background sync
if (navigator.onLine) {
  backgroundSync.register();
}

window.addEventListener('online', () => {
  backgroundSync.register();
});

createRoot(document.getElementById("root")!).render(<App />);
