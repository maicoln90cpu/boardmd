import { Task } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2, ChevronLeft, ChevronRight, Clock, Star, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDueDateAlerts } from "@/hooks/useDueDateAlerts";

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
  densityMode?: "comfortable" | "compact" | "ultra-compact";
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
  onToggleFavorite,
  densityMode = "comfortable"
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const { getTaskUrgency } = useDueDateAlerts([task]);
  const urgency = getTaskUrgency(task);

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

  const isOverdue = urgency === "overdue";
  const isUrgent = urgency === "urgent";
  const isWarning = urgency === "warning";
  
  const isUltraCompact = densityMode === "ultra-compact";

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
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
            className={`${isUltraCompact ? 'p-1' : compact ? 'p-1.5' : 'p-2'} cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
              isOverdue ? 'border-2 border-destructive' : ''
            } ${isUrgent ? 'border-2 border-orange-500' : ''} ${isWarning ? 'border-l-4 border-l-yellow-500' : ''}`}
            onDoubleClick={() => onEdit(task)}
          >
            {isUltraCompact ? (
              // Layout ultra-compacto: tudo em 1 linha
              <div className="flex items-center gap-1 text-[10px]">
                {onToggleFavorite && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-4 w-4 p-0 shrink-0 ${task.is_favorite ? 'text-yellow-500' : 'text-muted-foreground'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(task.id);
                    }}
                  >
                    <Star className={`h-3 w-3 ${task.is_favorite ? 'fill-yellow-500' : ''}`} />
                  </Button>
                )}
                <span className="font-medium truncate flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
                  {task.title}
                </span>
                {showCategoryBadge && task.categories?.name && (
                  <Badge variant="outline" className="text-[9px] px-0.5 py-0 shrink-0">
                    {task.categories.name}
                  </Badge>
                )}
                {task.priority && (
                  <Badge className={`text-[9px] px-0.5 py-0 shrink-0 ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                    {task.priority[0].toUpperCase()}
                  </Badge>
                )}
                {task.due_date && (
                  <span className={`text-[9px] shrink-0 ${isOverdue ? 'text-destructive' : isUrgent ? 'text-orange-600' : 'text-muted-foreground'}`}>
                    {new Date(task.due_date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' })}
                  </span>
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
            ) : (
              // Layout normal
              <div className={compact ? "space-y-1" : "space-y-1.5"}>
                <div className="flex items-start justify-between gap-1.5">
                  <h3 className={`font-medium flex-1 ${compact ? 'text-xs' : 'text-sm'}`}>{task.title}</h3>
                  <div className="flex gap-0.5 sm:gap-1">
                    {onToggleFavorite && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-8 w-8 sm:h-6 sm:w-6 ${task.is_favorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-yellow-500'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(task.id);
                        }}
                        title={task.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Star className={`h-4 w-4 sm:h-3 sm:w-3 ${task.is_favorite ? 'fill-yellow-500' : ''}`} />
                      </Button>
                    )}
                    {canMoveLeft && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 sm:h-6 sm:w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveLeft?.();
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 sm:h-3 sm:w-3" />
                      </Button>
                    )}
                    {canMoveRight && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 sm:h-6 sm:w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveRight?.();
                        }}
                      >
                        <ChevronRight className="h-4 w-4 sm:h-3 sm:w-3" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 sm:h-6 sm:w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 sm:h-3 sm:w-3" />
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
                    isOverdue ? 'bg-destructive/10 text-destructive' : 
                    isUrgent ? 'bg-orange-500/10 text-orange-600' :
                    isWarning ? 'bg-yellow-500/10 text-yellow-600' : 'bg-muted'
                  }`}>
                    {isOverdue || isUrgent ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3 text-primary" />
                    )}
                    <span className="text-xs font-medium">
                      {new Date(task.due_date).toLocaleDateString("pt-BR")}
                      {isOverdue && ' - Atrasada!'}
                      {isUrgent && ' - Urgente!'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </HoverCardTrigger>
      <HoverCardContent side="right" className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-muted-foreground">{task.description}</p>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Subtarefas:</p>
              {task.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 text-xs">
                  <span className={subtask.completed ? 'line-through text-muted-foreground' : ''}>
                    {subtask.completed ? '✓' : '○'} {subtask.title}
                  </span>
                </div>
              ))}
            </div>
          )}
          {task.due_date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Prazo: {new Date(task.due_date).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}