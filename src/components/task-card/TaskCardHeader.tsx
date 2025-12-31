import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface TaskCardHeaderProps {
  title: string;
  isCompleted: boolean;
  onToggleCompleted: (checked: boolean) => void;
  onEdit: () => void;
  densityMode: "comfortable" | "compact" | "ultra-compact";
}

export const TaskCardHeader: React.FC<TaskCardHeaderProps> = ({
  title,
  isCompleted,
  onToggleCompleted,
  onEdit,
  densityMode,
}) => {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onToggleCompleted(!!checked)}
        className={cn(
          "flex-shrink-0",
          densityMode === "compact" && "h-3.5 w-3.5",
          densityMode === "comfortable" && "h-5 w-5",
        )}
        onClick={(e) => e.stopPropagation()}
      />
      <h3
        className={cn(
          "truncate flex-1 cursor-pointer",
          densityMode === "compact" && "text-sm font-medium",
          densityMode === "comfortable" && "text-base font-semibold leading-relaxed",
          isCompleted && "line-through opacity-50",
        )}
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        {title}
      </h3>
    </div>
  );
};
