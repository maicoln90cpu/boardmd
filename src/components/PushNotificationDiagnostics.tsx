import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, TestTube2, CheckCircle2, XCircle, Key, Server, Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { pushNotifications } from "@/lib/push/pushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VapidKeyStatus {
  publicKeyConfigured: boolean;
  privateKeyConfigured: boolean;
  publicKeyPreview: string;
  keysMatch: boolean;
  frontendKey: string;
  backendVerified: boolean;
}

interface DiagnosticReport {
  vapidKeysValid: boolean;
  vapidKeysSynced: boolean;
  currentDeviceRegistered: boolean;
  lastTestSuccess: boolean;
  lastTestTimestamp: string | null;
  averageLatency: number | null;
  issues: string[];
}

export function PushNotificationDiagnostics() {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [vapidStatus, setVapidStatus] = useState<VapidKeyStatus | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);
  const [currentDeviceEndpoint, setCurrentDeviceEndpoint] = useState<string | null>(null);

  useEffect(() => {
    loadDiagnosticData();
    getCurrentDeviceEndpoint();
  }, []);

  const getCurrentDeviceEndpoint = async () => {
    try {
      if (!("serviceWorker" in navigator)) return;
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        setCurrentDeviceEndpoint(subscription.endpoint);
      }
    } catch (error) {
      console.error('Error getting current device endpoint:', error);
    }
  };

  const loadDiagnosticData = async () => {
    try {
      setLoading(true);
      
      // Load devices
      const subs = await pushNotifications.getActiveSubscriptions();
      setDevices(subs);
      
      // Check VAPID keys and validate with backend
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      let backendVerified = false;
      
      try {
        // Call edge function to validate VAPID configuration
        const { data: validationData, error: validationError } = await supabase.functions.invoke('send-push', {
          body: { action: 'validate_vapid' }
        });
        
        if (!validationError && validationData) {
          backendVerified = validationData.valid === true;
        }
      } catch (error) {
        console.error('Error validating VAPID with backend:', error);
      }
      
      const vapidStatus: VapidKeyStatus = {
        publicKeyConfigured: !!publicKey && publicKey.length > 0,
        privateKeyConfigured: true,
        publicKeyPreview: publicKey ? `${publicKey.substring(0, 20)}...${publicKey.substring(publicKey.length - 10)}` : 'Not configured',
        keysMatch: backendVerified,
        frontendKey: publicKey || '',
        backendVerified,
      };
      setVapidStatus(vapidStatus);

      // Get push notification stats with latency
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: logs, error } = await supabase
          .from('push_logs')
          .select('status, notification_type, timestamp, latency_ms, delivered_at')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(100);

        if (!error && logs) {
          const delivered = logs.filter(l => l.status === 'delivered').length;
          const failed = logs.filter(l => l.status === 'failed').length;
          const successRate = logs.length > 0 ? ((delivered / logs.length) * 100).toFixed(1) : '0';
          
          // Calculate average latency from delivered notifications
          const deliveredWithLatency = logs.filter(l => l.status === 'delivered' && l.latency_ms);
          const avgLatency = deliveredWithLatency.length > 0 
            ? Math.round(deliveredWithLatency.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / deliveredWithLatency.length)
            : null;
          
          // Get last successful delivery
          const lastSuccess = logs.find(l => l.status === 'delivered');
          
          setStats({
            total: logs.length,
            delivered,
            failed,
            successRate,
            averageLatency: avgLatency,
            lastDeliveredAt: lastSuccess?.delivered_at || lastSuccess?.timestamp,
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

  const handleClearInvalidSubscriptions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all subscriptions
      const allDevices = await pushNotifications.getActiveSubscriptions();
      
      let removedCount = 0;
      
      // Test each subscription and remove invalid ones
      for (const device of allDevices) {
        try {
          // Try to send a test push to validate the endpoint
          const response = await fetch(device.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'TTL': '0', // Immediate expiration for test
            },
            body: JSON.stringify({}),
          });
          
          // If endpoint returns 404, 410 (Gone), or other error codes, remove it
          if (response.status === 404 || response.status === 410 || response.status >= 500) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', device.id);
            removedCount++;
          }
        } catch (error) {
          // If fetch fails completely, endpoint is likely invalid
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', device.id);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        toast.success(`${removedCount} subscription(s) inválida(s) removida(s)`);
      } else {
        toast.success('Nenhuma subscription inválida encontrada');
      }
      
      await loadDiagnosticData();
    } catch (error) {
      console.error('Error clearing invalid subscriptions:', error);
      toast.error('Erro ao limpar subscriptions inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleTestCurrentDevice = async () => {
    setTesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      if (!currentDeviceEndpoint) {
        toast.error('Dispositivo atual não está registrado para push notifications');
        return;
      }

      // Find current device in subscriptions
      const currentDevice = devices.find(d => d.endpoint === currentDeviceEndpoint);
      
      if (!currentDevice) {
        toast.error('Dispositivo atual não encontrado nas subscriptions');
        return;
      }

      // Send test notification via edge function
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          action: 'test_single',
          user_id: user.id,
          device_id: currentDevice.id,
          title: '🧪 Teste do Dispositivo Atual',
          body: 'Se você está vendo isto, o push para este dispositivo está funcionando!',
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success(`✅ Notificação enviada com sucesso! Latência: ${data.latency_ms}ms`);
      } else {
        toast.error(`❌ Falha no envio: ${data?.error || 'Erro desconhecido'}`);
      }
      
      // Refresh data
      await loadDiagnosticData();
    } catch (error) {
      console.error('Error sending test to current device:', error);
      toast.error('Erro ao enviar notificação de teste');
    } finally {
      setTesting(false);
    }
  };

  const handleRunFullDiagnostic = async () => {
    setValidating(true);
    try {
      const issues: string[] = [];
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Validate VAPID keys
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      const vapidKeysValid = !!publicKey && publicKey.length === 87; // Standard P-256 public key length
      
      if (!vapidKeysValid) {
        issues.push('Chave VAPID pública inválida ou não configurada');
      }

      // 2. Check key synchronization with backend
      let vapidKeysSynced = false;
      try {
        const { data: validationData } = await supabase.functions.invoke('send-push', {
          body: { action: 'validate_vapid' }
        });
        vapidKeysSynced = validationData?.valid === true;
        
        if (!vapidKeysSynced) {
          issues.push('Chaves VAPID não sincronizadas entre frontend e backend');
        }
      } catch (error) {
        issues.push('Não foi possível validar sincronização das chaves VAPID');
      }

      // 3. Check if current device is registered
      const currentDeviceRegistered = currentDeviceEndpoint && devices.some(d => d.endpoint === currentDeviceEndpoint);
      
      if (!currentDeviceRegistered) {
        issues.push('Dispositivo atual não está registrado para notificações push');
      }

      // 4. Check last test results
      const { data: lastTestLog } = await supabase
        .from('push_logs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('notification_type', 'test_single')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const lastTestSuccess = lastTestLog?.status === 'delivered';
      
      if (lastTestLog && !lastTestSuccess) {
        issues.push(`Último teste falhou: ${lastTestLog.error_message || 'Erro desconhecido'}`);
      }

      // 5. Calculate average latency
      const { data: recentLogs } = await supabase
        .from('push_logs')
        .select('latency_ms')
        .eq('user_id', user?.id)
        .eq('status', 'delivered')
        .not('latency_ms', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(20);

      const averageLatency = recentLogs && recentLogs.length > 0
        ? Math.round(recentLogs.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / recentLogs.length)
        : null;

      const report: DiagnosticReport = {
        vapidKeysValid,
        vapidKeysSynced,
        currentDeviceRegistered,
        lastTestSuccess,
        lastTestTimestamp: lastTestLog?.timestamp || null,
        averageLatency,
        issues,
      };

      setDiagnosticReport(report);

      if (issues.length === 0) {
        toast.success('✅ Todos os diagnósticos passaram! Sistema 100% operacional.');
      } else {
        toast.error(`⚠️ ${issues.length} problema(s) detectado(s)`);
      }
    } catch (error) {
      console.error('Error running diagnostic:', error);
      toast.error('Erro ao executar diagnóstico completo');
    } finally {
      setValidating(false);
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
        {/* Run Full Diagnostic */}
        <Button 
          onClick={handleRunFullDiagnostic}
          disabled={validating}
          size="lg"
          className="w-full"
        >
          <Activity className="h-5 w-5 mr-2" />
          {validating ? 'Executando Diagnóstico...' : '🔍 Executar Diagnóstico Completo'}
        </Button>

        {diagnosticReport && (
          <Alert variant={diagnosticReport.issues.length === 0 ? "default" : "destructive"}>
            <AlertDescription className="space-y-2">
              <div className="font-semibold flex items-center gap-2">
                {diagnosticReport.issues.length === 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    ✅ Sistema 100% Operacional
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    ⚠️ {diagnosticReport.issues.length} Problema(s) Detectado(s)
                  </>
                )}
              </div>
              
              <div className="grid gap-1 text-xs mt-2">
                <div className="flex items-center gap-2">
                  {diagnosticReport.vapidKeysValid ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-destructive" />}
                  Chaves VAPID válidas
                </div>
                <div className="flex items-center gap-2">
                  {diagnosticReport.vapidKeysSynced ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-destructive" />}
                  Chaves sincronizadas (frontend ↔ backend)
                </div>
                <div className="flex items-center gap-2">
                  {diagnosticReport.currentDeviceRegistered ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-destructive" />}
                  Dispositivo atual registrado
                </div>
                <div className="flex items-center gap-2">
                  {diagnosticReport.lastTestSuccess ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-destructive" />}
                  Último teste bem-sucedido
                </div>
                {diagnosticReport.averageLatency && (
                  <div className="flex items-center gap-2">
                    <Server className="h-3 w-3" />
                    Latência média: {diagnosticReport.averageLatency}ms
                  </div>
                )}
              </div>

              {diagnosticReport.issues.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="font-semibold text-xs">Problemas detectados:</p>
                  {diagnosticReport.issues.map((issue, idx) => (
                    <p key={idx} className="text-xs text-destructive">• {issue}</p>
                  ))}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* VAPID Keys Status */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Status das Chaves VAPID</h3>
          </div>
          
          {vapidStatus && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <span className="text-xs">Chave Pública (Frontend)</span>
                {vapidStatus.publicKeyConfigured ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Configurada
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Não Configurada
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <span className="text-xs">Backend Verificado</span>
                {vapidStatus.backendVerified ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Válido
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Erro
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <span className="text-xs">Sincronização Frontend ↔ Backend</span>
                {vapidStatus.keysMatch ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Sincronizado
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Dessincronizado
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

              {/* Additional metrics */}
              <div className="grid gap-2 mt-2">
                {stats.averageLatency && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-muted/20">
                    <span className="text-xs">Latência Média</span>
                    <Badge variant="outline">{stats.averageLatency}ms</Badge>
                  </div>
                )}
                
                {stats.lastDeliveredAt && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-muted/20">
                    <span className="text-xs">Última Entrega</span>
                    <Badge variant="outline" className="text-[10px]">
                      {new Date(stats.lastDeliveredAt).toLocaleString('pt-BR')}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Test Current Device */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Testar Apenas Este Dispositivo</h3>
          
          {currentDeviceEndpoint ? (
            <div className="space-y-2">
              <div className="p-2 rounded-md bg-muted/30">
                <p className="text-xs text-muted-foreground">Dispositivo Atual:</p>
                <p className="text-xs font-mono break-all mt-1">
                  {currentDeviceEndpoint.substring(0, 50)}...
                </p>
              </div>
              
              <Button 
                onClick={handleTestCurrentDevice}
                disabled={testing}
                size="sm"
                className="w-full"
                variant="secondary"
              >
                <TestTube2 className="h-4 w-4 mr-2" />
                {testing ? 'Enviando...' : '🧪 Testar Este Navegador'}
              </Button>
            </div>
          ) : (
            <Alert>
              <AlertDescription className="text-xs">
                ⚠️ Dispositivo atual não está registrado para push notifications. 
                Ative as notificações push na aba "Notificações" primeiro.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Clear Invalid Subscriptions */}
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
                Limpar Subscriptions Inválidas
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Limpeza de Subscriptions Inválidas</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá testar cada subscription registrada e remover apenas aquelas que:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Retornam erro 404 ou 410 (endpoint expirado)</li>
                    <li>Não respondem (timeout/network error)</li>
                    <li>Foram invalidadas pelo navegador</li>
                  </ul>
                  <br />
                  Subscriptions ativas e válidas serão mantidas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearInvalidSubscriptions}>
                  Confirmar Limpeza
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="text-xs text-muted-foreground">
            ⚠️ Use esta opção para remover subscriptions obsoletas sem afetar dispositivos ativos.
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
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Atualizando...' : 'Atualizar Diagnósticos'}
        </Button>
      </CardContent>
    </Card>
  );
}
