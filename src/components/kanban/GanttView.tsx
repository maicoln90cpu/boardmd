import { useMemo, useRef, useState } from "react";
import { Task } from "@/hooks/tasks/useTasks";
import { Column } from "@/hooks/data/useColumns";
import { format, differenceInDays, addDays, startOfDay, min, max, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GanttViewProps {
  tasks: Task[];
  columns: Column[];
  onEditTask: (task: Task) => void;
  categoriesMap: Record<string, string>;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "hsl(0 84% 60%)",
  medium: "hsl(45 93% 47%)",
  low: "hsl(142 71% 45%)",
};

const DAY_WIDTH = 36;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 60;
const LABEL_WIDTH = 220;

export function GanttView({ tasks, columns, onEditTask, categoriesMap }: GanttViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Only tasks with due_date
  const ganttTasks = useMemo(() => {
    return tasks
      .filter((t) => t.due_date && !t.is_completed)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }, [tasks]);

  // Calculate date range: 4 weeks centered on today + offset
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, weekOffset * 7 - 14);
  const rangeEnd = addDays(rangeStart, 42); // 6 weeks
  const totalDays = differenceInDays(rangeEnd, rangeStart);

  // Generate day headers
  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < totalDays; i++) {
      result.push(addDays(rangeStart, i));
    }
    return result;
  }, [rangeStart, totalDays]);

  // Group by weeks for header
  const weeks = useMemo(() => {
    const result: { start: Date; days: number; label: string }[] = [];
    let currentWeekStart = days[0];
    let count = 0;

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      if (day.getDay() === 1 && count > 0) {
        result.push({
          start: currentWeekStart,
          days: count,
          label: format(currentWeekStart, "dd MMM", { locale: ptBR }),
        });
        currentWeekStart = day;
        count = 0;
      }
      count++;
    }
    if (count > 0) {
      result.push({
        start: currentWeekStart,
        days: count,
        label: format(currentWeekStart, "dd MMM", { locale: ptBR }),
      });
    }
    return result;
  }, [days]);

  const getBarPosition = (task: Task) => {
    const dueDate = startOfDay(parseISO(task.due_date!));
    const createdDate = startOfDay(parseISO(task.created_at));

    const barStart = isBefore(createdDate, rangeStart) ? rangeStart : createdDate;
    const barEnd = isAfter(dueDate, rangeEnd) ? rangeEnd : dueDate;

    const left = differenceInDays(barStart, rangeStart) * DAY_WIDTH;
    const width = Math.max((differenceInDays(barEnd, barStart) + 1) * DAY_WIDTH, DAY_WIDTH);

    return { left, width };
  };

  const isToday = (date: Date) => {
    return format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
  };

  if (ganttTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium mb-1">Nenhuma tarefa com data de vencimento</p>
          <p className="text-sm">Adicione datas às suas tarefas para vê-las na timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((o) => o - 2)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
          Hoje
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset((o) => o + 2)}>
          Próximo <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="flex overflow-hidden">
        {/* Task labels column */}
        <div className="flex-shrink-0 border-r bg-card z-10" style={{ width: LABEL_WIDTH }}>
          <div
            className="border-b px-3 flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wide"
            style={{ height: HEADER_HEIGHT }}
          >
            Tarefa
          </div>
          {ganttTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onEditTask(task)}
              className="w-full text-left px-3 flex items-center gap-2 border-b hover:bg-accent/50 transition-colors"
              style={{ height: ROW_HEIGHT }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: PRIORITY_COLORS[task.priority || "medium"] }}
              />
              <span className="text-sm truncate">{task.title}</span>
            </button>
          ))}
        </div>

        {/* Timeline area */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto">
          <div style={{ width: totalDays * DAY_WIDTH, minWidth: "100%" }}>
            {/* Week + Day headers */}
            <div className="border-b" style={{ height: HEADER_HEIGHT }}>
              {/* Week row */}
              <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
                {weeks.map((week, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center text-xs font-medium text-muted-foreground border-r"
                    style={{ width: week.days * DAY_WIDTH }}
                  >
                    {week.label}
                  </div>
                ))}
              </div>
              {/* Day row */}
              <div className="flex" style={{ height: HEADER_HEIGHT / 2 }}>
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-center text-[10px] border-r ${
                      isToday(day)
                        ? "bg-primary/20 font-bold text-primary"
                        : day.getDay() === 0 || day.getDay() === 6
                        ? "bg-muted/50 text-muted-foreground"
                        : "text-muted-foreground"
                    }`}
                    style={{ width: DAY_WIDTH }}
                  >
                    {format(day, "dd")}
                  </div>
                ))}
              </div>
            </div>

            {/* Task rows with bars */}
            {ganttTasks.map((task) => {
              const { left, width } = getBarPosition(task);
              const isOverdue =
                task.due_date && new Date(task.due_date) < today && !task.is_completed;

              return (
                <div
                  key={task.id}
                  className="relative border-b"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Grid lines */}
                  {days.map((day, i) => (
                    <div
                      key={i}
                      className={`absolute top-0 bottom-0 border-r ${
                        isToday(day) ? "bg-primary/5" : ""
                      }`}
                      style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                    />
                  ))}

                  {/* Today line */}
                  {days.some((d) => isToday(d)) && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                      style={{
                        left:
                          days.findIndex((d) => isToday(d)) * DAY_WIDTH +
                          DAY_WIDTH / 2,
                      }}
                    />
                  )}

                  {/* Task bar */}
                  <div
                    className={`absolute top-1.5 rounded-md cursor-pointer transition-all hover:brightness-110 hover:shadow-md ${
                      isOverdue ? "opacity-80" : ""
                    }`}
                    style={{
                      left,
                      width: Math.max(width, 4),
                      height: ROW_HEIGHT - 12,
                      backgroundColor:
                        PRIORITY_COLORS[task.priority || "medium"],
                      opacity: 0.85,
                    }}
                    onClick={() => onEditTask(task)}
                    title={`${task.title}\n${
                      task.due_date
                        ? format(parseISO(task.due_date), "dd/MM/yyyy")
                        : ""
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: PRIORITY_COLORS.high }} />
          Alta
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: PRIORITY_COLORS.medium }} />
          Média
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: PRIORITY_COLORS.low }} />
          Baixa
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-3 h-0.5 bg-primary" />
          Hoje
        </div>
      </div>
    </div>
  );
}
