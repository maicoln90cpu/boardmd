import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Course } from "@/types";
import { TrendingUp, Clock, Target, BookOpen } from "lucide-react";
import { startOfWeek, endOfWeek, isWithinInterval, subWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CoursesDashboardProps {
  courses: Course[];
}

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

export function CoursesDashboard({ courses }: CoursesDashboardProps) {
  // Progresso por status
  const statusData = useMemo(() => {
    const counts = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      paused: 0,
    };
    
    courses.forEach((course) => {
      counts[course.status as keyof typeof counts]++;
    });

    return [
      { name: "Não Iniciados", value: counts.not_started, color: "#6B7280" },
      { name: "Em Progresso", value: counts.in_progress, color: "#3B82F6" },
      { name: "Concluídos", value: counts.completed, color: "#10B981" },
      { name: "Pausados", value: counts.paused, color: "#F59E0B" },
    ].filter(item => item.value > 0);
  }, [courses]);

  // Progresso semanal (últimas 8 semanas)
  const weeklyProgressData = useMemo(() => {
    const weeks = [];
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 0 });
      
      let episodesCompleted = 0;
      
      courses.forEach((course) => {
        if (course.updated_at) {
          const updateDate = new Date(course.updated_at);
          if (isWithinInterval(updateDate, { start: weekStart, end: weekEnd })) {
            // Estimar episódios completados baseado no progresso
            episodesCompleted += course.current_episode;
          }
        }
      });

      weeks.push({
        week: format(weekStart, "dd/MM", { locale: ptBR }),
        episodios: Math.min(episodesCompleted, 50), // Cap para visualização
      });
    }

    return weeks;
  }, [courses]);

  // Tempo investido por categoria
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, { episodes: number; courses: number }>();
    
    courses.forEach((course) => {
      const category = course.category || "Sem categoria";
      const existing = categoryMap.get(category) || { episodes: 0, courses: 0 };
      categoryMap.set(category, {
        episodes: existing.episodes + course.current_episode,
        courses: existing.courses + 1,
      });
    });

    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name: name.length > 12 ? name.substring(0, 12) + "..." : name,
        episodios: data.episodes,
        cursos: data.courses,
      }))
      .sort((a, b) => b.episodios - a.episodios)
      .slice(0, 6);
  }, [courses]);

  // Métricas resumidas
  const metrics = useMemo(() => {
    const totalEpisodes = courses.reduce((acc, c) => acc + c.current_episode, 0);
    const totalTarget = courses.reduce((acc, c) => acc + c.total_episodes, 0);
    const completedCourses = courses.filter(c => c.status === "completed").length;
    const avgProgress = totalTarget > 0 ? Math.round((totalEpisodes / totalTarget) * 100) : 0;
    
    // Estimativa de tempo (15 min por episódio em média)
    const estimatedHours = Math.round((totalEpisodes * 15) / 60);

    return {
      totalEpisodes,
      completedCourses,
      avgProgress,
      estimatedHours,
    };
  }, [courses]);

  const chartConfig = {
    episodios: { label: "Episódios", color: "hsl(var(--primary))" },
    cursos: { label: "Cursos", color: "hsl(var(--secondary))" },
  };

  return (
    <div className="space-y-6">
      {/* Métricas resumidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Episódios Assistidos</p>
              <p className="text-2xl font-bold">{metrics.totalEpisodes}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Target className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cursos Concluídos</p>
              <p className="text-2xl font-bold">{metrics.completedCourses}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Progresso Médio</p>
              <p className="text-2xl font-bold">{metrics.avgProgress}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tempo Estimado</p>
              <p className="text-2xl font-bold">{metrics.estimatedHours}h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Progresso Semanal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progresso Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <LineChart data={weeklyProgressData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="episodios" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status dos Cursos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status dos Cursos</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Episódios por Categoria */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Episódios por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="episodios" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
