import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useUserStats } from "@/hooks/useUserStats";
import { useTheme } from "@/contexts/ThemeContext";
import { useCategories } from "@/hooks/data/useCategories";
import { ProductivityChart } from "@/components/dashboard/ProductivityChart";
import { WeeklyProgress } from "@/components/dashboard/WeeklyProgress";
import { GamificationPanel } from "@/components/dashboard/GamificationPanel";
import { DashboardStats } from "@/components/DashboardStats";
import { ProductivityInsights } from "@/components/dashboard/ProductivityInsights";
import { SystemHealthMonitor } from "@/components/dashboard/SystemHealthMonitor";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { DailyHeroCard } from "@/components/dashboard/DailyHeroCard";
import { ReportExportButton } from "@/components/dashboard/ReportExportButton";
import { DashboardWidgetContainer, DashboardWidget } from "@/components/dashboard/DashboardWidgetContainer";
import { GoalsCard } from "@/components/dashboard/GoalsCard";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Target, Zap, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StatsLoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const { stats, isLoading } = useUserStats();
  const { categories } = useCategories();
  const navigate = useNavigate();
  const { widgetConfig, updateWidgetConfig, isWidgetEnabled } = useDashboardWidgets();

  // Buscar todas as tarefas de todas as categorias
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllTasks = async () => {
      const { data } = await supabase.from("tasks").select("*");
      setTasks(data || []);
    };
    fetchAllTasks();
  }, []);

  // Computed dashboard stats
  const dashboardStats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.is_completed).length,
    pending: tasks.filter(t => !t.is_completed).length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !t.is_completed).length,
    due_today: tasks.filter(t => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString() && !t.is_completed).length,
    due_this_week: tasks.filter(t => t.due_date && new Date(t.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && !t.is_completed).length,
    completed_today: tasks.filter(t => t.is_completed && t.updated_at && new Date(t.updated_at).toDateString() === new Date().toDateString()).length,
    completed_this_week: tasks.filter(t => t.is_completed && t.updated_at && new Date(t.updated_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
    high_priority: tasks.filter(t => t.priority === 'high' && !t.is_completed).length,
    favorites: tasks.filter(t => t.is_favorite).length,
  }), [tasks]);

  const level = stats?.level || 1;
  const currentPoints = stats?.total_points || 0;
  const progress = ((currentPoints % 100) / 100) * 100;

  // Build widgets array based on config
  const widgets: DashboardWidget[] = useMemo(() => {
    const widgetComponents: Record<string, { name: string; component: React.ReactNode }> = {
      "hero": {
        name: "📊 Resumo Diário",
        component: (
          <DailyHeroCard stats={stats} dashboardStats={dashboardStats} />
        ),
      },
      "goals": {
        name: "🎯 Metas",
        component: <GoalsCard />,
      },
      "stats": {
        name: "📈 Estatísticas",
        component: <DashboardStats tasks={tasks} />,
      },
      "insights": {
        name: "🤖 Insights de IA",
        component: <ProductivityInsights stats={stats} tasks={tasks} />,
      },
      "productivity-chart": {
        name: "📊 Gráfico de Produtividade",
        component: <ProductivityChart tasks={tasks} />,
      },
      "performance-metrics": {
        name: "⚡ Métricas de Performance",
        component: <PerformanceMetrics />,
      },
      "weekly-progress": {
        name: "📅 Progresso Semanal",
        component: <WeeklyProgress stats={stats} />,
      },
      "gamification": {
        name: "🎮 Gamificação",
        component: <GamificationPanel stats={stats} progress={progress} />,
      },
      "highlights": {
        name: "⚡ Destaques",
        component: (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Destaques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="font-medium">Meta Diária</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {stats?.tasks_completed_today || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Esta Semana</span>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {stats?.tasks_completed_week || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Sequência</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">
                  {stats?.current_streak || 0} dias
                </span>
              </div>
            </CardContent>
          </Card>
        ),
      },
      "system-health": {
        name: "🔧 Saúde do Sistema",
        component: <SystemHealthMonitor />,
      },
    };

    return widgetConfig.map((config) => ({
      id: config.id,
      name: widgetComponents[config.id]?.name || config.id,
      enabled: config.enabled,
      component: widgetComponents[config.id]?.component || null,
    }));
  }, [widgetConfig, stats, tasks, dashboardStats, progress]);

  // Handle widget changes
  const handleWidgetsChange = (newWidgets: DashboardWidget[]) => {
    updateWidgetConfig(newWidgets.map((w) => ({ id: w.id, enabled: w.enabled })));
  };

  // OTIMIZAÇÃO FASE 3: Adicionar imports de skeleton loading
  if (isLoading) {
    return <StatsLoadingSkeleton />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={toggleTheme}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header com botão de voltar */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-3 border-b bg-background">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm">Voltar</span>
            </button>
            <h2 className="text-base sm:text-lg font-semibold truncate">📊 Dashboard</h2>
          </div>
          <ReportExportButton tasks={tasks} categories={categories} stats={stats} />
        </div>

        <div className="flex-1 overflow-auto pb-[140px] md:pb-0">
          <div className="p-6 max-w-7xl mx-auto space-y-6 relative pt-12">
            <DashboardWidgetContainer
              widgets={widgets}
              onWidgetsChange={handleWidgetsChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
