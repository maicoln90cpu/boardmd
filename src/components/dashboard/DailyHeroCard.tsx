import { Card, CardContent } from "@/components/ui/card";
import { UserStats } from "@/hooks/useUserStats";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Flame,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStats {
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
}

interface DailyHeroCardProps {
  stats: UserStats | null | undefined;
  dashboardStats: DashboardStats | null;
}

export function DailyHeroCard({ stats, dashboardStats }: DailyHeroCardProps) {
  const completedToday = dashboardStats?.completed_today || 0;
  const dueToday = dashboardStats?.due_today || 0;
  const overdue = dashboardStats?.overdue || 0;
  const streak = stats?.current_streak || 0;
  const level = stats?.level || 1;

  // Determinar saudação baseada na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  // Determinar mensagem motivacional
  const getMotivation = () => {
    if (completedToday >= 5) return "Incrível! Você está arrasando hoje! 🔥";
    if (completedToday >= 3) return "Ótimo progresso! Continue assim! 💪";
    if (overdue > 0) return "Você tem tarefas atrasadas. Vamos resolver? 📋";
    if (dueToday > 0) return `${dueToday} tarefa(s) para hoje. Bora! 🎯`;
    return "Pronto para mais um dia produtivo? ✨";
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Saudação e Motivação */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{getGreeting()}!</h2>
                <p className="text-muted-foreground">{getMotivation()}</p>
              </div>
            </div>
          </div>

          {/* Stats Rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Concluídas Hoje */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{completedToday}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </div>

            {/* Para Hoje */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{dueToday}</p>
                <p className="text-xs text-muted-foreground">Para hoje</p>
              </div>
            </div>

            {/* Atrasadas */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              overdue > 0 
                ? "bg-red-500/10 border-red-500/20" 
                : "bg-muted/50 border-transparent"
            )}>
              <AlertTriangle className={cn(
                "h-5 w-5",
                overdue > 0 ? "text-red-600" : "text-muted-foreground"
              )} />
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  overdue > 0 ? "text-red-600" : "text-muted-foreground"
                )}>{overdue}</p>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
              </div>
            </div>

            {/* Streak */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              streak >= 7 
                ? "bg-orange-500/10 border-orange-500/20" 
                : "bg-muted/50 border-transparent"
            )}>
              <Flame className={cn(
                "h-5 w-5",
                streak >= 7 ? "text-orange-500" : "text-muted-foreground"
              )} />
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  streak >= 7 ? "text-orange-500" : "text-foreground"
                )}>{streak}</p>
                <p className="text-xs text-muted-foreground">Dias seguidos</p>
              </div>
            </div>
          </div>

          {/* Level Badge */}
          <div className="hidden xl:flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Nível</p>
              <p className="text-3xl font-bold text-primary">{level}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
