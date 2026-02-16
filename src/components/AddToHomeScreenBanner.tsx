import { useState, useEffect } from 'react';
import { X, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Banner that guides iOS users through the "Add to Home Screen" process,
 * which is required for push notifications on iOS 16.4+.
 * Only shows on iOS Safari when the app is NOT already in standalone mode.
 */
export function AddToHomeScreenBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in window.navigator && (window.navigator as any).standalone);
    const dismissed = localStorage.getItem('aths_banner_dismissed');

    if (!isIOS || isStandalone) return;

    // Don't show if dismissed within last 14 days
    if (dismissed) {
      const days = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (days < 14) return;
    }

    // Show after 5 seconds of engagement
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('aths_banner_dismissed', Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-4 max-w-md mx-auto">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 hover:bg-accent rounded-full transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Instale o App para Notificações</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              No iOS, notificações push funcionam apenas com o app instalado na tela inicial.
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">1</span>
            <span>Toque no botão</span>
            <Share className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium">Compartilhar</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">2</span>
            <span>Selecione</span>
            <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium">"Adicionar à Tela de Início"</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">3</span>
            <span>Abra o app pela <span className="font-medium">tela inicial</span></span>
          </div>
        </div>

        <Button onClick={handleDismiss} variant="outline" size="sm" className="w-full text-xs">
          Entendi, fechar
        </Button>
      </div>
    </div>
  );
}
