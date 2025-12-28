import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { CheckCircle2, XCircle, Clock, Smartphone, TrendingUp, Activity } from "lucide-react";
import { format } from "date-fns";
import { MonitorLoadingSkeleton } from "@/components/ui/loading-skeleton";

interface PushLog {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: string;
  timestamp: string;
  notification_type: string;
  device_name: string | null;
  delivered_at: string | null;
  clicked_at: string | null;
  latency_ms: number | null;
  error_message: string | null;
}

interface PushSubscription {
  id: string;
  device_name: string | null;
  created_at: string;
  updated_at: string;
}

export function PushNotificationMonitor() {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [subscriptions, setSubscriptions] = useState<PushSubscription[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    failed: 0,
    avgLatency: 0,
  });
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [logs]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch logs
      const { data: logsData } = await supabase
        .from("push_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(100);

      // Fetch subscriptions
      const { data: subsData } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user.id);

      setLogs(logsData || []);
      setSubscriptions(subsData || []);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("push-logs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "push_logs",
        },
        (payload) => {
          if (import.meta.env.DEV) console.log("Realtime update:", payload);
          fetchData(); // Refresh data on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const calculateStats = () => {
    const total = logs.length;
    const delivered = logs.filter((l) => l.status === "delivered").length;
    const failed = logs.filter((l) => l.status === "failed").length;
    const latencies = logs
      .filter((l) => l.latency_ms !== null)
      .map((l) => l.latency_ms!);
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;

    setStats({ total, delivered, failed, avgLatency });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">✅ Entregue</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">❌ Falhou</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">⚠️ Pendente</Badge>;
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterStatus !== "all" && log.status !== filterStatus) return false;
    if (filterType !== "all" && log.notification_type !== filterType) return false;
    if (searchQuery && !log.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.body.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Prepare chart data
  const chartData = logs
    .slice(0, 20)
    .reverse()
    .map((log, i) => ({
      name: `#${i + 1}`,
      latency: log.latency_ms || 0,
      timestamp: log.timestamp,
    }));

  const typeDistribution = logs.reduce((acc, log) => {
    const type = log.notification_type || "manual";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeChartData = Object.entries(typeDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  // OTIMIZAÇÃO FASE 3: Skeleton loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <MonitorLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Total Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Entregues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}% taxa de sucesso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Falhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}% taxa de erro
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Latência Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.avgLatency}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Tempo médio de entrega</p>
          </CardContent>
        </Card>
      </div>

      {/* Devices Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Dispositivos Registrados
          </CardTitle>
          <CardDescription>
            {subscriptions.length} dispositivo(s) ativo(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
              >
                <Smartphone className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {sub.device_name || "Dispositivo Desconhecido"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Registrado em {format(new Date(sub.created_at), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
            ))}
            {subscriptions.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">
                Nenhum dispositivo registrado ainda.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Latency Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Latência das Últimas 20 Notificações</CardTitle>
          <CardDescription>Tempo de entrega em milissegundos</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Type Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo</CardTitle>
          <CardDescription>Notificações por categoria</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Notificações</CardTitle>
          <CardDescription>Últimas 100 notificações enviadas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-xs">Buscar</Label>
              <Input
                id="search"
                placeholder="Buscar por título ou mensagem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter" className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status-filter" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="delivered">Entregues</SelectItem>
                  <SelectItem value="failed">Falhas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type-filter" className="text-xs">Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="type-filter" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="due_overdue">Atrasada</SelectItem>
                  <SelectItem value="due_urgent">Urgente</SelectItem>
                  <SelectItem value="due_warning">Aviso</SelectItem>
                  <SelectItem value="due_early">Antecipada</SelectItem>
                  <SelectItem value="task_created">Nova Tarefa</SelectItem>
                  <SelectItem value="task_completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <ScrollArea className="h-[400px] border rounded-md">
            <div className="p-2 space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Nenhuma notificação encontrada
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <p className="text-sm font-medium truncate">{log.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {log.body}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                          <span>{format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss")}</span>
                          {log.device_name && (
                            <>
                              <span>•</span>
                              <span>📱 {log.device_name}</span>
                            </>
                          )}
                          {log.latency_ms !== null && (
                            <>
                              <span>•</span>
                              <span>⚡ {log.latency_ms}ms</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(log.status)}
                        <Badge variant="outline" className="text-[9px]">
                          {log.notification_type || "manual"}
                        </Badge>
                      </div>
                    </div>
                    {log.error_message && (
                      <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                        Erro: {log.error_message}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center pt-2">
            <p className="text-xs text-muted-foreground">
              Mostrando {filteredLogs.length} de {logs.length} notificações
            </p>
            <Button onClick={fetchData} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
