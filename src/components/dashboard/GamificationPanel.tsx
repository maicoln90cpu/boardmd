import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { UserStats } from "@/hooks/useUserStats";
import { Trophy, Flame, Star, Award } from "lucide-react";

interface GamificationPanelProps {
  stats: UserStats | null | undefined;
  progress: number;
}

export function GamificationPanel({ stats, progress }: GamificationPanelProps) {
  const level = stats?.level || 1;
  const currentPoints = stats?.total_points || 0;
  const pointsInLevel = currentPoints % 100;
  const nextLevelPoints = level * 100;

  // Badges baseados em conquistas
  const badges = [];
  if ((stats?.best_streak || 0) >= 7) badges.push({ icon: "🔥", name: "Semana de Fogo", color: "orange" });
  if ((stats?.total_points || 0) >= 500) badges.push({ icon: "⭐", name: "Estrela Ascendente", color: "yellow" });
  if ((stats?.tasks_completed_week || 0) >= 35) badges.push({ icon: "💪", name: "Produtivo", color: "blue" });
  if (level >= 10) badges.push({ icon: "👑", name: "Mestre", color: "purple" });

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Gamificação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Level Display */}
        <div className="text-center p-6 bg-background rounded-lg border-2 border-primary/20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-3">
            <Star className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-3xl font-bold mb-1">Nível {level}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {pointsInLevel} / 100 XP
          </p>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {100 - pointsInLevel} XP para o próximo nível
          </p>
        </div>

        {/* Streak */}
        <div className="p-4 bg-background rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-medium">Sequência Atual</span>
            </div>
            <span className="text-2xl font-bold text-orange-500">
              {stats?.current_streak || 0}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Melhor: {stats?.best_streak || 0} dias 🏆
          </div>
        </div>

        {/* Total Points */}
        <div className="p-4 bg-background rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="font-medium">Pontos Totais</span>
            </div>
            <span className="text-2xl font-bold text-primary">
              {currentPoints}
            </span>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Conquistas Desbloqueadas
            </h4>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="text-sm px-3 py-1"
                >
                  <span className="mr-1">{badge.icon}</span>
                  {badge.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Next Achievements */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Próximas conquistas:</p>
          <div className="space-y-1 text-xs">
            {(stats?.best_streak || 0) < 7 && (
              <div>🔥 Semana de Fogo (7 dias seguidos)</div>
            )}
            {(stats?.total_points || 0) < 500 && (
              <div>⭐ Estrela Ascendente (500 pontos)</div>
            )}
            {level < 10 && (
              <div>👑 Mestre (Nível 10)</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
