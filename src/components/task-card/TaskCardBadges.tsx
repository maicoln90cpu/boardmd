import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertCircle, FileText, Repeat, GraduationCap, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShortBR, formatTimeOnlyBR } from "@/lib/dateUtils";
import { useNavigate } from "react-router-dom";

// Premium category color palette
const categoryColorPalette = [
  { bg: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #84cc16 0%, #65a30d 100%)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", text: "#ffffff" },
  { bg: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)", text: "#ffffff" },
];

const priorityGradients = {
  high: "linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)",
  medium: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
  low: "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)",
};

const getCategoryColorIndex = (categoryName: string): number => {
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % categoryColorPalette.length;
};

export const getCategoryBadgeStyle = (categoryName: string) => {
  const colorIndex = getCategoryColorIndex(categoryName);
  const color = categoryColorPalette[colorIndex];
  return {
    background: color.bg,
    color: color.text,
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.12)",
    border: "none",
  };
};

export const getPriorityBadgeStyle = (priority: string) => {
  const gradient = priorityGradients[priority as keyof typeof priorityGradients] || priorityGradients.low;
  return {
    background: gradient,
    color: "#ffffff",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    border: "none",
  };
};

interface TaskCardBadgesProps {
  dueDate: string | null;
  priority: string | null;
  categoryName?: string;
  originalCategoryName?: string | null;
  subtasksCount: number;
  subtasksCompleted: number;
  hideBadges: boolean;
  showCategoryBadge: boolean;
  hasRecurrence: boolean;
  hasLinkedNote?: boolean;
  linkedNoteId?: string | null;
  hasLinkedCourse?: boolean;
  linkedCourseId?: string | null;
  hasCustomNotification?: boolean;
  densityMode: "comfortable" | "compact" | "ultra-compact";
  urgency: "overdue" | "urgent" | "warning" | "normal";
}

