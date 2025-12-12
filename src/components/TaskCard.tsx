import { Task } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
  AlertCircle,
  Repeat,
  Copy,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebShare } from "@/hooks/useWebShare";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getTaskUrgency } from "@/hooks/useDueDateAlerts";
import { cn } from "@/lib/utils";
import { formatDateShortBR, formatTimeOnlyBR, formatDateOnlyBR } from "@/lib/dateUtils";
interface PriorityColors {
  high: { background: string; text: string };
  medium: { background: string; text: string };
  low: { background: string; text: string };
}

interface TaskCardProps {
  task: Task & {
    categories?: {
      name: string;
    };
    originalCategory?: string;
  };
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
  hideBadges?: boolean;
  priorityColors?: PriorityColors;
}
// Default priority colors
const defaultPriorityColors: PriorityColors = {
  high: { background: "#fee2e2", text: "#dc2626" },
  medium: { background: "#fef3c7", text: "#d97706" },
  low: { background: "#dcfce7", text: "#16a34a" },
};

// Tag colors for visual bars - vibrant colors matching reference design
const TAG_COLORS: Record<string, string> = {
  default: "bg-slate-400",
  trabalho: "bg-blue-500",
  pessoal: "bg-green-500",
  urgente: "bg-red-500",
  projeto: "bg-purple-500",
  estudo: "bg-amber-500",
  saúde: "bg-emerald-500",
  financeiro: "bg-cyan-500",
  casa: "bg-orange-500",
  lazer: "bg-pink-500",
};

const getTagColor = (tag: string): string => {
  const normalizedTag = tag.toLowerCase().trim();
  return TAG_COLORS[normalizedTag] || TAG_COLORS.default;
};

// Função de comparação customizada para React.memo
// Compara apenas props que afetam a renderização visual
const arePropsEqual = (prevProps: TaskCardProps, nextProps: TaskCardProps): boolean => {
  // Comparar task (principal fonte de mudanças)
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;

  if (prevTask.id !== nextTask.id) return false;
  if (prevTask.title !== nextTask.title) return false;
  if (prevTask.description !== nextTask.description) return false;
  if (prevTask.is_completed !== nextTask.is_completed) return false;
  if (prevTask.is_favorite !== nextTask.is_favorite) return false;
  if (prevTask.priority !== nextTask.priority) return false;
  if (prevTask.due_date !== nextTask.due_date) return false;
  if (prevTask.column_id !== nextTask.column_id) return false;
  if (prevTask.mirror_task_id !== nextTask.mirror_task_id) return false;
  if (prevTask.originalCategory !== nextTask.originalCategory) return false;
  if (prevTask.categories?.name !== nextTask.categories?.name) return false;

  // Comparar subtasks (array)
  const prevSubtasks = prevTask.subtasks || [];
  const nextSubtasks = nextTask.subtasks || [];
  if (prevSubtasks.length !== nextSubtasks.length) return false;
  for (let i = 0; i < prevSubtasks.length; i++) {
    if (prevSubtasks[i].completed !== nextSubtasks[i].completed) return false;
  }

  // Comparar tags (array)
  const prevTags = prevTask.tags || [];
  const nextTags = nextTask.tags || [];
  if (prevTags.length !== nextTags.length) return false;
  if (prevTags.join(",") !== nextTags.join(",")) return false;

  // Comparar recurrence_rule (objeto)
  if (JSON.stringify(prevTask.recurrence_rule) !== JSON.stringify(nextTask.recurrence_rule)) return false;

  // Comparar outras props
  if (prevProps.compact !== nextProps.compact) return false;
  if (prevProps.isDailyKanban !== nextProps.isDailyKanban) return false;
  if (prevProps.showCategoryBadge !== nextProps.showCategoryBadge) return false;
  if (prevProps.densityMode !== nextProps.densityMode) return false;
  if (prevProps.hideBadges !== nextProps.hideBadges) return false;
  if (prevProps.canMoveLeft !== nextProps.canMoveLeft) return false;
  if (prevProps.canMoveRight !== nextProps.canMoveRight) return false;

  // Comparar priorityColors (objeto opcional)
  if (JSON.stringify(prevProps.priorityColors) !== JSON.stringify(nextProps.priorityColors)) return false;

  return true;
};

