import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function OnlineStatusIndicator() {
  const { isOnline } = useOnlineStatus();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowIndicator(true);
      toast.warning('Você está offline. As alterações serão sincronizadas quando reconectar.', {
        duration: 5000
      });
    } else if (showIndicator) {
      toast.success('Conexão restaurada! Sincronizando dados...', {
        duration: 3000
      });
      setTimeout(() => setShowIndicator(false), 3000);
    }
  }, [isOnline]);

  if (!showIndicator) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 shadow-lg animate-in slide-in-from-top-4">
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-500">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium text-orange-500">Offline</span>
        </>
      )}
    </div>
  );
}