export const TaskCardBadges: React.FC<TaskCardBadgesProps> = ({
  dueDate,
  priority,
  categoryName,
  originalCategoryName,
  subtasksCount,
  subtasksCompleted,
  hideBadges,
  showCategoryBadge,
  hasRecurrence,
  hasLinkedNote = false,
  linkedNoteId,
  hasLinkedCourse = false,
  linkedCourseId,
  hasCustomNotification = false,
  densityMode,
  urgency,
}) => {
  const navigate = useNavigate();
  const isOverdue = urgency === "overdue";
  const isUrgent = urgency === "urgent";
  const isWarning = urgency === "warning";

  return (
    <div
      className={cn(
        "flex items-center flex-wrap",
        densityMode === "compact" && "gap-1.5",
        densityMode === "comfortable" && "gap-2",
      )}
    >
      {/* Date + time badge */}
      {dueDate && (
        <div
          className={cn(
            "flex items-center gap-0.5 rounded",
            densityMode === "compact" && "px-1.5 py-0.5 text-[10px]",
            densityMode === "comfortable" && "px-2 py-1 text-xs",
            isOverdue
              ? "bg-destructive/10 text-destructive"
              : isUrgent
                ? "bg-orange-500/10 text-orange-600"
                : isWarning
                  ? "bg-yellow-500/10 text-yellow-600"
                  : "bg-muted",
          )}
        >
          {isOverdue || isUrgent ? (
            <AlertCircle
              className={cn(
                densityMode === "compact" && "h-2.5 w-2.5",
                densityMode === "comfortable" && "h-3.5 w-3.5",
              )}
            />
          ) : (
            <Calendar
              className={cn(
                densityMode === "compact" && "h-2.5 w-2.5",
                densityMode === "comfortable" && "h-3.5 w-3.5",
              )}
            />
          )}
          {formatDateShortBR(dueDate)}
          <Clock
            className={cn(
              "ml-1",
              densityMode === "compact" && "h-2.5 w-2.5",
              densityMode === "comfortable" && "h-3.5 w-3.5",
            )}
          />
          {formatTimeOnlyBR(dueDate)}
        </div>
      )}

      {/* Priority badge */}
      {!hideBadges && priority && (
        <Badge
          className={cn(
            "rounded-full font-semibold tracking-wide shadow-sm transition-transform hover:scale-105",
            densityMode === "compact" && "text-[10px] px-2.5 py-0.5",
            densityMode === "comfortable" && "text-xs px-3 py-1",
          )}
          style={getPriorityBadgeStyle(priority)}
        >
          {priority === "high" ? "Alta" : priority === "medium" ? "Média" : "Baixa"}
        </Badge>
      )}

      {/* Category badge for recurrent tasks */}
      {!hideBadges && hasRecurrence && originalCategoryName && (
        <Badge
          className={cn(
            "rounded-full font-medium shadow-sm transition-transform hover:scale-105",
            densityMode === "compact" && "text-[10px] px-2 py-0.5",
            densityMode === "comfortable" && "text-xs px-2.5 py-1",
          )}
          style={getCategoryBadgeStyle(originalCategoryName)}
        >
          📁 {originalCategoryName}
        </Badge>
      )}

      {/* Category badge in projects */}
      {!hideBadges && showCategoryBadge && categoryName && !originalCategoryName && (
        <Badge
          className={cn(
            "rounded-full font-medium shadow-sm transition-transform hover:scale-105",
            densityMode === "compact" && "text-[10px] px-2 py-0.5",
            densityMode === "comfortable" && "text-xs px-2.5 py-1",
          )}
          style={getCategoryBadgeStyle(categoryName)}
        >
          {categoryName}
        </Badge>
      )}

      {/* Subtasks counter with progress bar */}
      {subtasksCount > 0 && (
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              densityMode === "compact" && "text-[10px] px-1 py-0",
              densityMode === "comfortable" && "text-xs px-1.5 py-0.5",
            )}
          >
            ✓ {subtasksCompleted}/{subtasksCount}
          </Badge>
          {/* Mini progress bar */}
          <div className={cn(
            "relative rounded-full bg-muted overflow-hidden",
            densityMode === "compact" && "h-1 w-8",
            densityMode === "comfortable" && "h-1.5 w-12",
          )}>
            <div 
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.round((subtasksCompleted / subtasksCount) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Recurrence badge */}
      {!hideBadges && hasRecurrence && (
        <Badge
          className={cn(
            "flex items-center gap-1 rounded-full font-medium shadow-sm",
            densityMode === "compact" && "text-[10px] px-2 py-0.5",
            densityMode === "comfortable" && "text-xs px-2.5 py-1",
          )}
          style={{
            background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)",
            color: "#ffffff",
            boxShadow: "0 2px 8px rgba(168, 85, 247, 0.35)",
          }}
          title="Tarefa recorrente"
        >
          <Repeat className={cn(
            densityMode === "compact" && "h-2.5 w-2.5",
            densityMode === "comfortable" && "h-3 w-3",
          )} />
          Recorrente
        </Badge>
      )}

      {/* Linked note badge */}
      {!hideBadges && hasLinkedNote && (
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1 bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors",
            densityMode === "compact" && "text-[10px] px-1.5 py-0",
            densityMode === "comfortable" && "text-xs px-2 py-0.5",
          )}
          title="Clique para ver nota vinculada"
          onClick={(e) => {
            e.stopPropagation();
            if (linkedNoteId) {
              window.open(`/notes?noteId=${linkedNoteId}`, '_blank');
            }
          }}
        >
          <FileText className={cn(
            densityMode === "compact" && "h-2.5 w-2.5",
            densityMode === "comfortable" && "h-3 w-3",
          )} />
          Nota
        </Badge>
      )}

      {/* Custom notification badge */}
      {!hideBadges && hasCustomNotification && (
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20",
            densityMode === "compact" && "text-[10px] px-1.5 py-0",
            densityMode === "comfortable" && "text-xs px-2 py-0.5",
          )}
          title="Lembrete personalizado configurado"
        >
          <Bell className={cn(
            densityMode === "compact" && "h-2.5 w-2.5",
            densityMode === "comfortable" && "h-3 w-3",
          )} />
          Lembrete
        </Badge>
      )}

      {/* Linked course badge */}
      {!hideBadges && hasLinkedCourse && (
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20 cursor-pointer hover:bg-purple-500/20 transition-colors",
            densityMode === "compact" && "text-[10px] px-1.5 py-0",
            densityMode === "comfortable" && "text-xs px-2 py-0.5",
          )}
          title="Clique para ver curso vinculado"
          onClick={(e) => {
            e.stopPropagation();
            if (linkedCourseId) {
              navigate(`/courses`);
            }
          }}
        >
          <GraduationCap className={cn(
            densityMode === "compact" && "h-2.5 w-2.5",
            densityMode === "comfortable" && "h-3 w-3",
          )} />
          Curso
        </Badge>
      )}
    </div>
  );
};
