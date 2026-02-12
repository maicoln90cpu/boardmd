import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bell, BellOff, Wifi, WifiOff } from "lucide-react";
import { pushNotifications } from "@/lib/push/pushNotifications";
import { logger } from "@/lib/logger";

export function PushStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check push permission
    if (pushNotifications.isSupported()) {
      setPushPermission(pushNotifications.getPermissionStatus());
      checkSubscription();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const checkSubscription = async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await (registration as any).pushManager?.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        logger.error("Error checking subscription:", error);
      }
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Online/Offline Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isOnline ? "secondary" : "destructive"}
              className="flex items-center gap-1 text-[10px] h-6 px-2"
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {isOnline
                ? "Conectado à internet"
                : "Sem conexão - trabalhando offline"}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Push Permission Status */}
        {pushNotifications.isSupported() && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={
                  pushPermission === "granted" && isSubscribed
                    ? "secondary"
                    : "outline"
                }
                className="flex items-center gap-1 text-[10px] h-6 px-2"
              >
                {pushPermission === "granted" && isSubscribed ? (
                  <>
                    <Bell className="h-3 w-3 text-green-500" />
                    <span className="hidden sm:inline text-green-500">Push Ativo</span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-3 w-3 text-muted-foreground" />
                    <span className="hidden sm:inline text-muted-foreground">Push Inativo</span>
                  </>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {pushPermission === "granted" && isSubscribed
                  ? "Notificações push ativas"
                  : pushPermission === "denied"
                  ? "Notificações bloqueadas - ative nas configurações do navegador"
                  : "Ative as notificações push em /config"}
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
