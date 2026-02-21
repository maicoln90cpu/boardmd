import { Task } from "@/hooks/tasks/useTasks";
import { Card } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import React from "react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getTaskUrgency } from "@/hooks/useDueDateAlerts";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { logger } from "@/lib/logger";
import { calculateNextRecurrenceDate, RecurrenceRule } from "@/lib/recurrenceUtils";
import { formatDateTimeBR } from "@/lib/dateUtils";
import { useSettings } from "@/hooks/data/useSettings";
import { oneSignalNotifier } from "@/lib/notifications/oneSignalNotifier";
import { useAuth } from "@/contexts/AuthContext";

// Import subcomponents
import {
  TaskCardHeader,
  TaskCardBadges,
  TaskCardActions,
  TaskCardTags,
  TaskCardUltraCompact,
  TaskCardHoverContent,
  TaskCardCompleteDialog,
  TaskCardSkeleton,
  TaskCompletionModal,
  TaskMetricsHistoryModal,
} from "@/components/task-card";
import { useSavingTasks } from "@/contexts/SavingTasksContext";
import { AnimatePresence } from "framer-motion";
import { useTaskCompletionLogs } from "@/hooks/useTaskCompletionLogs";

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
  showCategoryBadge?: boolean;
  onToggleFavorite?: (taskId: string) => void;
  onDuplicate?: (taskId: string) => void;
  densityMode?: "comfortable" | "compact" | "ultra-compact";
  hideBadges?: boolean;
  priorityColors?: PriorityColors;
  getTagColor?: (tagName: string) => string;
  onAddPoints?: () => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onToggleSelection?: (taskId: string) => void;
  isDraggable?: boolean;
  columnName?: string;
  completedColumnId?: string;
  onMoveToCompleted?: (taskId: string, columnId: string) => void;
}

// Shallow comparison helper for objects
const shallowEqualRecurrence = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return a === b;
  
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keysA = Object.keys(aObj);
  const keysB = Object.keys(bObj);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (aObj[key] !== bObj[key]) return false;
  }
  return true;
};