const TaskCardComponent: React.FC<TaskCardProps> = ({
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
  densityMode = "comfortable",
  hideBadges = false,
  priorityColors = defaultPriorityColors,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const urgency = getTaskUrgency(task);
  // Premium drag & drop styles
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    ...(isDragging && {
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      transform: `${CSS.Transform.toString(transform)} rotate(3deg) scale(1.02)`,
      zIndex: 100,
    }),
  };

  // Compute priority classes from custom colors
  const getPriorityBadgeStyle = (priority: string) => {
    const colors = priorityColors[priority as keyof PriorityColors] || defaultPriorityColors.low;
    return {
      backgroundColor: colors.text,
      color: "#ffffff",
    };
  };

  // Get tags for colored bars at top of card
  const visibleTags = (task.tags || []).filter(tag => tag !== "espelho-diário").slice(0, 4);
  const isOverdue = urgency === "overdue";
  const isUrgent = urgency === "urgent";
  const isWarning = urgency === "warning";
  const isUltraCompact = densityMode === "ultra-compact";
  const { toast } = useToast();
  const { share } = useWebShare();

  // Estado local otimista para animação instantânea
  const [isLocalCompleted, setIsLocalCompleted] = React.useState(task.is_completed);

  // Usar categoria original da prop (batch fetch) ou fallback para estado local
  const [originalCategoryName, setOriginalCategoryName] = React.useState<string | null>(null);

  // Sincronizar estado local quando task.is_completed mudar (por realtime ou fetch)
  React.useEffect(() => {
    setIsLocalCompleted(task.is_completed);
  }, [task.is_completed]);

  // Usar originalCategory da prop se disponível (batch fetch do KanbanBoard)
  React.useEffect(() => {
    // Se já tem originalCategory da prop, usar diretamente
    if (task.originalCategory) {
      setOriginalCategoryName(task.originalCategory);
    }
  }, [task.originalCategory]);
  const handleToggleCompleted = async (checked: boolean) => {
    // Update otimista imediato
    setIsLocalCompleted(checked);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          is_completed: checked,
        })
        .eq("id", task.id);
      if (error) throw error;

      // SINCRONIZAÇÃO BIDIRECIONAL COMPLETA:
      // 1. Se esta tarefa tem um mirror_task_id, atualizar o espelho
      if (task.mirror_task_id) {
        await supabase
          .from("tasks")
          .update({
            is_completed: checked,
          })
          .eq("id", task.mirror_task_id);
      }

      // 2. Buscar tarefas que apontam para ESTA tarefa como espelho (link reverso)
      const { data: reverseMirrors } = await supabase.from("tasks").select("id").eq("mirror_task_id", task.id);
      if (reverseMirrors && reverseMirrors.length > 0) {
        await supabase
          .from("tasks")
          .update({
            is_completed: checked,
          })
          .in(
            "id",
            reverseMirrors.map((t) => t.id),
          );
      }

      // Disparar evento para atualizar lista de tasks
      window.dispatchEvent(
        new CustomEvent("task-updated", {
          detail: {
            taskId: task.id,
          },
        }),
      );
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      // Reverter se falhar
      setIsLocalCompleted(!checked);
      toast({
        title: "Erro ao atualizar tarefa",
        description: "Não foi possível salvar a alteração. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  const [recurrenceEnabled, setRecurrenceEnabled] = React.useState(!!task.recurrence_rule);
  const [recurrenceFrequency, setRecurrenceFrequency] = React.useState<"daily" | "weekly" | "monthly">(
    task.recurrence_rule?.frequency || "daily",
  );
  const [recurrenceInterval, setRecurrenceInterval] = React.useState(task.recurrence_rule?.interval || 1);
  const handleRecurrenceUpdate = async () => {
    const newRecurrence = recurrenceEnabled
      ? {
          frequency: recurrenceFrequency,
          interval: recurrenceInterval,
        }
      : null;
    const { error } = await supabase
      .from("tasks")
      .update({
        recurrence_rule: newRecurrence,
      })
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
  const handleShare = () => {
    const shareText = [
      task.title,
      task.description ? `\n${task.description}` : "",
      task.due_date ? `\nPrazo: ${formatDateOnlyBR(task.due_date)}` : "",
      task.priority ? `\nPrioridade: ${task.priority}` : "",
      task.categories?.name ? `\nCategoria: ${task.categories.name}` : "",
    ]
      .filter(Boolean)
      .join("");
    share({
      title: "Tarefa - " + task.title,
      text: shareText,
      url: window.location.href,
    });
  };
  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <motion.div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          initial={{
            opacity: 0,
            y: 5,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            scale: 0.9,
          }}
          transition={{
            duration: 0.15,
          }}
        >
          <Card
            className={cn(
              "w-full cursor-grab active:cursor-grabbing transition-all duration-200 overflow-hidden",
              // Remove background priority, use neutral card background
              "bg-card hover:shadow-lg hover:shadow-primary/5",
              // Padding diferenciado por modo - Alterar tamanho dos cards
              isUltraCompact && "p-0",
              densityMode === "compact" && "p-0",
              densityMode === "comfortable" && "p-0",
              // Bordas de urgência
              isOverdue && "border-2 border-destructive",
              isUrgent && "border-2 border-orange-500",
              isWarning && "border-l-4 border-l-yellow-500",
              // Premium shadow on drag
              isDragging && "shadow-2xl ring-2 ring-primary/20",
            )}
            onDoubleClick={() => onEdit(task)}
          >
            {/* Colored tag bars at top of card */}
            {visibleTags.length > 0 && (
              <div className="flex w-full h-1">
                {visibleTags.map((tag, index) => (
                  <div
                    key={`${tag}-${index}`}
                    className={cn("flex-1 h-full", getTagColor(tag))}
                    title={tag}
                  />
                ))}
              </div>
            )}
            
            {/* Card content wrapper with padding */}
            <div className={cn(
              isUltraCompact && "p-1",
              densityMode === "compact" && "p-2",
              densityMode === "comfortable" && "p-3",
            )}>
            {isUltraCompact ? (
              // Layout ultra-compacto: tudo em 1 linha
              <div className="flex items-center gap-1 text-[10px]">
                <Checkbox
                  checked={isLocalCompleted}
                  onCheckedChange={(checked) => handleToggleCompleted(!!checked)}
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
                    isLocalCompleted && "line-through opacity-50",
                  )}
                  onClick={() => onEdit(task)}
                >
                  {task.title}
                </span>
                {!hideBadges && showCategoryBadge && task.categories?.name && (
                  <Badge variant="outline" className="text-[9px] px-0.5 py-0 shrink-0">
                    {task.categories.name}
                  </Badge>
                )}
                {!hideBadges && task.priority && (
                  <Badge className="text-[9px] px-0.5 py-0 shrink-0" style={getPriorityBadgeStyle(task.priority)}>
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
              // Layout 3 linhas (4 para recorrentes)
              <div
                className={cn(densityMode === "compact" && "space-y-1", densityMode === "comfortable" && "space-y-2.5")}
              >
                {/* Linha 1: Checkbox + Título */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <Checkbox
                    checked={isLocalCompleted}
                    onCheckedChange={(checked) => handleToggleCompleted(!!checked)}
                    className={cn(
                      "flex-shrink-0",
                      densityMode === "compact" && "h-3.5 w-3.5",
                      densityMode === "comfortable" && "h-5 w-5",
                    )}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <h3
                    className={cn(
                      "truncate flex-1",
                      densityMode === "compact" && "text-sm font-medium",
                      densityMode === "comfortable" && "text-base font-semibold leading-relaxed",
                      isLocalCompleted && "line-through opacity-50",
                    )}
                  >
                    {task.title}
                  </h3>
                </div>

                {/* Linha 2: Data, Horário, Prioridade */}
                <div
                  className={cn(
                    "flex items-center flex-wrap",
                    densityMode === "compact" && "gap-1.5",
                    densityMode === "comfortable" && "gap-2",
                  )}
                >
                  {/* BUG 4 FIX: Mostrar data + horário no diário */}
                  {task.due_date && isDailyKanban && (
                    <div
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded",
                        densityMode === "compact" && "text-[10px]",
                        densityMode === "comfortable" && "text-xs py-1 px-2",
                      )}
                    >
                      <Calendar
                        className={cn(
                          densityMode === "compact" && "h-2.5 w-2.5",
                          densityMode === "comfortable" && "h-3.5 w-3.5",
                        )}
                      />
                      {formatDateShortBR(task.due_date)}
                      <Clock
                        className={cn(
                          "ml-1",
                          densityMode === "compact" && "h-2.5 w-2.5",
                          densityMode === "comfortable" && "h-3.5 w-3.5",
                        )}
                      />
                      {formatTimeOnlyBR(task.due_date)}
                    </div>
                  )}

                  {task.due_date && !isDailyKanban && (
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
                      {formatDateShortBR(task.due_date)}
                      <Clock
                        className={cn(
                          "ml-1",
                          densityMode === "compact" && "h-2.5 w-2.5",
                          densityMode === "comfortable" && "h-3.5 w-3.5",
                        )}
                      />
                      {formatTimeOnlyBR(task.due_date)}
                    </div>
                  )}

                  {/* BUG 3 FIX: Usar valores em inglês (high/medium/low) */}
                  {!hideBadges && task.priority && (
                    <Badge
                      className={cn(
                        densityMode === "compact" && "text-[10px] px-2 py-0",
                        densityMode === "comfortable" && "text-xs px-2.5 py-0.5",
                      )}
                      style={getPriorityBadgeStyle(task.priority)}
                    >
                      {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                    </Badge>
                  )}

                  {task.subtasks && task.subtasks.length > 0 && (
                    <Badge
                      variant="outline"
                      className={cn(
                        densityMode === "compact" && "text-[10px] px-1 py-0",
                        densityMode === "comfortable" && "text-xs px-1.5 py-0.5",
                      )}
                    >
                      ✓ {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                    </Badge>
                  )}
                </div>

                {/* Linha 3: Ícones de ação */}
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
                        task.is_favorite
                          ? "text-yellow-500 hover:text-yellow-600"
                          : "text-muted-foreground hover:text-yellow-500",
                        densityMode === "compact" && "h-5 w-5",
                        densityMode === "comfortable" && "h-7 w-7",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(task.id);
                      }}
                      title={task.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Star
                        className={cn(
                          task.is_favorite && "fill-yellow-500",
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
                      onDuplicate?.(task.id);
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
                      onDelete(task.id);
                    }}
                  >
                    <Trash2
                      className={cn(densityMode === "compact" && "h-3 w-3", densityMode === "comfortable" && "h-4 w-4")}
                    />
                  </Button>
                </div>

                {/* Linha 4: Badges categoria e espelhada (para recorrentes e tarefas espelhadas) */}
                {!hideBadges &&
                  (task.recurrence_rule ||
                    task.mirror_task_id ||
                    showCategoryBadge ||
                    (task.tags && task.tags.length > 0)) && (
                    <div
                      className={cn(
                        "flex items-center flex-wrap",
                        densityMode === "compact" && "gap-1",
                        densityMode === "comfortable" && "gap-1.5",
                      )}
                    >
                      {/* Mostrar categoria ORIGINAL para tarefas recorrentes no diário (com espelho em projetos) */}
                      {isDailyKanban && task.recurrence_rule && originalCategoryName && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                            densityMode === "compact" && "text-[10px] px-1.5 py-0",
                            densityMode === "comfortable" && "text-xs px-2 py-0.5",
                          )}
                        >
                          📁 {originalCategoryName}
                        </Badge>
                      )}

                      {/* Mostrar categoria normal fora do diário quando showCategoryBadge */}
                      {!isDailyKanban && showCategoryBadge && task.categories?.name && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                            densityMode === "compact" && "text-[10px] px-1.5 py-0",
                            densityMode === "comfortable" && "text-xs px-2 py-0.5",
                          )}
                        >
                          {task.categories.name}
                        </Badge>
                      )}

                      {task.mirror_task_id && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "gap-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
                            densityMode === "compact" && "text-[10px] px-1.5 py-0",
                            densityMode === "comfortable" && "text-xs px-2 py-0.5",
                          )}
                        >
                          🪞 Espelhada
                        </Badge>
                      )}

                      {task.tags
                        ?.filter((tag) => tag !== "espelho-diário")
                        .slice(0, 2)
                        .map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className={cn(
                              densityMode === "compact" && "text-[10px] px-1 py-0",
                              densityMode === "comfortable" && "text-xs px-1.5 py-0.5",
                            )}
                          >
                            {tag}
                          </Badge>
                        ))}

                      {task.tags && task.tags.filter((tag) => tag !== "espelho-diário").length > 2 && (
                        <Badge
                          variant="outline"
                          className={cn(
                            densityMode === "compact" && "text-[10px] px-1 py-0",
                            densityMode === "comfortable" && "text-xs px-1.5 py-0.5",
                          )}
                        >
                          +{task.tags.filter((tag) => tag !== "espelho-diário").length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
              </div>
            )}
            </div>
          </Card>
        </motion.div>
      </HoverCardTrigger>
      <HoverCardContent side="right" className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{task.title}</h4>
          {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Subtarefas:</p>
              {task.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 text-xs">
                  <span className={subtask.completed ? "line-through text-muted-foreground" : ""}>
                    {subtask.completed ? "✓" : "○"} {subtask.title}
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
};

// Exportar componente memoizado para evitar re-renders desnecessários
export const TaskCard = React.memo(TaskCardComponent, arePropsEqual);
