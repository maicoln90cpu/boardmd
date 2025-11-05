import { Task } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
}

export function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onMoveLeft, 
  onMoveRight, 
  canMoveLeft = false, 
  canMoveRight = false 
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-yellow-500 text-white",
    low: "bg-green-500 text-white",
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card
        className="p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
        onDoubleClick={() => onEdit(task)}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium flex-1">{task.title}</h3>
            <div className="flex gap-1">
              {canMoveLeft && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
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
                  className="h-6 w-6"
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
                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {task.priority && (
              <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                {task.priority}
              </Badge>
            )}

            {task.tags?.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          {task.due_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString("pt-BR")}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
