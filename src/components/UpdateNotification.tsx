import { useEffect } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface UpdateNotificationProps {
  registration: ServiceWorkerRegistration | null;
  onUpdate: () => void;
}

export function UpdateNotification({ registration, onUpdate }: UpdateNotificationProps) {
  useEffect(() => {
    if (!registration) return;

    const showUpdateToast = () => {
      toast.info(
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          <span>Nova versão disponível!</span>
        </div>,
        {
          duration: Infinity,
          action: {
            label: 'Atualizar agora',
            onClick: () => {
              onUpdate();
              window.location.reload();
            },
          },
        }
      );
    };

    // Auto-update after 5 seconds if user doesn't interact
    const autoUpdateTimer = setTimeout(() => {
      onUpdate();
      window.location.reload();
    }, 5000);

    showUpdateToast();

    return () => clearTimeout(autoUpdateTimer);
  }, [registration, onUpdate]);

  return null;
}
