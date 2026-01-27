import React from "react";
import { Button } from "@/components/ui/button";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardActionsProps {
  taskId: string;
  isFavorite: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  densityMode: "comfortable" | "compact" | "ultra-compact";
  trackMetrics?: boolean;
  onToggleFavorite?: (taskId: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onDuplicate?: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onOpenMetricsHistory?: () => void;
}

export const TaskCardActions: React.FC<TaskCardActionsProps> = ({
  taskId,
  isFavorite,
  canMoveLeft,
  canMoveRight,
  densityMode,
  trackMetrics,
  onToggleFavorite,
  onMoveLeft,
  onMoveRight,
  onDuplicate,
  onDelete,
  onOpenMetricsHistory,
}) => {
  return (
    <div
      className={cn(
        "flex items-center",
        densityMode === "compact" && "gap-0.5",
        densityMode === "comfortable" && "gap-1",
      )}
    >
      {onToggleFavorite && (
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            isFavorite
              ? "text-yellow-500 hover:text-yellow-600"
              : "text-muted-foreground hover:text-yellow-500",
            densityMode === "compact" && "h-5 w-5",
            densityMode === "comfortable" && "h-7 w-7",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(taskId);
          }}
          title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Star
            className={cn(
              isFavorite && "fill-yellow-500",
              densityMode === "compact" && "h-3 w-3",
              densityMode === "comfortable" && "h-4 w-4",
            )}
          />
        </Button>
      )}
      {trackMetrics && onOpenMetricsHistory && (
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "text-primary hover:text-primary/80",
            densityMode === "compact" && "h-5 w-5",
            densityMode === "comfortable" && "h-7 w-7",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onOpenMetricsHistory();
          }}
          title="Ver histórico de métricas"
        >
          <BarChart3
            className={cn(
              densityMode === "compact" && "h-3 w-3",
              densityMode === "comfortable" && "h-4 w-4",
            )}
          />
        </Button>
      )}
      {canMoveLeft && (
        <Button
          size="icon"
          variant="ghost"
          className={cn(densityMode === "compact" && "h-5 w-5", densityMode === "comfortable" && "h-7 w-7")}
          onClick={(e) => {
            e.stopPropagation();
            onMoveLeft?.();
          }}
        >
          <ChevronLeft
            className={cn(
              densityMode === "compact" && "h-3 w-3",
              densityMode === "comfortable" && "h-4 w-4",
            )}
          />
        </Button>
      )}
      {canMoveRight && (
        <Button
          size="icon"
          variant="ghost"
          className={cn(densityMode === "compact" && "h-5 w-5", densityMode === "comfortable" && "h-7 w-7")}
          onClick={(e) => {
            e.stopPropagation();
            onMoveRight?.();
          }}
        >
          <ChevronRight
            className={cn(
              densityMode === "compact" && "h-3 w-3",
              densityMode === "comfortable" && "h-4 w-4",
            )}
          />
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className={cn(densityMode === "compact" && "h-5 w-5", densityMode === "comfortable" && "h-7 w-7")}
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate?.(taskId);
        }}
        title="Duplicar tarefa"
      >
        <Copy
          className={cn(densityMode === "compact" && "h-3 w-3", densityMode === "comfortable" && "h-4 w-4")}
        />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "text-destructive hover:text-destructive hover:bg-destructive/10",
          densityMode === "compact" && "h-5 w-5",
          densityMode === "comfortable" && "h-7 w-7",
        )}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(taskId);
        }}
      >
        <Trash2
          className={cn(densityMode === "compact" && "h-3 w-3", densityMode === "comfortable" && "h-4 w-4")}
        />
      </Button>
    </div>
  );
};