// Custom comparison function for React.memo - optimized without JSON.stringify
const arePropsEqual = (prevProps: TaskCardProps, nextProps: TaskCardProps): boolean => {
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;

  // Fast path: same reference
  if (prevTask === nextTask && 
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isSelectionMode === nextProps.isSelectionMode) {
    return true;
  }

  // Compare task primitives
  if (prevTask.id !== nextTask.id) return false;
  if (prevTask.title !== nextTask.title) return false;
  if (prevTask.description !== nextTask.description) return false;
  if (prevTask.is_completed !== nextTask.is_completed) return false;
  if (prevTask.is_favorite !== nextTask.is_favorite) return false;
  if (prevTask.priority !== nextTask.priority) return false;
  if (prevTask.due_date !== nextTask.due_date) return false;
  if (prevTask.column_id !== nextTask.column_id) return false;
  if (prevTask.mirror_task_id !== nextTask.mirror_task_id) return false;
  if (prevTask.linked_note_id !== nextTask.linked_note_id) return false;
  if (prevTask.originalCategory !== nextTask.originalCategory) return false;
  if (prevTask.categories?.name !== nextTask.categories?.name) return false;
  if (prevTask.track_metrics !== nextTask.track_metrics) return false;
  if (prevTask.metric_type !== nextTask.metric_type) return false;
  if (prevTask.track_comments !== nextTask.track_comments) return false;

  // Compare subtasks efficiently
  const prevSubtasks = prevTask.subtasks || [];
  const nextSubtasks = nextTask.subtasks || [];
  if (prevSubtasks.length !== nextSubtasks.length) return false;
  for (let i = 0; i < prevSubtasks.length; i++) {
    if (prevSubtasks[i].completed !== nextSubtasks[i].completed) return false;
    if (prevSubtasks[i].id !== nextSubtasks[i].id) return false;
  }

  // Compare tags - reference check first, then length, then contents
  const prevTags = prevTask.tags;
  const nextTags = nextTask.tags;
  if (prevTags !== nextTags) {
    if (!prevTags || !nextTags) return false;
    if (prevTags.length !== nextTags.length) return false;
    for (let i = 0; i < prevTags.length; i++) {
      if (prevTags[i] !== nextTags[i]) return false;
    }
  }

  // Compare recurrence with shallow comparison instead of JSON.stringify
  if (!shallowEqualRecurrence(prevTask.recurrence_rule, nextTask.recurrence_rule)) return false;

  // Compare other props
  if (prevProps.compact !== nextProps.compact) return false;
  if (prevProps.showCategoryBadge !== nextProps.showCategoryBadge) return false;
  if (prevProps.densityMode !== nextProps.densityMode) return false;
  if (prevProps.hideBadges !== nextProps.hideBadges) return false;
  if (prevProps.canMoveLeft !== nextProps.canMoveLeft) return false;
  if (prevProps.canMoveRight !== nextProps.canMoveRight) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.isSelectionMode !== nextProps.isSelectionMode) return false;
  if (prevProps.isDraggable !== nextProps.isDraggable) return false;
  if (prevProps.columnName !== nextProps.columnName) return false;
  if (prevProps.completedColumnId !== nextProps.completedColumnId) return false;

  // Compare priorityColors with shallow comparison instead of JSON.stringify
  if (prevProps.priorityColors !== nextProps.priorityColors) {
    if (!prevProps.priorityColors || !nextProps.priorityColors) return false;
    const pColors = prevProps.priorityColors;
    const nColors = nextProps.priorityColors;
    if (pColors.high.background !== nColors.high.background ||
        pColors.high.text !== nColors.high.text ||
        pColors.medium.background !== nColors.medium.background ||
        pColors.medium.text !== nColors.medium.text ||
        pColors.low.background !== nColors.low.background ||
        pColors.low.text !== nColors.low.text) {
      return false;
    }
  }

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
  showCategoryBadge = false,
  onToggleFavorite,
  onDuplicate,
  densityMode = "comfortable",
  hideBadges = false,
  getTagColor = () => "#6B7280",
  onAddPoints,
  isSelected = false,
  isSelectionMode = false,
  onToggleSelection,
  isDraggable = true,
  columnName,
  completedColumnId,
  onMoveToCompleted,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !isDraggable,
  });
  
  const urgency = getTaskUrgency(task);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cardRef = React.useRef<HTMLDivElement>(null);
  const { isTaskSaving } = useSavingTasks();
  const isSaving = isTaskSaving(task.id);
  const { settings } = useSettings();

  // Drag & drop styles
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

  // Get tags for colored bars
  const visibleTags = (task.tags || []).filter(tag => tag !== "espelho-diário").slice(0, 4);
  const isOverdue = urgency === "overdue";
  const isUrgent = urgency === "urgent";
  const isWarning = urgency === "warning";
  const isUltraCompact = densityMode === "ultra-compact";

  // Optimistic local state
  const [isLocalCompleted, setIsLocalCompleted] = React.useState(task.is_completed);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = React.useState(false);
  const [pendingComplete, setPendingComplete] = React.useState(false);
  const [originalCategoryName, setOriginalCategoryName] = React.useState<string | null>(null);
  const [completionModalOpen, setCompletionModalOpen] = React.useState(false);
  const [metricsHistoryOpen, setMetricsHistoryOpen] = React.useState(false);
  const { addLog } = useTaskCompletionLogs();

  // Sync local state when task changes
  React.useEffect(() => {
    setIsLocalCompleted(task.is_completed);
  }, [task.is_completed]);

  React.useEffect(() => {
    if (task.originalCategory) {
      setOriginalCategoryName(task.originalCategory);
    }
  }, [task.originalCategory]);

  // Confetti trigger
  const triggerConfetti = React.useCallback(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { x, y },
      colors: ['#22c55e', '#16a34a', '#4ade80', '#86efac'],
      ticks: 200,
      gravity: 1.2,
      scalar: 0.8,
      shapes: ['circle', 'square'],
    });
  }, []);

  // Execute toggle completed
  const executeToggleCompleted = async (checked: boolean, moveToCompleted: boolean = false) => {
    const isRecurrent = !!task.recurrence_rule;
    
    // Se está marcando como concluída E é recorrente E reset imediato está habilitado
    if (checked && isRecurrent && settings.kanban.immediateRecurrentReset) {
      setIsLocalCompleted(false); // Tarefa vai "reaparecer" desmarcada
      triggerConfetti();
      
      try {
        // Calcular próxima data
        const nextDueDate = calculateNextRecurrenceDate(
          task.due_date, 
          task.recurrence_rule as RecurrenceRule
        );
        
        // Atualizar tarefa com nova data e is_completed = false
        const { error } = await supabase
          .from("tasks")
          .update({ 
            is_completed: false,
            due_date: nextDueDate 
          })
          .eq("id", task.id);
          
        if (error) throw error;
        
      if (onAddPoints) {
          onAddPoints();
        }

        // Push notification via OneSignal para task_completed (recorrente)
        if (user) {
          oneSignalNotifier.send({
            user_id: user.id,
            title: '✅ Tarefa Concluída!',
            body: `"${task.title}" foi concluída`,
            notification_type: 'task_completed',
            url: '/',
          });
        }
        
        toast({
          title: "✓ Tarefa concluída e resetada",
          description: `Próxima: ${formatDateTimeBR(new Date(nextDueDate))}`,
        });
        
        // Sync mirrored tasks
        if (task.mirror_task_id) {
          await supabase
            .from("tasks")
            .update({ is_completed: false, due_date: nextDueDate })
            .eq("id", task.mirror_task_id);
        }
        
        window.dispatchEvent(
          new CustomEvent("task-updated", { detail: { taskId: task.id } })
        );
        return;
      } catch (error) {
        logger.error("Erro ao resetar tarefa recorrente:", error);
        toast({
          title: "Erro ao resetar tarefa",
          description: "Não foi possível calcular a próxima data.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Comportamento padrão
    setIsLocalCompleted(checked);
    
    if (checked) {
      triggerConfetti();
    }
    
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: checked })
        .eq("id", task.id);
      if (error) throw error;

      if (checked && onAddPoints) {
        onAddPoints();
      }

      // Push notification via OneSignal para task_completed
      if (checked && user) {
        oneSignalNotifier.send({
          user_id: user.id,
          title: '✅ Tarefa Concluída!',
          body: `"${task.title}" foi concluída`,
          notification_type: 'task_completed',
          url: '/',
        });
      }

      // Bidirectional sync for mirrored tasks
      if (task.mirror_task_id) {
        await supabase
          .from("tasks")
          .update({ is_completed: checked })
          .eq("id", task.mirror_task_id);
      }

      const { data: reverseMirrors } = await supabase.from("tasks").select("id").eq("mirror_task_id", task.id);
      if (reverseMirrors && reverseMirrors.length > 0) {
        await supabase
          .from("tasks")
          .update({ is_completed: checked })
          .in("id", reverseMirrors.map((t) => t.id));
      }

      if (moveToCompleted && completedColumnId && onMoveToCompleted) {
        onMoveToCompleted(task.id, completedColumnId);
      }

      window.dispatchEvent(
        new CustomEvent("task-updated", { detail: { taskId: task.id } })
      );
    } catch (error) {
      logger.error("Erro ao atualizar tarefa:", error);
      setIsLocalCompleted(!checked);
      toast({
        title: "Erro ao atualizar tarefa",
        description: "Não foi possível salvar a alteração. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Flag to track if immediate reset was already executed
  const [alreadyReset, setAlreadyReset] = React.useState(false);

  const handleToggleCompleted = async (checked: boolean) => {
    const isRecurrent = !!task.recurrence_rule;
    const isRecurrentColumn = columnName?.toLowerCase() === "recorrente";
    const shouldTrackMetrics = task.track_metrics || task.track_comments;
    const shouldImmediateReset = checked && isRecurrent && settings.kanban.immediateRecurrentReset;
    
    // CORREÇÃO: Se é recorrente COM reset imediato, fazer reset PRIMEIRO
    if (shouldImmediateReset) {
      // Execute immediate reset first
      await executeToggleCompleted(true);
      setAlreadyReset(true);
      
      // Then open metrics modal if needed (without marking complete again)
      if (shouldTrackMetrics) {
        setCompletionModalOpen(true);
      }
      return;
    }
    
    // Normal flow: metrics modal first
    if (checked && shouldTrackMetrics) {
      setPendingComplete(true);
      setCompletionModalOpen(true);
      return;
    }
    
    // Ask about moving to completed column
    if (checked && !isRecurrentColumn && completedColumnId && onMoveToCompleted) {
      setPendingComplete(true);
      setConfirmCompleteOpen(true);
    } else {
      await executeToggleCompleted(checked);
    }
  };

  const handleCompletionConfirm = async (metricValue: number | null, comment: string | null) => {
    setCompletionModalOpen(false);
    
    // Salvar log de conclusão
    await addLog(task.id, metricValue, task.metric_type, comment);
    
    // Se já foi resetada (reset imediato), não fazer mais nada
    if (alreadyReset) {
      setAlreadyReset(false);
      setPendingComplete(false);
      return;
    }
    
    // Verificar se deve mover para coluna de concluídos
    const isRecurrentColumn = columnName?.toLowerCase() === "recorrente";
    if (!isRecurrentColumn && completedColumnId && onMoveToCompleted) {
      setConfirmCompleteOpen(true);
    } else {
      await executeToggleCompleted(true);
      setPendingComplete(false);
    }
  };

  const handleCompletionCancel = () => {
    setCompletionModalOpen(false);
    setPendingComplete(false);
    setAlreadyReset(false);
  };

  const handleConfirmComplete = async (moveToCompleted: boolean) => {
    setConfirmCompleteOpen(false);
    await executeToggleCompleted(true, moveToCompleted);
    setPendingComplete(false);
  };

  const handleCancelComplete = () => {
    setConfirmCompleteOpen(false);
    setPendingComplete(false);
  };

  const handleNavigatePomodoro = () => {
    navigate(`/pomodoro?task=${task.id}&title=${encodeURIComponent(task.title)}`);
  };

  return (
    <>
      <div ref={cardRef}>
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
              whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
              transition={{ duration: 0.15 }}
            >
              <Card
                className={cn(
                  "w-full cursor-grab active:cursor-grabbing transition-all duration-200 overflow-hidden relative",
                  "bg-card hover:shadow-xl hover:shadow-primary/10 hover:border-primary/20",
                  isUltraCompact && "p-0",
                  densityMode === "compact" && "p-0",
                  densityMode === "comfortable" && "p-0",
                  isOverdue && "border-2 border-destructive",
                  isUrgent && "border-2 border-orange-500",
                  isWarning && "border-l-4 border-l-yellow-500",
                  isDragging && "shadow-2xl ring-2 ring-primary/20",
                  isSelected && "ring-2 ring-primary bg-primary/5",
                  isSelectionMode && !isSelected && "opacity-80",
                )}
                onDoubleClick={() => !isSelectionMode && onEdit(task)}
                onClick={() => {
                  if (isSelectionMode && onToggleSelection) {
                    onToggleSelection(task.id);
                  }
                }}
              >
                {/* Skeleton overlay while saving */}
                <AnimatePresence>
                  <TaskCardSkeleton visible={isSaving} />
                </AnimatePresence>
                {/* Colored tag bars */}
                {visibleTags.length > 0 && (
                  <div className="flex w-full h-1.5">
                    {visibleTags.map((tag, index) => (
                      <div
                        key={`${tag}-${index}`}
                        className="flex-1 h-full"
                        style={{ backgroundColor: getTagColor(tag) }}
                        title={tag}
                      />
                    ))}
                  </div>
                )}
                
                {/* Card content */}
                <div className={cn(
                  isUltraCompact && "p-1",
                  densityMode === "compact" && "p-2",
                  densityMode === "comfortable" && "p-3",
                )}>
                  {isUltraCompact ? (
                    <TaskCardUltraCompact
                      task={task}
                      isCompleted={isLocalCompleted || false}
                      hideBadges={hideBadges}
                      showCategoryBadge={showCategoryBadge}
                      canMoveLeft={canMoveLeft}
                      canMoveRight={canMoveRight}
                      isOverdue={isOverdue}
                      isUrgent={isUrgent}
                      onToggleCompleted={handleToggleCompleted}
                      onEdit={() => onEdit(task)}
                      onToggleFavorite={onToggleFavorite}
                      onMoveLeft={onMoveLeft}
                      onMoveRight={onMoveRight}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete}
                      onNavigatePomodoro={handleNavigatePomodoro}
                    />
                  ) : (
                    <div className={cn(
                      densityMode === "compact" && "space-y-1",
                      densityMode === "comfortable" && "space-y-2.5"
                    )}>
                      {/* Line 1: Checkbox + Title */}
                      <TaskCardHeader
                        title={task.title}
                        isCompleted={isLocalCompleted || false}
                        onToggleCompleted={handleToggleCompleted}
                        onEdit={() => onEdit(task)}
                        densityMode={densityMode}
                      />

                      {/* Line 2: Date, Priority, Category */}
                      <TaskCardBadges
                        dueDate={task.due_date}
                        priority={task.priority}
                        categoryName={task.categories?.name}
                        originalCategoryName={originalCategoryName}
                        subtasksCount={task.subtasks?.length || 0}
                        subtasksCompleted={task.subtasks?.filter(s => s.completed).length || 0}
                        hideBadges={hideBadges}
                        showCategoryBadge={showCategoryBadge}
                        hasRecurrence={!!task.recurrence_rule}
                        hasLinkedNote={!!task.linked_note_id}
                        linkedNoteId={task.linked_note_id}
                        densityMode={densityMode}
                        urgency={urgency}
                      />

                      {/* Line 3: Action icons */}
                      <TaskCardActions
                        taskId={task.id}
                        isFavorite={task.is_favorite}
                        canMoveLeft={canMoveLeft}
                        canMoveRight={canMoveRight}
                        densityMode={densityMode}
                        trackMetrics={task.track_metrics}
                        onToggleFavorite={onToggleFavorite}
                        onMoveLeft={onMoveLeft}
                        onMoveRight={onMoveRight}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        onOpenMetricsHistory={() => setMetricsHistoryOpen(true)}
                      />

                      {/* Line 4: Tags */}
                      <TaskCardTags
                        tags={task.tags || []}
                        hideBadges={hideBadges}
                        densityMode={densityMode}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </HoverCardTrigger>
          <HoverCardContent side="right" className="w-80">
            <TaskCardHoverContent
              title={task.title}
              description={task.description}
              subtasks={task.subtasks}
              dueDate={task.due_date}
            />
          </HoverCardContent>
        </HoverCard>
      </div>

      <TaskCardCompleteDialog
        open={confirmCompleteOpen}
        onOpenChange={setConfirmCompleteOpen}
        onCancel={handleCancelComplete}
        onConfirm={handleConfirmComplete}
      />

      <TaskCompletionModal
        open={completionModalOpen}
        onOpenChange={setCompletionModalOpen}
        taskTitle={task.title}
        trackMetrics={task.track_metrics || false}
        metricType={task.metric_type}
        trackComments={task.track_comments || false}
        onConfirm={handleCompletionConfirm}
        onCancel={handleCompletionCancel}
      />

      <TaskMetricsHistoryModal
        open={metricsHistoryOpen}
        onOpenChange={setMetricsHistoryOpen}
        taskId={task.id}
        taskTitle={task.title}
      />
    </>
  );
};

// Export memoized component
export const TaskCard = React.memo(TaskCardComponent, arePropsEqual);
