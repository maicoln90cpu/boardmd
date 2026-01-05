import { memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Task } from "@/hooks/tasks/useTasks";
import { TaskCard } from "@/components/TaskCard";
import { EmptyStateCompact } from "@/components/ui/empty-state";
import { motion, AnimatePresence } from "framer-motion";

interface VirtualizedTaskListProps {
  tasks: Task[];
  columnIndex: number;
  columnsLength: number;
  densityMode: "comfortable" | "compact" | "ultra-compact";
  compact: boolean;
  isSelectionMode: boolean;
  isSelected: (id: string) => boolean;
  onToggleSelection: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteClick: (id: string) => void;
  onMoveTask: (taskId: string, direction: "left" | "right") => void;
  toggleFavorite: (id: string) => void;
  duplicateTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  isDailyKanban: boolean;
  showCategoryBadge: boolean;
  priorityColors?: {
    high: { background: string; text: string };
    medium: { background: string; text: string };
    low: { background: string; text: string };
  };
  getTagColor: (tagName: string) => string | null;
  onAddPoints: () => void;
  originalCategoriesMap: Record<string, string>;
  completedColumnId?: string;
  columnName: string;
}

// Threshold para ativar virtualização
const VIRTUALIZATION_THRESHOLD = 50;

// Altura estimada dos itens baseado no densityMode
const getEstimatedItemSize = (densityMode: string) => {
  switch (densityMode) {
    case "ultra-compact":
      return 40;
    case "compact":
      return 72;
    default:
      return 120;
  }
};

export const VirtualizedTaskList = memo(function VirtualizedTaskList({
  tasks,
  columnIndex,
  columnsLength,
  densityMode,
  compact,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  onEditTask,
  onDeleteClick,
  onMoveTask,
  toggleFavorite,
  duplicateTask,
  updateTask,
  isDailyKanban,
  showCategoryBadge,
  priorityColors,
  getTagColor,
  onAddPoints,
  originalCategoriesMap,
  completedColumnId,
  columnName,
}: VirtualizedTaskListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = tasks.length > VIRTUALIZATION_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => getEstimatedItemSize(densityMode),
    overscan: 5,
  });

  // Empty state quando não há tarefas
  if (tasks.length === 0) {
    return <EmptyStateCompact variant="column" />;
  }

  // Lista normal para poucos itens
  if (!shouldVirtualize) {
    return (
      <AnimatePresence mode="popLayout" initial={false}>
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <TaskCard
              task={{
                ...task,
                originalCategory: originalCategoriesMap[task.id] || 
                  (task.mirror_task_id ? originalCategoriesMap[task.mirror_task_id] : undefined)
              }}
              onEdit={onEditTask}
              onDelete={onDeleteClick}
              onMoveLeft={() => onMoveTask(task.id, "left")}
              onMoveRight={() => onMoveTask(task.id, "right")}
              canMoveLeft={columnIndex > 0}
              canMoveRight={columnIndex < columnsLength - 1}
              compact={compact || densityMode !== "comfortable"}
              isDailyKanban={isDailyKanban}
              showCategoryBadge={showCategoryBadge}
              onToggleFavorite={toggleFavorite}
              onDuplicate={duplicateTask}
              densityMode={densityMode}
              priorityColors={priorityColors}
              getTagColor={getTagColor}
              onAddPoints={onAddPoints}
              isSelected={isSelected(task.id)}
              isSelectionMode={isSelectionMode}
              onToggleSelection={onToggleSelection}
              columnName={columnName}
              completedColumnId={completedColumnId}
              onMoveToCompleted={(taskId, colId) => updateTask(taskId, { column_id: colId })}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    );
  }

  // Lista virtualizada para muitos itens
  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const task = tasks[virtualRow.index];
          return (
            <div
              key={task.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TaskCard
                task={{
                  ...task,
                  originalCategory: originalCategoriesMap[task.id] || 
                    (task.mirror_task_id ? originalCategoriesMap[task.mirror_task_id] : undefined)
                }}
                onEdit={onEditTask}
                onDelete={onDeleteClick}
                onMoveLeft={() => onMoveTask(task.id, "left")}
                onMoveRight={() => onMoveTask(task.id, "right")}
                canMoveLeft={columnIndex > 0}
                canMoveRight={columnIndex < columnsLength - 1}
                compact={compact || densityMode !== "comfortable"}
                isDailyKanban={isDailyKanban}
                showCategoryBadge={showCategoryBadge}
                onToggleFavorite={toggleFavorite}
                onDuplicate={duplicateTask}
                densityMode={densityMode}
                priorityColors={priorityColors}
                getTagColor={getTagColor}
                onAddPoints={onAddPoints}
                isSelected={isSelected(task.id)}
                isSelectionMode={isSelectionMode}
                onToggleSelection={onToggleSelection}
                columnName={columnName}
                completedColumnId={completedColumnId}
                onMoveToCompleted={(taskId, colId) => updateTask(taskId, { column_id: colId })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});