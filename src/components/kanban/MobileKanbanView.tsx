import { useState, memo, useCallback, useMemo } from "react";
import { Column } from "@/hooks/data/useColumns";
import { Task } from "@/hooks/tasks/useTasks";
import { TaskCard } from "../TaskCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { getColumnTopBarClass, getColumnBackgroundClass } from "@/lib/columnStyles";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { SwipeableTaskCard } from "./SwipeableTaskCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import { logger } from "@/lib/logger";
import { oneSignalNotifier } from "@/lib/notifications/oneSignalNotifier";
import { useSettings } from "@/hooks/data/useSettings";
import { getTemplateById, formatNotificationTemplate } from "@/lib/defaultNotificationTemplates";

interface PriorityColors {
  high: { background: string; text: string };
  medium: { background: string; text: string };
  low: { background: string; text: string };
}

interface MobileKanbanViewProps {
  columns: Column[];
  tasks: Task[];
  getTasksForColumn: (columnId: string) => Task[];
  handleAddTask: (columnId: string) => void;
  handleEditTask: (task: Task) => void;
  handleDeleteClick: (taskId: string) => void;
  toggleFavorite: (taskId: string) => void;
  duplicateTask: (taskId: string) => void;
  handleMoveTask: (taskId: string, direction: "left" | "right") => void;
  showCategoryBadge?: boolean;
  densityMode?: "comfortable" | "compact" | "ultra-compact";
  hideBadges?: boolean;
  gridColumns?: 1 | 2;
  priorityColors?: PriorityColors;
  originalCategoriesMap?: Record<string, string>;
  getTagColor?: (tagName: string) => string;
  onAddPoints?: () => void;
}

export const MobileKanbanView = memo(function MobileKanbanView({
  columns,
  tasks,
  getTasksForColumn,
  handleAddTask,
  handleEditTask,
  handleDeleteClick,
  toggleFavorite,
  duplicateTask,
  handleMoveTask,
  showCategoryBadge = false,
  densityMode = "compact",
  hideBadges = false,
  gridColumns = 2,
  priorityColors,
  originalCategoriesMap = {},
  getTagColor,
  onAddPoints,
}: MobileKanbanViewProps) {
  const [activeTab, setActiveTab] = useState(columns[0]?.id || "");
  const { toast } = useToast();
  const { settings } = useSettings();

  // Memoizar valores calculados
  const currentColumnIndex = useMemo(
    () => columns.findIndex((col) => col.id === activeTab),
    [columns, activeTab]
  );
  const canMoveLeft = currentColumnIndex > 0;
  const canMoveRight = currentColumnIndex < columns.length - 1;

  // Handler memoizado para toggle de completion via swipe
  const handleSwipeComplete = useCallback(
    async (task: Task) => {
      try {
        const newCompleted = !task.is_completed;
        const { error } = await supabase
          .from("tasks")
          .update({ is_completed: newCompleted })
          .eq("id", task.id);

        if (error) throw error;

        // Gamificação
        if (newCompleted && onAddPoints) {
          onAddPoints();
        }

        // Push notification via OneSignal para task_completed - respeita template
        if (newCompleted) {
          const userTemplates = settings.notificationTemplates;
          const tpl = getTemplateById(userTemplates || [], 'task_completed');
          if (tpl?.enabled !== false) {
            supabase.auth.getUser().then(({ data }) => {
              if (data?.user) {
                const formatted = formatNotificationTemplate(tpl!, { taskTitle: task.title });
                oneSignalNotifier.send({
                  user_id: data.user.id,
                  title: formatted.title,
                  body: formatted.body,
                  notification_type: 'task_completed',
                  url: '/',
                });
              }
            });
          }
        }

        window.dispatchEvent(new CustomEvent("task-updated", { detail: { taskId: task.id } }));

        toast({
          title: newCompleted ? "Tarefa concluída!" : "Tarefa reaberta",
          duration: 1500,
        });
      } catch (error) {
        logger.error("Erro ao atualizar tarefa:", error);
        toast({
          title: "Erro ao atualizar tarefa",
          variant: "destructive",
        });
      }
    },
    [onAddPoints, toast]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2">
        <div
          className={cn("grid gap-3", gridColumns === 1 ? "grid-cols-1" : "grid-cols-2")}
        >
          {columns.map((column) => {
            const columnTasks = getTasksForColumn(column.id);
            const isRecurrent = column.name.toLowerCase() === "recorrente";

            return (
              <div
                key={column.id}
                className={cn(
                  "flex flex-col rounded-lg border overflow-hidden min-h-[300px]",
                  getColumnBackgroundClass(column.color)
                )}
              >
                {/* Barra colorida no topo (estilo KanbanFlow) */}
                <div className={cn("h-1 w-full", getColumnTopBarClass(column.color))} />

                {/* Header da coluna */}
                <div
                  className={cn(
                    "p-2 border-b sticky top-0 z-10",
                    getColumnBackgroundClass(column.color)
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <h4 className="text-xs font-semibold truncate">{column.name}</h4>
                      <span className="text-[10px] text-muted-foreground">
                        ({columnTasks.length})
                      </span>
                      {isRecurrent && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-medium whitespace-nowrap">
                          🔄
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista de tasks */}
                <SortableContext
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                    {columnTasks.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-[10px]">
                        Vazio
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout" initial={false}>
                        {columnTasks.map((task) => (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, transition: { duration: 0.08 } }}
                            transition={{
                              duration: 0.12,
                              ease: "easeOut",
                            }}
                          >
                            {isRecurrent ? (
                              // Tarefas recorrentes: sem swipe, sem drag
                              <TaskCard
                                task={{
                                  ...task,
                                  originalCategory: originalCategoriesMap[task.id]
                                }}
                                onEdit={() => handleEditTask(task)}
                                onDelete={() => handleDeleteClick(task.id)}
                                onToggleFavorite={toggleFavorite}
                                onDuplicate={duplicateTask}
                                showCategoryBadge={showCategoryBadge}
                                densityMode={densityMode}
                                hideBadges={hideBadges}
                                priorityColors={priorityColors}
                                getTagColor={getTagColor}
                                onAddPoints={onAddPoints}
                                isDraggable={false}
                              />
                            ) : (
                              // Outras colunas: com swipe
                              <SwipeableTaskCard
                                taskId={task.id}
                                onComplete={() => handleSwipeComplete(task)}
                                onEdit={() => handleEditTask(task)}
                                onDelete={() => handleDeleteClick(task.id)}
                                isCompleted={task.is_completed || false}
                              >
                                <TaskCard
                                  task={{
                                    ...task,
                                    originalCategory: originalCategoriesMap[task.id]
                                  }}
                                  onEdit={() => handleEditTask(task)}
                                  onDelete={() => handleDeleteClick(task.id)}
                                  onToggleFavorite={toggleFavorite}
                                  onDuplicate={duplicateTask}
                                  showCategoryBadge={showCategoryBadge}
                                  densityMode={densityMode}
                                  hideBadges={hideBadges}
                                  priorityColors={priorityColors}
                                  getTagColor={getTagColor}
                                  onAddPoints={onAddPoints}
                                  isDraggable={false}
                                />
                              </SwipeableTaskCard>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </SortableContext>

                {/* Botão adicionar tarefa - Premium */}
                <Button
                  size="sm"
                  className="m-1 h-7 text-[10px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 rounded-full group"
                  onClick={() => handleAddTask(column.id)}
                >
                  <Plus className="h-3 w-3 transition-transform group-hover:rotate-90 duration-200" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
