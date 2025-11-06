import { Task } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2, ChevronLeft, ChevronRight, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskCardProps {
  task: Task & { categories?: { name: string } };
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  compact?: boolean;
  isDailyKanban?: boolean;
  showCategoryBadge?: boolean;
  onToggleFavorite?: (taskId: string) => void;
}

export function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onMoveLeft, 
  onMoveRight, 
  canMoveLeft = false, 
  canMoveRight = false,
  compact = false,
  isDailyKanban = false,
  showCategoryBadge = false,
  onToggleFavorite
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

  // Verificar se tarefa está atrasada
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDailyKanban;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
    >
      <Card
        className={`${compact ? 'p-1.5' : 'p-2'} cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
          isOverdue ? 'border-2 border-destructive' : ''
        }`}
        onDoubleClick={() => onEdit(task)}
      >
        <div className={compact ? "space-y-1" : "space-y-1.5"}>
          <div className="flex items-start justify-between gap-1.5">
            <h3 className={`font-medium flex-1 ${compact ? 'text-xs' : 'text-sm'}`}>{task.title}</h3>
            <div className="flex gap-0.5">
              {onToggleFavorite && (
                <Button
                  size="icon"
                  variant="ghost"
                  className={`h-5 w-5 ${task.is_favorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-yellow-500'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(task.id);
                  }}
                  title={task.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  <Star className={`h-3 w-3 ${task.is_favorite ? 'fill-yellow-500' : ''}`} />
                </Button>
              )}
              {canMoveLeft && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveLeft?.();
                  }}
                >
                  <ChevronLeft className="h-2.5 w-2.5" />
                </Button>
              )}
              {canMoveRight && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveRight?.();
                  }}
                >
                  <ChevronRight className="h-2.5 w-2.5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>

          {task.description && (
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground line-clamp-2`}>
              {task.description}
            </p>
          )}

          <div className={`flex flex-wrap ${compact ? 'gap-0.5' : 'gap-1'}`}>
            {showCategoryBadge && task.categories?.name && (
              <Badge variant="secondary" className={compact ? 'text-[10px] px-1 py-0' : 'text-xs px-1.5 py-0'}>
                📁 {task.categories.name}
              </Badge>
            )}

            {task.priority && (
              <Badge className={`${compact ? 'text-[10px] px-1 py-0' : 'text-xs px-1.5 py-0'} ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                {task.priority}
              </Badge>
            )}

            {task.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className={compact ? 'text-[10px] px-1 py-0' : 'text-xs px-1.5 py-0'}>
                {tag}
              </Badge>
            ))}
          </div>

          {task.due_date && isDailyKanban && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded-md">
              <Clock className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium">
                {new Date(task.due_date).toLocaleTimeString("pt-BR", {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
          
          {task.due_date && !isDailyKanban && (
            <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md ${
              isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-muted'
            }`}>
              <Calendar className={`h-3 w-3 ${isOverdue ? 'text-destructive' : 'text-primary'}`} />
              <span className="text-xs font-medium">
                {new Date(task.due_date).toLocaleDateString("pt-BR")}
                {isOverdue && ' - Atrasada!'}
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
