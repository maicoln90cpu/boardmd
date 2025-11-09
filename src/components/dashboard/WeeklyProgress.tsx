import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserStats } from "@/hooks/useUserStats";
import { Calendar, CheckCircle2, Target } from "lucide-react";

interface WeeklyProgressProps {
  stats: UserStats | null | undefined;
}

export function WeeklyProgress({ stats }: WeeklyProgressProps) {
  const weeklyGoal = 35; // Meta de 5 tarefas por dia
  const weeklyProgress = stats?.tasks_completed_week || 0;
  const percentage = Math.min((weeklyProgress / weeklyGoal) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Progresso Semanal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Meta Semanal</span>
            <span className="font-bold text-primary">
              {weeklyProgress} / {weeklyGoal} tarefas
            </span>
          </div>
          <Progress value={percentage} className="h-3" />
          <p className="text-xs text-muted-foreground text-right">
            {percentage.toFixed(0)}% concluído
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Hoje</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {stats?.tasks_completed_today || 0}
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Média/dia</span>
            </div>
            <p className="text-2xl font-bold">
              {weeklyProgress > 0 ? (weeklyProgress / 7).toFixed(1) : 0}
            </p>
          </div>
        </div>

        {/* Motivational Message */}
        {percentage >= 100 && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              🎉 Parabéns! Você atingiu sua meta semanal!
            </p>
          </div>
        )}

        {percentage >= 75 && percentage < 100 && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              💪 Quase lá! Faltam apenas {weeklyGoal - weeklyProgress} tarefas!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
