import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, CheckCircle, XCircle, Loader2, Send, RefreshCw } from "lucide-react";
import { useOneSignal } from "@/hooks/useOneSignal";
import { toast } from "sonner";

export function OneSignalSettings() {
  const {
    isSupported,
    isSubscribed,
    isInitialized,
    permission,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = useOneSignal();

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast.success("Notificações ativadas com sucesso!");
    } else {
      toast.error("Não foi possível ativar as notificações");
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      toast.success("Notificações desativadas");
    } else {
      toast.error("Erro ao desativar notificações");
    }
  };

  const handleTestNotification = async () => {
    toast.loading("Enviando notificação de teste...");
    const success = await sendTestNotification();
    if (success) {
      toast.success("Notificação enviada! Verifique seu dispositivo.");
    } else {
      toast.error("Erro ao enviar notificação de teste");
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push (OneSignal)
        </CardTitle>
        <CardDescription>
          Receba alertas sobre tarefas vencidas e lembretes importantes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isInitialized ? "default" : "secondary"}>
            {isInitialized ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Inicializado
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Não inicializado
              </>
            )}
          </Badge>

          <Badge variant={permission === "granted" ? "default" : permission === "denied" ? "destructive" : "secondary"}>
            Permissão: {permission === "granted" ? "Concedida" : permission === "denied" ? "Negada" : "Pendente"}
          </Badge>

          <Badge variant={isSubscribed ? "default" : "outline"}>
            {isSubscribed ? "Inscrito" : "Não inscrito"}
          </Badge>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          {!isSubscribed ? (
            <Button onClick={handleSubscribe} disabled={isLoading || permission === "denied"}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Ativar Notificações
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleUnsubscribe} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BellOff className="h-4 w-4 mr-2" />
                )}
                Desativar
              </Button>

              <Button variant="secondary" onClick={handleTestNotification} disabled={isLoading}>
                <Send className="h-4 w-4 mr-2" />
                Testar
              </Button>
            </>
          )}

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.location.reload()}
            title="Recarregar página"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Mensagem de permissão negada */}
        {permission === "denied" && (
          <p className="text-sm text-destructive">
            Você bloqueou as notificações. Para ativar, clique no ícone de cadeado na barra de endereço 
            do navegador e permita notificações para este site.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
