import { subDays, format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flame } from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Task {
  updated_at: string;
  is_completed: boolean | null;
}

interface ProductivityHeatmapProps {
  tasks: Task[];
}

export function ProductivityHeatmap({ tasks }: ProductivityHeatmapProps) {
  const { data, maxCount } = useMemo(() => {
    // Last 12 weeks (84 days)
    const days = 84;
    const counts: Record<string, number> = {};
    let max = 0;

    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), days - 1 - i);
      const key = format(date, "yyyy-MM-dd");
      counts[key] = 0;
    }

    tasks.forEach((task) => {
      if (!task.is_completed || !task.updated_at) return;
      const key = format(new Date(task.updated_at), "yyyy-MM-dd");
      if (counts[key] !== undefined) {
        counts[key]++;
        if (counts[key] > max) max = counts[key];
      }
    });

    // Build grid: 7 rows (Mon-Sun) x 12 cols (weeks)
    const grid: { date: string; count: number; label: string }[][] = Array.from({ length: 7 }, () => []);
    const sortedDates = Object.keys(counts).sort();

    sortedDates.forEach((dateStr) => {
      const d = new Date(dateStr);
      const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
      grid[dayOfWeek].push({
        date: dateStr,
        count: counts[dateStr],
        label: format(d, "dd MMM (EEEE)", { locale: ptBR }),
      });
    });

    return { data: grid, maxCount: max };
  }, [tasks]);

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted";
    const ratio = maxCount > 0 ? count / maxCount : 0;
    if (ratio <= 0.25) return "bg-primary/20";
    if (ratio <= 0.5) return "bg-primary/40";
    if (ratio <= 0.75) return "bg-primary/70";
    return "bg-primary";
  };

  const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Heatmap de Produtividade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1">
              {dayLabels.map((label, i) => (
                <span key={i} className="text-[10px] text-muted-foreground h-[14px] flex items-center">
                  {i % 2 === 0 ? label : ""}
                </span>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-[3px] overflow-x-auto">
              {data[0]?.map((_, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-[3px]">
                  {data.map((row, rowIndex) => {
                    const cell = row[colIndex];
                    if (!cell) return <div key={rowIndex} className="h-[14px] w-[14px]" />;
                    return (
                      <Tooltip key={rowIndex}>
                        <TooltipTrigger asChild>
                          <div
                            className={`h-[14px] w-[14px] rounded-sm ${getColor(cell.count)} transition-colors`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">{cell.label}</p>
                          <p>{cell.count} tarefa{cell.count !== 1 ? "s" : ""} concluída{cell.count !== 1 ? "s" : ""}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[10px] text-muted-foreground">Menos</span>
            <div className="h-[10px] w-[10px] rounded-sm bg-muted" />
            <div className="h-[10px] w-[10px] rounded-sm bg-primary/20" />
            <div className="h-[10px] w-[10px] rounded-sm bg-primary/40" />
            <div className="h-[10px] w-[10px] rounded-sm bg-primary/70" />
            <div className="h-[10px] w-[10px] rounded-sm bg-primary" />
            <span className="text-[10px] text-muted-foreground">Mais</span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
