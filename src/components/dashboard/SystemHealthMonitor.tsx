import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Activity, Clock, Server } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface ModuleStatus {
  name: string;
  status: "healthy" | "degraded" | "critical";
  latency_ms: number;
  message: string;
  checked_at: string;
}

interface HealthCheckResponse {
  overall_status: "healthy" | "degraded" | "critical";
  timestamp: string;
  modules: ModuleStatus[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    critical: number;
  };
}

const statusConfig = {
  healthy: { 
    icon: CheckCircle, 
    color: "text-green-500", 
    bgColor: "bg-green-500/10",
    badgeVariant: "default" as const,
    label: "Saudável" 
  },
  degraded: { 
    icon: AlertTriangle, 
    color: "text-yellow-500", 
    bgColor: "bg-yellow-500/10",
    badgeVariant: "secondary" as const,
    label: "Atenção" 
  },
  critical: { 
    icon: XCircle, 
    color: "text-red-500", 
    bgColor: "bg-red-500/10",
    badgeVariant: "destructive" as const,
    label: "Crítico" 
  },
};

export function SystemHealthMonitor() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("health-check");
      
      if (error) {
        logger.error("Health check error:", error);
        toast.error("Erro ao verificar saúde do sistema");
        return;
      }

      setHealth(data as HealthCheckResponse);
      setLastChecked(new Date());
    } catch (error) {
      logger.error("Health check failed:", error);
      toast.error("Falha ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const healthPercentage = health 
    ? Math.round((health.summary.healthy / health.summary.total) * 100) 
    : 0;

  const overallConfig = health ? statusConfig[health.overall_status] : statusConfig.healthy;
  const OverallIcon = overallConfig.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Saúde do Sistema</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchHealth} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
        <CardDescription className="flex items-center gap-2">
          {lastChecked && (
            <>
              <Clock className="h-3 w-3" />
              Última verificação: {lastChecked.toLocaleTimeString("pt-BR")}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        {health && (
          <div className={`flex items-center justify-between p-3 rounded-lg ${overallConfig.bgColor}`}>
            <div className="flex items-center gap-3">
              <OverallIcon className={`h-6 w-6 ${overallConfig.color}`} />
              <div>
                <p className="font-medium">Status Geral</p>
                <p className="text-sm text-muted-foreground">
                  {health.summary.healthy} de {health.summary.total} módulos saudáveis
                </p>
              </div>
            </div>
            <Badge variant={overallConfig.badgeVariant}>
              {overallConfig.label}
            </Badge>
          </div>
        )}

        {/* Health Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Integridade</span>
            <span>{healthPercentage}%</span>
          </div>
          <Progress value={healthPercentage} className="h-2" />
        </div>

        {/* Modules List */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Módulos</p>
          <div className="grid gap-2">
            {health?.modules.map((module) => {
              const config = statusConfig[module.status];
              const Icon = config.icon;
              
              return (
                <div 
                  key={module.name}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <div>
                      <p className="text-sm font-medium">{module.name}</p>
                      <p className="text-xs text-muted-foreground">{module.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {module.latency_ms}ms
                    </span>
                    <Activity className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        {health && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center">
              <p className="text-lg font-bold text-green-500">{health.summary.healthy}</p>
              <p className="text-xs text-muted-foreground">Saudável</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-500">{health.summary.degraded}</p>
              <p className="text-xs text-muted-foreground">Atenção</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-500">{health.summary.critical}</p>
              <p className="text-xs text-muted-foreground">Crítico</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !health && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
