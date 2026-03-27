import { useState, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useUserStats } from "@/hooks/useUserStats";
import { useTheme } from "@/contexts/ThemeContext";
import { useCategories } from "@/hooks/data/useCategories";
import { ProductivityChart } from "@/components/dashboard/ProductivityChart";
import { ProductivityHeatmap } from "@/components/dashboard/ProductivityHeatmap";
import { CategoryCharts } from "@/components/dashboard/CategoryCharts";
import { WeeklyProgress } from "@/components/dashboard/WeeklyProgress";
import { GamificationPanel } from "@/components/dashboard/GamificationPanel";
import { DashboardStats } from "@/components/DashboardStats";
import { ProductivityInsights } from "@/components/dashboard/ProductivityInsights";
import { SystemHealthMonitor } from "@/components/dashboard/SystemHealthMonitor";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { DailyHeroCard } from "@/components/dashboard/DailyHeroCard";
import { ReportExportButton } from "@/components/dashboard/ReportExportButton";
import { ContinueStudyingCard } from "@/components/dashboard/ContinueStudyingCard";
import { DailyDigestCard } from "@/components/dashboard/DailyDigestCard";
import { DashboardWidgetContainer, DashboardWidget } from "@/components/dashboard/DashboardWidgetContainer";
import { GoalsCard } from "@/components/dashboard/GoalsCard";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Target, Zap, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { StatsLoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const { stats, isLoading } = useUserStats();
  const { categories } = useCategories();
  const navigate = useNavigate();
  const { widgetConfig, updateWidgetConfig, isWidgetEnabled } = useDashboardWidgets();
  const { user } = useAuth();

  // Use RPC instead of SELECT * for dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc("get_dashboard_stats", {
        p_user_id: user.id,
      });
      if (error) throw error;
      return data as {
        total: number;
        completed: number;
        pending: number;
        overdue: number;
        due_today: number;
        due_this_week: number;
        completed_today: number;
        completed_this_week: number;
        high_priority: number;
        favorites: number;
      };
    },
    enabled: !!user?.id,
  });

  // Fetch only minimal task data needed for insights and digest (title, priority, column_id, due_date, is_completed, updated_at)
  const { data: tasks = [] } = useQuery({
    queryKey: ["dashboard-tasks-minimal", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, priority, column_id, due_date, is_completed, updated_at, is_favorite, category_id, tags")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch columns (minimal)
  const { data: columns = [] } = useQuery({
    queryKey: ["dashboard-columns-minimal", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("columns")
        .select("id, name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Filter tasks excluding "Recorrente" column for AI insights
  const tasksForInsights = useMemo(() => {
    const recurrentColumnIds = columns
      .filter(col => col.name.toLowerCase() === "recorrente" || col.name.toLowerCase() === "recorrentes")
      .map(col => col.id);
    return tasks.filter(task => !recurrentColumnIds.includes(task.column_id));
  }, [tasks, columns]);

  const resolvedStats = useMemo(() => dashboardStats || {
    total: 0, completed: 0, pending: 0, overdue: 0,
    due_today: 0, due_this_week: 0, completed_today: 0,
    completed_this_week: 0, high_priority: 0, favorites: 0,
  }, [dashboardStats]);

  const level = stats?.level || 1;
  const currentPoints = stats?.total_points || 0;
  const progress = ((currentPoints % 100) / 100) * 100;

  // Build widgets array based on config
  const widgets: DashboardWidget[] = useMemo(() => {
    const widgetComponents: Record<string, { name: string; component: React.ReactNode }> = {
      "continue-studying": {
        name: "📚 Continuar Estudando",
        component: <ContinueStudyingCard />,
      },
      "daily-digest": {
        name: "📰 Digest do Dia",
        component: <DailyDigestCard tasks={tasks as any} />,
      },
      "hero": {
        name: "📊 Resumo Diário",
        component: (
          <DailyHeroCard stats={stats} dashboardStats={resolvedStats} />
        ),
      },
      "goals": {
        name: "🎯 Metas",
        component: <GoalsCard />,
      },
      "stats": {
        name: "📈 Estatísticas",
        component: <DashboardStats tasks={tasks as any} />,
      },
      "insights": {
        name: "🤖 Insights de IA",
        component: <ProductivityInsights stats={stats} tasks={tasksForInsights as any} />,
      },
      "productivity-chart": {
        name: "📊 Gráfico de Produtividade",
        component: <ProductivityChart tasks={tasks as any} />,
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
      "heatmap": {
        name: "🔥 Heatmap de Produtividade",
        component: <ProductivityHeatmap tasks={tasks as any} />,
      },
      "category-charts": {
        name: "📊 Distribuição por Categoria",
        component: <CategoryCharts tasks={tasks as any} categories={categories} />,
      },
    };

    return widgetConfig.map((config) => ({
      id: config.id,
      name: widgetComponents[config.id]?.name || config.id,
      enabled: config.enabled,
      component: widgetComponents[config.id]?.component || null,
    }));
  }, [widgetConfig, stats, tasks, resolvedStats, progress, tasksForInsights]);

  // Handle widget changes
  const handleWidgetsChange = (newWidgets: DashboardWidget[]) => {
    updateWidgetConfig(newWidgets.map((w) => ({ id: w.id, enabled: w.enabled })));
  };

  if (isLoading) {
    return <StatsLoadingSkeleton />;
  }

  return (
    <div className="flex h-screen pt-14 md:pt-0">
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
              aria-label="Voltar para a página inicial"
              className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0 min-h-[44px]"
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-xs sm:text-sm">Voltar</span>
            </button>
            <h2 className="text-base sm:text-lg font-semibold truncate">📊 Dashboard</h2>
          </div>
          <ReportExportButton tasks={tasks as any} categories={categories} stats={stats} />
        </div>

        <div className="flex-1 overflow-auto">
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
