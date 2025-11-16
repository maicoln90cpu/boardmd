import { Task } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2, ChevronLeft, ChevronRight, Clock, Star, AlertCircle, Repeat, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import React from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDueDateAlerts } from "@/hooks/useDueDateAlerts";
import { cn } from "@/lib/utils";

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
  onDuplicate?: (taskId: string) => void;
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
  onDuplicate,
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
  const { toast } = useToast();

  // Estado do checkbox para tarefas recorrentes
  const [isCompleted, setIsCompleted] = useLocalStorage(`task-completed-${task.id}`, false);

  const [recurrenceEnabled, setRecurrenceEnabled] = React.useState(!!task.recurrence_rule);
  const [recurrenceFrequency, setRecurrenceFrequency] = React.useState<"daily" | "weekly" | "monthly">(
    task.recurrence_rule?.frequency || "daily"
  );
  const [recurrenceInterval, setRecurrenceInterval] = React.useState(
    task.recurrence_rule?.interval || 1
  );

  const handleRecurrenceUpdate = async () => {
    const newRecurrence = recurrenceEnabled
      ? { frequency: recurrenceFrequency, interval: recurrenceInterval }
      : null;

    const { error } = await supabase
      .from("tasks")
      .update({ recurrence_rule: newRecurrence })
      .eq("id", task.id);

    if (error) {
      toast({
        title: "Erro ao atualizar recorrência",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: recurrenceEnabled ? "Recorrência ativada" : "Recorrência desativada",
        description: recurrenceEnabled
          ? "A tarefa agora é recorrente e ficará na coluna Recorrente"
          : "A tarefa não é mais recorrente",
      });
      window.location.reload();
    }
  };

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
                {task.recurrence_rule && (
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={(checked) => setIsCompleted(!!checked)}
                    className="h-3 w-3 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
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
                <span 
                  className={cn(
                    "font-medium truncate flex-1 min-w-0 cursor-pointer",
                    isCompleted && "line-through opacity-50"
                  )}
                  onClick={() => onEdit(task)}
                >
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Repeat className={`h-3 w-3 ${task.recurrence_rule ? "text-purple-500" : ""}`} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="rec-toggle" className="text-xs">Recorrente</Label>
                          <Switch
                            id="rec-toggle"
                            checked={recurrenceEnabled}
                            onCheckedChange={setRecurrenceEnabled}
                          />
                        </div>
                        {recurrenceEnabled && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">Frequência</Label>
                              <Select value={recurrenceFrequency} onValueChange={(v: any) => setRecurrenceFrequency(v)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Diária</SelectItem>
                                  <SelectItem value="weekly">Semanal</SelectItem>
                                  <SelectItem value="monthly">Mensal</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Intervalo</Label>
                              <Input
                                type="number"
                                min="1"
                                className="h-8 text-xs"
                                value={recurrenceInterval}
                                onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                              />
                            </div>
                          </>
                        )}
                        <Button onClick={handleRecurrenceUpdate} size="sm" className="w-full h-8 text-xs">
                          Salvar
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
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
            ) : (
              // Layout normal - mais compacto e inline
              <div className={compact ? "space-y-0.5" : "space-y-1"}>
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2 flex-1">
                    {task.recurrence_rule && (
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={(checked) => setIsCompleted(!!checked)}
                        className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <h3 
                      className={cn(
                        "font-medium flex-1",
                        compact ? "text-xs" : "text-sm",
                        isCompleted && "line-through opacity-50"
                      )}
                    >
                      {task.title}
                    </h3>
                  </div>
                  <div className="flex gap-0.5">
                    {onToggleFavorite && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-6 w-6 ${task.is_favorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-yellow-500'}`}
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Repeat className={`h-3 w-3 ${task.recurrence_rule ? "text-purple-500" : ""}`} />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="recurrence-toggle-compact">Tarefa Recorrente</Label>
                            <Switch
                              id="recurrence-toggle-compact"
                              checked={recurrenceEnabled}
                              onCheckedChange={setRecurrenceEnabled}
                            />
                          </div>
                          {recurrenceEnabled && (
                            <>
                              <div className="space-y-2">
                                <Label>Frequência</Label>
                                <Select
                                  value={recurrenceFrequency}
                                  onValueChange={(value: "daily" | "weekly" | "monthly") =>
                                    setRecurrenceFrequency(value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="daily">Diária</SelectItem>
                                    <SelectItem value="weekly">Semanal</SelectItem>
                                    <SelectItem value="monthly">Mensal</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Intervalo</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={recurrenceInterval}
                                  onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                                />
                              </div>
                            </>
                          )}
                          <Button onClick={handleRecurrenceUpdate} className="w-full">
                            Salvar Recorrência
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
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
                  <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground line-clamp-1`}>
                    {task.description}
                  </p>
                )}

                {/* Linha única com todos os badges e data */}
                <div className={`flex items-center flex-wrap ${compact ? 'gap-1' : 'gap-1.5'}`}>
                  {showCategoryBadge && task.categories?.name && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      {task.categories.name}
                    </Badge>
                  )}

                  {task.mirror_task_id && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 gap-0.5">
                      🪞 Espelhada
                    </Badge>
                  )}

                  {task.priority && (
                    <Badge className={`text-[10px] px-1 py-0 ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                      {task.priority[0].toUpperCase()}
                    </Badge>
                  )}

                  {task.tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                      {tag}
                    </Badge>
                  ))}
                  
                  {task.tags && task.tags.length > 2 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      +{task.tags.length - 2}
                    </Badge>
                  )}

                  {task.due_date && isDailyKanban && (
                    <div className="flex items-center gap-0.5 px-1 py-0 bg-muted rounded text-[10px]">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(task.due_date).toLocaleTimeString("pt-BR", {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                  
                  {task.due_date && !isDailyKanban && (
                    <div className={`flex items-center gap-0.5 px-1 py-0 rounded text-[10px] ${
                      isOverdue ? 'bg-destructive/10 text-destructive' : 
                      isUrgent ? 'bg-orange-500/10 text-orange-600' :
                      isWarning ? 'bg-yellow-500/10 text-yellow-600' : 'bg-muted'
                    }`}>
                      {isOverdue || isUrgent ? (
                        <AlertCircle className="h-2.5 w-2.5" />
                      ) : (
                        <Calendar className="h-2.5 w-2.5" />
                      )}
                      {new Date(task.due_date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                  
                  {task.subtasks && task.subtasks.length > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      ✓ {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                    </Badge>
                  )}
                </div>
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