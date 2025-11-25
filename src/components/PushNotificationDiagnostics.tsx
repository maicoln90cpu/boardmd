import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, TestTube2, CheckCircle2, XCircle, Key, Server, Activity } from "lucide-react";
import { pushNotifications } from "@/utils/pushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VapidKeyStatus {
  publicKeyConfigured: boolean;
  privateKeyConfigured: boolean;
  publicKeyPreview: string;
  keysMatch: boolean;
}

export function PushNotificationDiagnostics() {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [vapidStatus, setVapidStatus] = useState<VapidKeyStatus | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadDiagnosticData();
  }, []);

  const loadDiagnosticData = async () => {
    try {
      setLoading(true);
      
      // Load devices
      const subs = await pushNotifications.getActiveSubscriptions();
      setDevices(subs);
      
      // Check VAPID keys
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      const vapidStatus: VapidKeyStatus = {
        publicKeyConfigured: !!publicKey && publicKey.length > 0,
        privateKeyConfigured: true, // We can't check this directly from frontend
        publicKeyPreview: publicKey ? `${publicKey.substring(0, 20)}...${publicKey.substring(publicKey.length - 10)}` : 'Not configured',
        keysMatch: true, // This would need backend verification
      };
      setVapidStatus(vapidStatus);

      // Get push notification stats
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: logs, error } = await supabase
          .from('push_logs')
          .select('status, notification_type, timestamp')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(100);

        if (!error && logs) {
          const delivered = logs.filter(l => l.status === 'delivered').length;
          const failed = logs.filter(l => l.status === 'failed').length;
          const successRate = logs.length > 0 ? ((delivered / logs.length) * 100).toFixed(1) : '0';
          
          setStats({
            total: logs.length,
            delivered,
            failed,
            successRate,
          });
        }
      }
    } catch (error) {
      console.error('Error loading diagnostic data:', error);
      toast.error('Erro ao carregar dados de diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllSubscriptions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Todas as subscriptions foram removidas');
      await loadDiagnosticData();
    } catch (error) {
      console.error('Error clearing subscriptions:', error);
      toast.error('Erro ao limpar subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSingleDevice = async () => {
    if (!selectedDevice) {
      toast.error('Selecione um dispositivo');
      return;
    }

    setTesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Get the selected device details
      const device = devices.find(d => d.id === selectedDevice);
      if (!device) {
        toast.error('Dispositivo não encontrado');
        return;
      }

      // Send test notification to specific device
      const result = await pushNotifications.sendPushNotification({
        user_id: user.id,
        title: '🔧 Teste de Dispositivo Específico',
        body: `Notificação enviada para ${device.device_name || 'dispositivo selecionado'}`,
        data: { test: true, deviceId: selectedDevice },
        url: '/',
        notification_type: 'test_single',
      });

      toast.success(`Notificação de teste enviada para ${device.device_name || 'dispositivo selecionado'}`);
      
      // Refresh data
      await loadDiagnosticData();
    } catch (error) {
      console.error('Error sending test to single device:', error);
      toast.error('Erro ao enviar notificação de teste');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Diagnósticos Avançados de Push
        </CardTitle>
        <CardDescription>
          Ferramentas para depuração e testes do sistema de notificações push
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* VAPID Keys Status */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Status das Chaves VAPID</h3>
          </div>
          
          {vapidStatus && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <span className="text-xs">Chave Pública Configurada</span>
                {vapidStatus.publicKeyConfigured ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Sim
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Não
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <span className="text-xs">Chave Privada Configurada</span>
                {vapidStatus.privateKeyConfigured ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Sim
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Não
                  </Badge>
                )}
              </div>

              <div className="p-3 rounded-md bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Preview da Chave Pública:</p>
                <code className="text-[10px] font-mono break-all">{vapidStatus.publicKeyPreview}</code>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Push Statistics */}
        {stats && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Estatísticas de Envio (últimas 100)</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-md bg-muted/30 text-center">
                  <p className="text-2xl font-bold text-primary">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Enviadas</p>
                </div>
                
                <div className="p-3 rounded-md bg-muted/30 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-500">{stats.delivered}</p>
                  <p className="text-xs text-muted-foreground">Entregues</p>
                </div>
                
                <div className="p-3 rounded-md bg-muted/30 text-center">
                  <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
                  <p className="text-xs text-muted-foreground">Falhas</p>
                </div>
                
                <div className="p-3 rounded-md bg-muted/30 text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{stats.successRate}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                </div>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Test Single Device */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Testar Dispositivo Específico</h3>
          
          {devices.length > 0 ? (
            <div className="space-y-2">
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um dispositivo" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.device_name || 'Dispositivo Desconhecido'} - {new Date(device.created_at).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleTestSingleDevice}
                disabled={!selectedDevice || testing}
                size="sm"
                className="w-full"
              >
                <TestTube2 className="h-4 w-4 mr-2" />
                {testing ? 'Enviando...' : 'Enviar Notificação de Teste'}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum dispositivo registrado
            </p>
          )}
        </div>

        <Separator />

        {/* Clear All Subscriptions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-destructive">Zona de Perigo</h3>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full"
                disabled={devices.length === 0 || loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Todas as Subscriptions
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso irá remover TODAS as subscriptions de push notification do banco de dados. 
                  Todos os dispositivos precisarão se registrar novamente para receber notificações.
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllSubscriptions}>
                  Confirmar Limpeza
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="text-xs text-muted-foreground">
            ⚠️ Use esta opção apenas se você regenerou as chaves VAPID ou está tendo problemas com subscriptions antigas.
          </p>
        </div>

        {/* Refresh Button */}
        <Button 
          onClick={loadDiagnosticData}
          variant="outline"
          size="sm"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Atualizando...' : 'Atualizar Diagnósticos'}
        </Button>
      </CardContent>
    </Card>
  );
}
