import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useUserStats } from "@/hooks/useUserStats";
import { useTheme } from "@/contexts/ThemeContext";
import { useCategories } from "@/hooks/useCategories";
import { ProductivityChart } from "@/components/dashboard/ProductivityChart";
import { WeeklyProgress } from "@/components/dashboard/WeeklyProgress";
import { GamificationPanel } from "@/components/dashboard/GamificationPanel";
import { DashboardStats } from "@/components/DashboardStats";
import { ProductivityInsights } from "@/components/dashboard/ProductivityInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Target, Zap, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const { stats, isLoading } = useUserStats();
  const { categories } = useCategories();
  const navigate = useNavigate();

  // Buscar todas as tarefas de todas as categorias
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllTasks = async () => {
      const { data } = await supabase.from("tasks").select("*");
      setTasks(data || []);
    };
    fetchAllTasks();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Carregando estatísticas...</div>
        </div>
      </div>
    );
  }

  const level = stats?.level || 1;
  const currentPoints = stats?.total_points || 0;
  const pointsForNextLevel = level * 100;
  const progress = ((currentPoints % 100) / 100) * 100;

  return (
    <div className="flex h-screen">
      <Sidebar
        onExport={() => {}}
        onImport={() => {}}
        onThemeToggle={toggleTheme}
        onViewChange={(mode) => navigate(`/?view=${mode}`)}
        viewMode="all"
      />
      
      <div className="flex-1 flex flex-col overflow-hidden md:ml-64">
        {/* Header com botão de voltar */}
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 border-b bg-background">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm">Voltar</span>
          </button>
          <h2 className="text-base sm:text-lg font-semibold truncate">📊 Dashboard</h2>
        </div>

        <div className="flex-1 overflow-auto pb-[140px] md:pb-0">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-8 border-b">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Seu Progresso</h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Continue assim! Você está no nível {level} 🎯
              </p>
            </div>
          </div>

          {/* Stats Overview */}
          <DashboardStats tasks={tasks} />

          {/* Main Content Grid */}
          <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* AI Insights - Full Width */}
            <ProductivityInsights stats={stats} tasks={tasks} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Charts */}
              <div className="lg:col-span-2 space-y-6">
                <ProductivityChart tasks={tasks} />
                <WeeklyProgress stats={stats} />
              </div>

              {/* Right Column - Gamification */}
              <div className="space-y-6">
                <GamificationPanel stats={stats} progress={progress} />

                {/* Quick Stats */}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
