import { format, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Star, Calendar } from "lucide-react";
import { memo, useCallback, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/hooks/tasks/useTasks";
import { cn } from "@/lib/utils";
import { PriorityColors } from "@/types";

interface MobileChecklistItemProps {
  task: Task;
  columnColor: string;
  onToggleComplete: () => void;
  onEdit: () => void;
  onToggleFavorite: (taskId: string) => void;
  onLongPress?: (taskId: string) => void;
  priorityColors?: PriorityColors;
}

const PRIORITY_LABELS: Record<string, string> = {
  high: "A",
  medium: "M",
  low: "B",
};

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  return format(date, "dd/MM", { locale: ptBR });
}

function getDateUrgencyClass(dateStr: string): string {
  const date = new Date(dateStr);
  if (isPast(date) && !isToday(date)) return "text-destructive";
  if (isToday(date)) return "text-orange-500";
  if (isTomorrow(date)) return "text-amber-500";
  return "text-muted-foreground";
}

export const MobileChecklistItem = memo(function MobileChecklistItem({
  task,
  columnColor,
  onToggleComplete,
  onEdit,
  onToggleFavorite,
  onLongPress,
  priorityColors,
}: MobileChecklistItemProps) {
  const isCompleted = task.is_completed || false;
  const priority = task.priority as "high" | "medium" | "low" | null;

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handleTitleTap = useCallback(() => {
    if (didLongPress.current) return;
    onEdit();
  }, [onEdit]);

  const handleTouchStart = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      onLongPress?.(task.id);
    }, 500);
  }, [onLongPress, task.id]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleFavoriteTap = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFavorite(task.id);
    },
    [onToggleFavorite, task.id],
  );

  const handleCheckboxChange = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleComplete();
    },
    [onToggleComplete],
  );

  const priorityStyle =
    priority && priorityColors?.[priority]
      ? {
          backgroundColor: priorityColors[priority].background,
          color: priorityColors[priority].text,
        }
      : undefined;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 min-h-[44px] border-b border-border/50 transition-colors active:bg-accent/50",
        isCompleted && "opacity-50",
      )}
      role="listitem"
      aria-label={`Tarefa: ${task.title}`}
    >
      {/* Barra lateral colorida */}
      <div className={cn("w-1 self-stretch rounded-full shrink-0", columnColor)} />

      {/* Checkbox */}
      <div
        className="shrink-0 flex items-center justify-center w-8 h-8"
        onClick={handleCheckboxChange}
        role="button"
        aria-label={isCompleted ? "Desmarcar tarefa" : "Completar tarefa"}
      >
        <Checkbox
          checked={isCompleted}
          className="h-4.5 w-4.5 pointer-events-none"
          tabIndex={-1}
        />
      </div>

      {/* Favorito */}
      {task.is_favorite && (
        <button
          onClick={handleFavoriteTap}
          className="shrink-0 p-0.5"
          aria-label="Remover favorito"
        >
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        </button>
      )}

      {/* Título - área clicável principal */}
      <button
        onClick={handleTitleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={cn(
          "flex-1 min-w-0 text-left text-sm truncate py-1 select-none",
          isCompleted && "line-through text-muted-foreground",
        )}
      >
        {task.title}
      </button>

      {/* Data curta */}
      {task.due_date && (
        <span
          className={cn(
            "shrink-0 text-[10px] font-medium flex items-center gap-0.5",
            getDateUrgencyClass(task.due_date),
          )}
        >
          <Calendar className="h-2.5 w-2.5" />
          {formatShortDate(task.due_date)}
        </span>
      )}

      {/* Badge de prioridade */}
      {priority && (
        <span
          className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold"
          style={
            priorityStyle || {
              backgroundColor:
                priority === "high"
                  ? "hsl(var(--destructive) / 0.15)"
                  : priority === "medium"
                    ? "hsl(45 100% 50% / 0.15)"
                    : "hsl(var(--muted))",
              color:
                priority === "high"
                  ? "hsl(var(--destructive))"
                  : priority === "medium"
                    ? "hsl(45 100% 35%)"
                    : "hsl(var(--muted-foreground))",
            }
          }
        >
          {PRIORITY_LABELS[priority]}
        </span>
      )}
    </div>
  );
});
