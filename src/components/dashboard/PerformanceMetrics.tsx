import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  XCircle,
  BarChart3,
  Zap
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DailyMetrics {
  date: string;
  tasksCreated: number;
  tasksCompleted: number;
  pomodoroMinutes: number;
  notesCreated: number;
}

interface PushLogMetrics {
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
}

export function PerformanceMetrics() {
  const { user } = useAuth();
  const [dailyData, setDailyData] = useState<DailyMetrics[]>([]);
  const [pushMetrics, setPushMetrics] = useState<PushLogMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchMetrics = async () => {
      setLoading(true);
      
      try {
        // Buscar dados dos últimos 7 dias
        const days = 7;
        const startDate = subDays(new Date(), days - 1);
        
        // Buscar tarefas
        const { data: tasks } = await supabase
          .from("tasks")
          .select("created_at, is_completed, updated_at")
          .gte("created_at", startOfDay(startDate).toISOString())
          .order("created_at", { ascending: true });
        
        // Buscar sessões pomodoro
        const { data: pomodoros } = await supabase
          .from("pomodoro_sessions")
          .select("started_at, duration_minutes, completed")
          .gte("started_at", startOfDay(startDate).toISOString())
          .eq("completed", true);
        
        // Buscar notas criadas
        const { data: notes } = await supabase
          .from("notes")
          .select("created_at")
          .gte("created_at", startOfDay(startDate).toISOString());
        
        // Buscar push logs
        const { data: pushLogs } = await supabase
          .from("push_logs")
          .select("status, delivered_at")
          .gte("timestamp", startOfDay(startDate).toISOString());
        
        // Processar dados diários
        const metricsMap = new Map<string, DailyMetrics>();
        
        for (let i = 0; i < days; i++) {
          const date = subDays(new Date(), days - 1 - i);
          const dateKey = format(date, "yyyy-MM-dd");
          metricsMap.set(dateKey, {
            date: format(date, "dd/MM", { locale: ptBR }),
            tasksCreated: 0,
            tasksCompleted: 0,
            pomodoroMinutes: 0,
            notesCreated: 0,
          });
        }
        
        // Contar tarefas criadas
        tasks?.forEach(task => {
          const dateKey = format(new Date(task.created_at), "yyyy-MM-dd");
          const metrics = metricsMap.get(dateKey);
          if (metrics) {
            metrics.tasksCreated++;
          }
        });
        
        // Contar tarefas completadas (usando updated_at quando is_completed é true)
        tasks?.filter(t => t.is_completed).forEach(task => {
          const dateKey = format(new Date(task.updated_at), "yyyy-MM-dd");
          const metrics = metricsMap.get(dateKey);
          if (metrics) {
            metrics.tasksCompleted++;
          }
        });
        
        // Somar minutos de pomodoro
        pomodoros?.forEach(session => {
          const dateKey = format(new Date(session.started_at), "yyyy-MM-dd");
          const metrics = metricsMap.get(dateKey);
          if (metrics) {
            metrics.pomodoroMinutes += session.duration_minutes;
          }
        });
        
        // Contar notas criadas
        notes?.forEach(note => {
          const dateKey = format(new Date(note.created_at), "yyyy-MM-dd");
          const metrics = metricsMap.get(dateKey);
          if (metrics) {
            metrics.notesCreated++;
          }
        });
        
        setDailyData(Array.from(metricsMap.values()));
        
        // Calcular métricas de push
        if (pushLogs && pushLogs.length > 0) {
          const sent = pushLogs.length;
          const delivered = pushLogs.filter(p => p.status === "delivered" || p.delivered_at).length;
          const failed = pushLogs.filter(p => p.status === "failed").length;
          
          setPushMetrics({
            sent,
            delivered,
            failed,
            deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
          });
        }
      } catch (error) {
        logger.error("Error fetching metrics:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, [user?.id]);

  // Calcular tendências
  const trends = useMemo(() => {
    if (dailyData.length < 2) return null;
    
    const recent = dailyData.slice(-3);
    const older = dailyData.slice(0, -3);
    
    const recentAvg = recent.reduce((sum, d) => sum + d.tasksCompleted, 0) / recent.length;
    const olderAvg = older.length > 0 
      ? older.reduce((sum, d) => sum + d.tasksCompleted, 0) / older.length 
      : 0;
    
    const tasksTrend = olderAvg > 0 
      ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) 
      : 0;
    
    const totalTasks = dailyData.reduce((sum, d) => sum + d.tasksCompleted, 0);
    const totalPomodoro = dailyData.reduce((sum, d) => sum + d.pomodoroMinutes, 0);
    const totalNotes = dailyData.reduce((sum, d) => sum + d.notesCreated, 0);
    
    return {
      tasksTrend,
      totalTasks,
      totalPomodoro,
      totalNotes,
    };
  }, [dailyData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Métricas de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <Activity className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Métricas de Performance
        </CardTitle>
        <CardDescription>
          Últimos 7 dias de atividade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gráfico de tendências */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="tasksCompleted"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorTasks)"
                name="Tarefas Concluídas"
              />
              <Line
                type="monotone"
                dataKey="pomodoroMinutes"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
                name="Minutos Pomodoro"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">Concluídas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{trends?.totalTasks || 0}</span>
              {trends && trends.tasksTrend !== 0 && (
                <Badge 
                  variant={trends.tasksTrend > 0 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {trends.tasksTrend > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {trends.tasksTrend > 0 ? "+" : ""}{trends.tasksTrend}%
                </Badge>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Foco (min)</span>
            </div>
            <span className="text-xl font-bold">{trends?.totalPomodoro || 0}</span>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span className="text-xs">Notas</span>
            </div>
            <span className="text-xl font-bold">{trends?.totalNotes || 0}</span>
          </div>

          {pushMetrics && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span className="text-xs">Push Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{pushMetrics.deliveryRate}%</span>
                {pushMetrics.failed > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <XCircle className="h-3 w-3 mr-1" />
                    {pushMetrics.failed}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
