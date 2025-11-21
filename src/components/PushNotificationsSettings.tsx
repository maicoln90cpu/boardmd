import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTasks } from "@/hooks/useTasks";
import { Badge } from "./ui/badge";

export function PushNotificationsSettings() {
  const { tasks } = useTasks("all");
  const {
    isSupported,
    isSubscribed,
    permission,
    requestPermission,
    unsubscribe,
  } = usePushNotifications(tasks);

  if (!isSupported) {
    return (
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Notificações Push</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Seu navegador não suporta notificações push nativas
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Bell className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Notificações Push Nativas</h3>
              {isSubscribed && (
                <Badge variant="secondary" className="text-[10px]">Ativas</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receba alertas mesmo quando o app estiver fechado
            </p>
          </div>

          {permission === "denied" && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-xs text-destructive">
                ⚠️ Permissão negada. Ative nas configurações do navegador.
              </p>
            </div>
          )}

          {permission === "default" && (
            <Button 
              onClick={requestPermission}
              size="sm"
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              Ativar Notificações Push
            </Button>
          )}

          {permission === "granted" && !isSubscribed && (
            <Button 
              onClick={requestPermission}
              size="sm"
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              Registrar Notificações
            </Button>
          )}

          {permission === "granted" && isSubscribed && (
            <Button 
              onClick={unsubscribe}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <BellOff className="h-4 w-4 mr-2" />
              Desativar Push
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground">
            As notificações seguem as configurações de prazos e periodicidade definidas acima
          </p>
        </div>
      </div>
    </Card>
  );
}
