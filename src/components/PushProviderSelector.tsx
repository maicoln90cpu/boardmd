import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, CheckCircle, XCircle, Loader2, Send, Shield, Radio } from "lucide-react";
import { useOneSignal } from "@/hooks/useOneSignal";
import { useVapidPush } from "@/hooks/useVapidPush";
import { toast } from "sonner";

export function PushProviderSelector() {
  const oneSignal = useOneSignal();
  const vapid = useVapidPush();

  const handleVapidSubscribe = async () => {
    const success = await vapid.subscribe();
    toast[success ? "success" : "error"](
      success ? "Push direto ativado!" : "Não foi possível ativar o push direto"
    );
  };

  const handleVapidUnsubscribe = async () => {
    const success = await vapid.unsubscribe();
    toast[success ? "success" : "error"](
      success ? "Push direto desativado" : "Erro ao desativar"
    );
  };

  const handleVapidTest = async () => {
    toast.loading("Enviando teste VAPID...");
    const success = await vapid.sendTestNotification();
    toast[success ? "success" : "error"](
      success ? "Notificação VAPID enviada!" : "Erro ao enviar teste"
    );
  };

  const handleOneSignalSubscribe = async () => {
    const success = await oneSignal.subscribe();
    toast[success ? "success" : "error"](
      success ? "OneSignal ativado!" : "Não foi possível ativar o OneSignal"
    );
  };

  const handleOneSignalUnsubscribe = async () => {
    const success = await oneSignal.unsubscribe();
    toast[success ? "success" : "error"](
      success ? "OneSignal desativado" : "Erro ao desativar"
    );
  };

  const handleOneSignalTest = async () => {
    toast.loading("Enviando teste OneSignal...");
    const success = await oneSignal.sendTestNotification();
    toast[success ? "success" : "error"](
      success ? "Notificação OneSignal enviada!" : "Erro ao enviar teste"
    );
  };

  if (!vapid.isSupported && !oneSignal.isSupported) {
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

  const permDenied = Notification.permission === "denied";

  return (
    <div className="space-y-4">
      {permDenied && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-sm text-destructive">
              Notificações bloqueadas. Clique no ícone de cadeado na barra de endereço para permitir.
            </p>
          </CardContent>
        </Card>
      )}

      {/* VAPID Push */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Push Direto (VAPID)
          </CardTitle>
          <CardDescription className="text-xs">
            Notificações sem dependência externa, direto do servidor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={vapid.isSubscribed ? "default" : "outline"}>
              {vapid.isSubscribed ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Ativo</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Inativo</>
              )}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {!vapid.isSubscribed ? (
              <Button size="sm" onClick={handleVapidSubscribe} disabled={vapid.isLoading || permDenied}>
                {vapid.isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                Ativar
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={handleVapidUnsubscribe} disabled={vapid.isLoading}>
                  <BellOff className="h-4 w-4 mr-2" />
                  Desativar
                </Button>
                <Button size="sm" variant="secondary" onClick={handleVapidTest} disabled={vapid.isLoading}>
                  <Send className="h-4 w-4 mr-2" />
                  Testar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* OneSignal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-5 w-5 text-primary" />
            OneSignal
          </CardTitle>
          <CardDescription className="text-xs">
            Serviço gerenciado com dashboard e analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={oneSignal.isInitialized ? "default" : "secondary"}>
              {oneSignal.isInitialized ? "Inicializado" : "Não inicializado"}
            </Badge>
            <Badge variant={oneSignal.isSubscribed ? "default" : "outline"}>
              {oneSignal.isSubscribed ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Ativo</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Inativo</>
              )}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {!oneSignal.isSubscribed ? (
              <Button size="sm" onClick={handleOneSignalSubscribe} disabled={oneSignal.isLoading || permDenied}>
                {oneSignal.isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                Ativar
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={handleOneSignalUnsubscribe} disabled={oneSignal.isLoading}>
                  <BellOff className="h-4 w-4 mr-2" />
                  Desativar
                </Button>
                <Button size="sm" variant="secondary" onClick={handleOneSignalTest} disabled={oneSignal.isLoading}>
                  <Send className="h-4 w-4 mr-2" />
                  Testar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
