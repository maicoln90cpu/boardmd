import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, BellOff, Trash2, RefreshCw } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTasks } from "@/hooks/useTasks";
import { Badge } from "./ui/badge";
import { useState, useEffect } from "react";
import { pushNotifications } from "@/utils/pushNotifications";
import { toast } from "sonner";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";

export function PushNotificationsSettings() {
  const { tasks } = useTasks("all");
  const {
    isSupported,
    isSubscribed,
    permission,
    requestPermission,
    unsubscribe,
  } = usePushNotifications(tasks);
  
  const [devices, setDevices] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSubscribed) {
      loadDevices();
      loadLogs();
    }
  }, [isSubscribed]);

  const loadDevices = async () => {
    try {
      const subs = await pushNotifications.getActiveSubscriptions();
      setDevices(subs);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const pushLogs = await pushNotifications.getPushLogs(20);
      setLogs(pushLogs);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      setLoading(true);
      await pushNotifications.removeSubscription(deviceId);
      await loadDevices();
      toast.success('Dispositivo removido');
    } catch (error) {
      toast.error('Erro ao remover dispositivo');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await loadDevices();
      await loadLogs();
      toast.success('Atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  };

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

          {isSubscribed && devices.length > 0 && (
            <>
              <Separator className="my-3" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold">Dispositivos Registrados</h4>
                  <Button 
                    onClick={handleRefresh}
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                
                <ScrollArea className="h-[120px]">
                  <div className="space-y-2">
                    {devices.map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {device.device_name || 'Dispositivo'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(device.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleRemoveDevice(device.id)}
                          variant="ghost"
                          size="sm"
                          disabled={loading}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator className="my-3" />

              <div className="space-y-2">
                <h4 className="text-xs font-semibold">Histórico Recente</h4>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {logs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Nenhuma notificação enviada ainda
                      </p>
                    ) : (
                      logs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2 rounded-md bg-muted/30 space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium">{log.title}</p>
                            <Badge 
                              variant={log.status === 'sent' ? 'secondary' : 'destructive'}
                              className="text-[9px] h-4"
                            >
                              {log.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">
                            {log.body}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
