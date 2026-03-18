import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Flame } from "lucide-react";
import type { Course } from "@/types";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

interface CourseWeeklyGoalProps {
  courses: Course[];
  weeklyGoal?: number; // episodes per week goal
}

export function CourseWeeklyGoal({ courses, weeklyGoal = 10 }: CourseWeeklyGoalProps) {
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    // Count episodes completed this week (courses updated this week)
    let episodesThisWeek = 0;
    courses.forEach((course) => {
      if (course.updated_at) {
        const updateDate = new Date(course.updated_at);
        if (isWithinInterval(updateDate, { start: weekStart, end: weekEnd })) {
          episodesThisWeek += course.current_episode;
        }
      }
    });

    // Active courses count
    const activeCourses = courses.filter(c => c.status === "in_progress").length;

    // Streak: consecutive days with study activity (simplified)
    const progress = Math.min(Math.round((episodesThisWeek / weeklyGoal) * 100), 100);

    return { episodesThisWeek, activeCourses, progress };
  }, [courses, weeklyGoal]);

  return (
    <Card className="border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Meta Semanal</p>
              <p className="font-bold text-sm">
                {weeklyStats.episodesThisWeek}/{weeklyGoal} ep.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ativos</p>
              <p className="font-bold text-sm">{weeklyStats.activeCourses} cursos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Progresso</p>
              <p className="font-bold text-sm">{weeklyStats.progress}%</p>
            </div>
          </div>
        </div>
        <Progress value={weeklyStats.progress} className="h-1.5 mt-3" />
      </CardContent>
    </Card>
  );
}
