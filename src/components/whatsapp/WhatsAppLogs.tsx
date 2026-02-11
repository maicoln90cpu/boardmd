import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, MessageSquare, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface WhatsAppLog {
  id: string;
  template_type: string | null;
  phone_number: string | null;
  message: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
  retry_count: number | null;
}

export function WhatsAppLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const loadLogs = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data } = await supabase
      .from("whatsapp_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(50);

    setLogs((data as WhatsAppLog[]) || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [user]);

  const handleResend = async (log: WhatsAppLog) => {
    if (!user || !log.message || !log.phone_number) {
      toast.error("Dados insuficientes para reenviar");
      return;
    }

    setResendingId(log.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          user_id: user.id,
          phone_number: log.phone_number,
          message: log.message,
          template_type: log.template_type || "retry",
          retry_log_id: log.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Mensagem reenviada com sucesso!");
        // Update local state
        setLogs(prev => prev.map(l => 
          l.id === log.id ? { ...l, status: "sent", error_message: null, retry_count: (l.retry_count || 0) + 1 } : l
        ));
      } else {
        toast.error("Falha ao reenviar: " + (data?.error || "Erro desconhecido"));
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao reenviar");
    } finally {
      setResendingId(null);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "sent": return "default";
      case "failed": return "destructive";
      default: return "secondary";
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Carregando...</div>;
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma mensagem enviada ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={loadLogs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusColor(log.status)} className="text-xs">
                      {log.status === "sent" ? "Enviado" : log.status === "failed" ? "Falhou" : log.status}
                    </Badge>
                    {log.template_type && (
                      <Badge variant="outline" className="text-xs">
                        {log.template_type}
                      </Badge>
                    )}
                    {log.phone_number && (
                      <span className="text-xs text-muted-foreground">{log.phone_number}</span>
                    )}
                    {(log.retry_count || 0) > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({log.retry_count}x tentativa)
                      </span>
                    )}
                  </div>
                  <p className="text-sm truncate">{log.message}</p>
                  {log.error_message && (
                    <p className="text-xs text-destructive truncate">{log.error_message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {log.status === "failed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResend(log)}
                      disabled={resendingId === log.id}
                      className="h-7 text-xs"
                    >
                      {resendingId === log.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3 mr-1" />
                      )}
                      Reenviar
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.sent_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
