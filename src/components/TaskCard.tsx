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
} from "@/components/task-card";
import { useSavingTasks } from "@/contexts/SavingTasksContext";
import { AnimatePresence } from "framer-motion";

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

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: TaskCardProps, nextProps: TaskCardProps): boolean => {
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
  if (prevTask.linked_note_id !== nextTask.linked_note_id) return false;
  if (prevTask.originalCategory !== nextTask.originalCategory) return false;
  if (prevTask.categories?.name !== nextTask.categories?.name) return false;

  const prevSubtasks = prevTask.subtasks || [];
  const nextSubtasks = nextTask.subtasks || [];
  if (prevSubtasks.length !== nextSubtasks.length) return false;
  for (let i = 0; i < prevSubtasks.length; i++) {
    if (prevSubtasks[i].completed !== nextSubtasks[i].completed) return false;
  }

  const prevTags = prevTask.tags || [];
  const nextTags = nextTask.tags || [];
  if (prevTags.length !== nextTags.length) return false;
  if (prevTags.join(",") !== nextTags.join(",")) return false;

  if (JSON.stringify(prevTask.recurrence_rule) !== JSON.stringify(nextTask.recurrence_rule)) return false;

  if (prevProps.compact !== nextProps.compact) return false;
  if (prevProps.isDailyKanban !== nextProps.isDailyKanban) return false;
  if (prevProps.showCategoryBadge !== nextProps.showCategoryBadge) return false;
  if (prevProps.densityMode !== nextProps.densityMode) return false;
  if (prevProps.hideBadges !== nextProps.hideBadges) return false;
  if (prevProps.canMoveLeft !== nextProps.canMoveLeft) return false;
  if (prevProps.canMoveRight !== nextProps.canMoveRight) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.isSelectionMode !== nextProps.isSelectionMode) return false;

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
  isDailyKanban = false,
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
  const cardRef = React.useRef<HTMLDivElement>(null);
  const { isTaskSaving } = useSavingTasks();
  const isSaving = isTaskSaving(task.id);

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
      if (import.meta.env.DEV) {
        console.error("Erro ao atualizar tarefa:", error);
      }
      setIsLocalCompleted(!checked);
      toast({
        title: "Erro ao atualizar tarefa",
        description: "Não foi possível salvar a alteração. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleToggleCompleted = async (checked: boolean) => {
    const isRecurrentColumn = columnName?.toLowerCase() === "recorrente";
    
    if (checked && !isRecurrentColumn && completedColumnId && onMoveToCompleted) {
      setPendingComplete(true);
      setConfirmCompleteOpen(true);
    } else {
      await executeToggleCompleted(checked);
    }
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
                        isDailyKanban={isDailyKanban}
                        hideBadges={hideBadges}
                        showCategoryBadge={showCategoryBadge}
                        hasRecurrence={!!task.recurrence_rule}
                        hasLinkedNote={!!task.linked_note_id}
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
                        onToggleFavorite={onToggleFavorite}
                        onMoveLeft={onMoveLeft}
                        onMoveRight={onMoveRight}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                      />

                      {/* Line 4: Mirror badge and tags */}
                      <TaskCardTags
                        tags={task.tags || []}
                        hasMirror={!!task.mirror_task_id}
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
    </>
  );
};

// Export memoized component
export const TaskCard = React.memo(TaskCardComponent, arePropsEqual);
