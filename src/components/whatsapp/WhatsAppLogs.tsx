import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppLog {
  id: string;
  template_type: string | null;
  phone_number: string | null;
  message: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
}

export function WhatsAppLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
                  </div>
                  <p className="text-sm truncate">{log.message}</p>
                  {log.error_message && (
                    <p className="text-xs text-destructive truncate">{log.error_message}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.sent_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
