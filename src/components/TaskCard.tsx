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

interface TaskCardProps {
  task: Task & { categories?: { name: string }; originalCategory?: string };
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
  densityMode = "comfortable",
  hideBadges = false,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const urgency = getTaskUrgency(task);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Cores de prioridade (podem ser customizadas via settings)
  const priorityColors = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-yellow-500 text-white",
    low: "bg-green-500 text-white",
  };

  // Cores de fundo suave baseadas na prioridade (podem ser customizadas via settings)
  const priorityBackgroundColors = {
    high: "bg-red-500/10 dark:bg-red-500/15",
    medium: "bg-yellow-500/10 dark:bg-yellow-500/15",
    low: "bg-green-500/10 dark:bg-green-500/15",
  };

  const isOverdue = urgency === "overdue";
  const isUrgent = urgency === "urgent";
  const isWarning = urgency === "warning";

  const isUltraCompact = densityMode === "ultra-compact";
  const { toast } = useToast();
  const { share } = useWebShare();

  // Estado local otimista para animação instantânea
  const [isLocalCompleted, setIsLocalCompleted] = React.useState(task.is_completed);
  
  // BUG 2 FIX: Estado para categoria original de tarefas espelhadas
  const [originalCategoryName, setOriginalCategoryName] = React.useState<string | null>(null);

  // Sincronizar estado local quando task.is_completed mudar (por realtime ou fetch)
  React.useEffect(() => {
    setIsLocalCompleted(task.is_completed);
  }, [task.is_completed]);
  
  // BUG 2 FIX: Buscar categoria da tarefa original para tarefas espelhadas
  React.useEffect(() => {
    if (task.mirror_task_id && isDailyKanban) {
      supabase
        .from("tasks")
        .select("category_id, categories:categories(name)")
        .eq("id", task.mirror_task_id)
        .single()
        .then(({ data }) => {
          if (data?.categories) {
            setOriginalCategoryName((data.categories as any).name);
          }
        });
    }
  }, [task.mirror_task_id, isDailyKanban]);

  const handleToggleCompleted = async (checked: boolean) => {
    // Update otimista imediato
    setIsLocalCompleted(checked);

    try {
      const { error } = await supabase.from("tasks").update({ is_completed: checked }).eq("id", task.id);

      if (error) throw error;

      // SINCRONIZAÇÃO BIDIRECIONAL COMPLETA:
      // 1. Se esta tarefa tem um mirror_task_id, atualizar o espelho
      if (task.mirror_task_id) {
        await supabase.from("tasks").update({ is_completed: checked }).eq("id", task.mirror_task_id);
      }

      // 2. Buscar tarefas que apontam para ESTA tarefa como espelho (link reverso)
      const { data: reverseMirrors } = await supabase.from("tasks").select("id").eq("mirror_task_id", task.id);

      if (reverseMirrors && reverseMirrors.length > 0) {
        await supabase
          .from("tasks")
          .update({ is_completed: checked })
          .in(
            "id",
            reverseMirrors.map((t) => t.id),
          );
      }

      // Disparar evento para atualizar lista de tasks
      window.dispatchEvent(new CustomEvent("task-updated", { detail: { taskId: task.id } }));
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
    const newRecurrence = recurrenceEnabled ? { frequency: recurrenceFrequency, interval: recurrenceInterval } : null;

    const { error } = await supabase.from("tasks").update({ recurrence_rule: newRecurrence }).eq("id", task.id);

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
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
        >
          <Card
            className={cn(
              isUltraCompact ? "p-1" : compact ? "p-2" : "p-2",
              "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
              isOverdue && "border-2 border-destructive",
              isUrgent && "border-2 border-orange-500",
              isWarning && "border-l-4 border-l-yellow-500",
              task.priority && priorityBackgroundColors[task.priority as keyof typeof priorityBackgroundColors],
            )}
            onDoubleClick={() => onEdit(task)}
          >
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
                    "font-medium truncate flex-1 min-w-0 cursor-pointer",
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
                  <Badge
                    className={`text-[9px] px-0.5 py-0 shrink-0 ${priorityColors[task.priority as keyof typeof priorityColors]}`}
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
              <div className="space-y-1">
                {/* Linha 1: Checkbox + Título */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <Checkbox
                    checked={isLocalCompleted}
                    onCheckedChange={(checked) => handleToggleCompleted(!!checked)}
                    className={cn("flex-shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <h3
                    className={cn(
                      "font-medium truncate flex-1",
                      compact ? "text-xs" : "text-sm",
                      isLocalCompleted && "line-through opacity-50",
                    )}
                  >
                    {task.title}
                  </h3>
                </div>

                {/* Linha 2: Data, Horário, Prioridade */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* BUG 4 FIX: Mostrar data + horário no diário */}
                  {task.due_date && isDailyKanban && (
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-muted rounded text-[10px]">
                      <Calendar className="h-2.5 w-2.5" />
                      {formatDateShortBR(task.due_date)}
                      <Clock className="h-2.5 w-2.5 ml-1" />
                      {formatTimeOnlyBR(task.due_date)}
                    </div>
                  )}

                  {task.due_date && !isDailyKanban && (
                    <div
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                        isOverdue
                          ? "bg-destructive/10 text-destructive"
                          : isUrgent
                            ? "bg-orange-500/10 text-orange-600"
                            : isWarning
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-muted"
                      }`}
                    >
                      {isOverdue || isUrgent ? (
                        <AlertCircle className="h-2.5 w-2.5" />
                      ) : (
                        <Calendar className="h-2.5 w-2.5" />
                      )}
                      {formatDateShortBR(task.due_date)}
                      <Clock className="h-2.5 w-2.5 ml-1" />
                      {formatTimeOnlyBR(task.due_date)}
                    </div>
                  )}

                  {/* BUG 3 FIX: Usar valores em inglês (high/medium/low) */}
                  {!hideBadges && task.priority && (
                    <Badge
                      className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority as keyof typeof priorityColors]}`}
                    >
                      {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                    </Badge>
                  )}

                  {task.subtasks && task.subtasks.length > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      ✓ {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                    </Badge>
                  )}
                </div>

                {/* Linha 3: Ícones de ação */}
                <div className="flex items-center gap-0.5">
                  {onToggleFavorite && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-5 w-5 ${task.is_favorite ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground hover:text-yellow-500"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(task.id);
                      }}
                      title={task.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Star className={`h-3 w-3 ${task.is_favorite ? "fill-yellow-500" : ""}`} />
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
                      <ChevronLeft className="h-3 w-3" />
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
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5"
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
                    className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Linha 4: Badges categoria e espelhada (para recorrentes e tarefas espelhadas) */}
                {/* Linha 4: Badges categoria e espelhada (para recorrentes e tarefas espelhadas) */}
                {(!hideBadges && (task.recurrence_rule || task.mirror_task_id || showCategoryBadge || (task.tags && task.tags.length > 0))) && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* BUG 2 FIX: Mostrar categoria ORIGINAL para tarefas espelhadas no diário */}
                    {isDailyKanban && task.mirror_task_id && originalCategoryName && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {originalCategoryName}
                      </Badge>
                    )}
                    
                    {/* Mostrar categoria normal para tarefas recorrentes (não espelhadas) */}
                    {(task.recurrence_rule || showCategoryBadge) && !task.mirror_task_id && task.categories?.name && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {task.categories.name}
                      </Badge>
                    )}

                    {task.mirror_task_id && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        🪞 Espelhada
                      </Badge>
                    )}

                    {task.tags?.filter(tag => tag !== "espelho-diário").slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                        {tag}
                      </Badge>
                    ))}

                    {task.tags && task.tags.filter(tag => tag !== "espelho-diário").length > 2 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        +{task.tags.filter(tag => tag !== "espelho-diário").length - 2}
                      </Badge>
                    )}
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
}
