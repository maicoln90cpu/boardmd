import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Play, CheckCircle2, DollarSign, TrendingUp, Pause } from "lucide-react";
import type { CourseStats as CourseStatsType } from "@/types";

interface CourseStatsProps {
  stats: CourseStatsType;
}

export function CourseStats({ stats }: CourseStatsProps) {
  const statCards = [
    {
      label: "Total de Cursos",
      value: stats.total,
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Em Progresso",
      value: stats.inProgress,
      icon: Play,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Concluídos",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Pausados",
      value: stats.paused,
      icon: Pause,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Investimento Total",
      value: `R$ ${stats.totalInvestment.toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Progresso Médio",
      value: `${Math.round(stats.averageProgress)}%`,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((stat) => (
        <Card key={stat.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className="text-lg font-semibold truncate">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
