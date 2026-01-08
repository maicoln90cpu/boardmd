import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PushLog {
  id: string;
  title: string;
  body: string;
  status: string;
  notification_type: string | null;
  timestamp: string;
  error_message: string | null;
  device_name: string | null;
}

export function NotificationHistory() {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('push_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700">Enviado</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700">Entregue</Badge>;
      case 'failed':
      case 'error':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case 'due_date':
        return 'Prazo';
      case 'daily_reminder':
        return 'Resumo Diário';
      case 'achievement':
        return 'Conquista';
      case 'pomodoro':
        return 'Pomodoro';
      case 'test':
        return 'Teste';
      default:
        return type || 'Geral';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Histórico de Notificações
            </CardTitle>
            <CardDescription>
              Últimas 50 notificações enviadas
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma notificação enviada ainda</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">
                    {getStatusIcon(log.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{log.title}</span>
                      {getStatusBadge(log.status)}
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(log.notification_type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {log.body}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(log.timestamp), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {log.device_name && (
                        <>
                          <span>•</span>
                          <span>{log.device_name}</span>
                        </>
                      )}
                    </div>
                    {log.error_message && (
                      <p className="text-xs text-red-500 mt-1">
                        Erro: {log.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
