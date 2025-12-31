import React from "react";
import { Calendar } from "lucide-react";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskCardHoverContentProps {
  title: string;
  description?: string | null;
  subtasks?: Subtask[];
  dueDate?: string | null;
}

export const TaskCardHoverContent: React.FC<TaskCardHoverContentProps> = ({
  title,
  description,
  subtasks,
  dueDate,
}) => {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {subtasks && subtasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Subtarefas:</p>
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-2 text-xs">
              <span className={subtask.completed ? "line-through text-muted-foreground" : ""}>
                {subtask.completed ? "✓" : "○"} {subtask.title}
              </span>
            </div>
          ))}
        </div>
      )}
      {dueDate && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Prazo: {new Date(dueDate).toLocaleString("pt-BR")}
        </p>
      )}
    </div>
  );
};
