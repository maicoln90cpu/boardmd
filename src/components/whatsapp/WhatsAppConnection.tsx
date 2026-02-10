import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff, QrCode, RefreshCw, Unplug, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function WhatsAppConnection() {
  const { user } = useAuth();
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState("unknown");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [configSaved, setConfigSaved] = useState(false);

  // Load saved config
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setApiUrl(data.api_url || "");
        setApiKey(data.api_key || "");
        setIsConnected(data.is_connected || false);
        setConfigSaved(true);
      }
    };
    load();
  }, [user]);

  const invokeInstance = useCallback(async (action: string, extra?: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-instance", {
        body: { action, api_url: apiUrl, api_key: apiKey, ...extra },
      });
      if (error) throw error;
      return data;
    } catch (e: any) {
      toast.error(e.message || "Erro na operação");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, apiKey]);

  const handleSaveConfig = async () => {
    if (!apiUrl || !apiKey) {
      toast.error("Preencha URL e API Key");
      return;
    }
    const data = await invokeInstance("save_config");
    if (data?.success) {
      setConfigSaved(true);
      toast.success("Configuração salva!");
    }
  };

  const handleCheckStatus = async () => {
    const data = await invokeInstance("status");
    if (data) {
      setConnectionState(data.state);
      setIsConnected(data.connected);
      if (data.connected) {
        toast.success("WhatsApp conectado!");
        setQrCode(null);
      }
    }
  };

  const handleConnect = async () => {
    // First try to create instance if it doesn't exist
    const check = await invokeInstance("check");
    if (!check?.exists) {
      const createResult = await invokeInstance("create");
      if (createResult?.qrcode) {
        setQrCode(createResult.qrcode);
        return;
      }
    }

    // Get QR code
    const data = await invokeInstance("connect");
    if (data?.qrcode) {
      setQrCode(data.qrcode);
      toast.info("Escaneie o QR Code com o WhatsApp");
    } else if (data?.state === "open") {
      setIsConnected(true);
      setQrCode(null);
      toast.success("Já está conectado!");
    }
  };

  const handleDisconnect = async () => {
    const data = await invokeInstance("disconnect");
    if (data?.success) {
      setIsConnected(false);
      setConnectionState("disconnected");
      setQrCode(null);
      toast.success("Desconectado");
    }
  };

  // Auto-check status when QR is shown
  useEffect(() => {
    if (!qrCode) return;
    const interval = setInterval(async () => {
      const data = await invokeInstance("status");
      if (data?.connected) {
        setIsConnected(true);
        setQrCode(null);
        setConnectionState("open");
        toast.success("WhatsApp conectado!");
        clearInterval(interval);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [qrCode, invokeInstance]);

  return (
    <div className="space-y-4">
      {/* Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Credenciais da Evolution API</CardTitle>
          <CardDescription className="text-xs">
            URL e API Key da sua instância Evolution API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Input
              placeholder="https://evo.seudominio.com"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <Input
              type="password"
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={handleSaveConfig} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Connection Status */}
      {configSaved && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-primary" />
              ) : (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              )}
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Conectado" : connectionState === "unknown" ? "Desconhecido" : connectionState}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isConnected ? (
                <Button size="sm" onClick={handleConnect} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-2" />
                  )}
                  Conectar
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={handleDisconnect} disabled={isLoading}>
                  <Unplug className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleCheckStatus} disabled={isLoading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar
              </Button>
            </div>

            {/* QR Code */}
            {qrCode && (
              <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-card">
                <p className="text-sm text-center font-medium text-black">
                  Escaneie com o WhatsApp
                </p>
                <img
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Abra o WhatsApp &gt; Dispositivos Conectados &gt; Conectar Dispositivo
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
