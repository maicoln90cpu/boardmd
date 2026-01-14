import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { UserStats } from "@/hooks/useUserStats";
import { useAchievements, rarityColors, rarityNames, allBadges } from "@/hooks/useAchievements";
import { Trophy, Flame, Star, Award, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface GamificationPanelProps {
  stats: UserStats | null | undefined;
  progress: number;
}

export function GamificationPanel({ stats, progress }: GamificationPanelProps) {
  const level = stats?.level || 1;
  const currentPoints = stats?.total_points || 0;
  const pointsInLevel = currentPoints % 100;

  // Converter stats para o formato do hook
  const badgeStats = stats ? {
    level: stats.level || 1,
    totalPoints: stats.total_points || 0,
    currentStreak: stats.current_streak || 0,
    bestStreak: stats.best_streak || 0,
    tasksCompletedToday: stats.tasks_completed_today || 0,
    tasksCompletedWeek: stats.tasks_completed_week || 0,
    totalTasksCompleted: 0, // Não temos essa info direta
  } : null;

  const { getUnlockedBadges, getNextBadges } = useAchievements(badgeStats);

  const unlockedBadges = getUnlockedBadges();
  const nextBadges = getNextBadges();

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

        {/* Badges Desbloqueados */}
        {unlockedBadges.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Conquistas ({unlockedBadges.length}/{allBadges.length})
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {unlockedBadges.slice(0, 8).map((badge) => (
                <HoverCard key={badge.id}>
                  <HoverCardTrigger asChild>
                    <button
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-lg border-2 text-2xl transition-transform hover:scale-110",
                        rarityColors[badge.rarity]
                      )}
                    >
                      {badge.icon}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{badge.icon}</span>
                      <div>
                        <h4 className="font-bold">{badge.name}</h4>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                        <Badge 
                          variant="secondary" 
                          className={cn("mt-2 text-xs", rarityColors[badge.rarity])}
                        >
                          {rarityNames[badge.rarity]}
                        </Badge>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
              
              {/* Show more indicator */}
              {unlockedBadges.length > 8 && (
                <div className="aspect-square flex items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground text-sm font-medium">
                  +{unlockedBadges.length - 8}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Próximas Conquistas */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-3 font-medium">
            Próximas conquistas:
          </p>
          <div className="space-y-2">
            {nextBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-2 text-sm p-2 rounded bg-background/50"
              >
                <span className="text-lg opacity-50">{badge.icon}</span>
                <span className="flex-1 text-muted-foreground">{badge.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
