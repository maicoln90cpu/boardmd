import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShortBR } from "@/lib/dateUtils";
import { getCategoryBadgeStyle, getPriorityBadgeStyle } from "./TaskCardBadges";

interface TaskCardUltraCompactProps {
  task: {
    id: string;
    title: string;
    is_favorite: boolean;
    priority: string | null;
    due_date: string | null;
    mirror_task_id: string | null;
    categories?: { name: string };
  };
  isCompleted: boolean;
  hideBadges: boolean;
  showCategoryBadge: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  isOverdue: boolean;
  isUrgent: boolean;
  onToggleCompleted: (checked: boolean) => void;
  onEdit: () => void;
  onToggleFavorite?: (taskId: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onDuplicate?: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onNavigatePomodoro: () => void;
}

export const TaskCardUltraCompact: React.FC<TaskCardUltraCompactProps> = ({
  task,
  isCompleted,
  hideBadges,
  showCategoryBadge,
  canMoveLeft,
  canMoveRight,
  isOverdue,
  isUrgent,
  onToggleCompleted,
  onEdit,
  onToggleFavorite,
  onMoveLeft,
  onMoveRight,
  onDuplicate,
  onDelete,
  onNavigatePomodoro,
}) => {
  return (
    <div className="flex items-center gap-1 text-[10px]">
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onToggleCompleted(!!checked)}
        className="h-3 w-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      />
      {onToggleFavorite && (
        <Button
          size="icon"
          variant="ghost"
          className={`h-4 w-4 p-0 shrink-0 ${task.is_favorite ? "text-yellow-500" : "text-muted-foreground"}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(task.id);
          }}
        >
          <Star className={`h-3 w-3 ${task.is_favorite ? "fill-yellow-500" : ""}`} />
        </Button>
      )}
      <span
        className={cn(
          "font-medium truncate flex-1 min-w-0 cursor-pointer text-xs",
          isCompleted && "line-through opacity-50",
        )}
        onClick={onEdit}
      >
        {task.title}
      </span>
      {!hideBadges && showCategoryBadge && task.categories?.name && (
        <Badge 
          className="text-[9px] px-1 py-0 shrink-0 rounded-full font-medium shadow-sm"
          style={getCategoryBadgeStyle(task.categories.name)}
        >
          {task.categories.name}
        </Badge>
      )}
      {!hideBadges && task.priority && (
        <Badge 
          className="text-[9px] px-1.5 py-0 shrink-0 rounded-full font-semibold tracking-wide shadow-sm" 
          style={getPriorityBadgeStyle(task.priority)}
        >
          {task.priority[0].toUpperCase()}
        </Badge>
      )}
      {!hideBadges && task.due_date && (
        <span
          className={`text-[9px] shrink-0 ${isOverdue ? "text-destructive" : isUrgent ? "text-orange-600" : "text-muted-foreground"}`}
        >
          {formatDateShortBR(task.due_date)}
        </span>
      )}
      {!hideBadges && task.mirror_task_id && (
        <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0 bg-cyan-500 text-white">
          🪞
        </Badge>
      )}
      <div className="flex gap-0.5 shrink-0">
        {canMoveLeft && (
          <Button
            size="icon"
            variant="ghost"
            className="h-4 w-4 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMoveLeft?.();
            }}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
        )}
        {canMoveRight && (
          <Button
            size="icon"
            variant="ghost"
            className="h-4 w-4 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMoveRight?.();
            }}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-4 w-4 p-0 text-primary hover:text-primary hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
            onNavigatePomodoro();
          }}
          title="Iniciar Pomodoro com esta tarefa"
        >
          <Play className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-4 w-4 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate?.(task.id);
          }}
          title="Duplicar tarefa"
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-4 w-4 p-0 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
