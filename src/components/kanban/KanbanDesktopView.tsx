import { memo } from "react";
import { Column } from "@/hooks/useColumns";
import { Task } from "@/hooks/useTasks";
import { TaskCard } from "@/components/TaskCard";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DroppableColumn } from "./DroppableColumn";
import { KanbanColumnHeader } from "./KanbanColumnHeader";
import { getColumnBackgroundClass } from "./ColumnColorPicker";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { motion, AnimatePresence } from "framer-motion";

interface KanbanDesktopViewProps {
  columns: Column[];
  columnSizes: number[];
  onColumnSizesChange: (sizes: number[]) => void;
  getTasksForColumn: (columnId: string) => Task[];
  activeId: string | null;
  overId: string | null;
  densityMode: "comfortable" | "compact" | "ultra-compact";
  compact: boolean;
  isSelectionMode: boolean;
  isSelected: (id: string) => boolean;
  onToggleSelection: (id: string) => void;
  onEnterSelectionMode: () => void;
  onExitSelectionMode: () => void;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteClick: (id: string) => void;
  onMoveTask: (taskId: string, direction: "left" | "right") => void;
  onUncheckRecurrentTasks: (columnId: string) => void;
  onColorChange: (columnId: string, color: string) => void;
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
}

export const KanbanDesktopView = memo(function KanbanDesktopView({
  columns,
  columnSizes,
  onColumnSizesChange,
  getTasksForColumn,
  activeId,
  overId,
  densityMode,
  compact,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  onEnterSelectionMode,
  onExitSelectionMode,
  onAddTask,
  onEditTask,
  onDeleteClick,
  onMoveTask,
  onUncheckRecurrentTasks,
  onColorChange,
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
}: KanbanDesktopViewProps) {
  // Estilos baseados no modo de densidade
  const getStyles = () => {
    switch (densityMode) {
      case "ultra-compact":
        return {
          gap: "gap-1",
          padding: "p-1",
          cardGap: "gap-1",
          minHeight: "min-h-[60px]",
        };
      case "compact":
        return {
          gap: "gap-2",
          padding: "p-2",
          cardGap: "gap-1.5",
          minHeight: "min-h-[100px]",
        };
      default:
        return {
          gap: compact ? "gap-4" : "gap-4 md:gap-6",
          padding: compact ? "p-2" : "p-4 md:p-6",
          cardGap: compact ? "gap-2" : "gap-3",
          minHeight: compact ? "min-h-[120px]" : "min-h-[200px]",
        };
    }
  };
  
  const styles = getStyles();
  const isDragging = !!activeId;

  return (
    <div className={styles.padding}>
      <ResizablePanelGroup
        direction="horizontal"
        className={styles.gap}
        onLayout={onColumnSizesChange}
      >
        {columns.map((column, columnIndex) => {
          const columnTasks = getTasksForColumn(column.id);
          const isDropTarget = activeId && overId === column.id;
          
          return (
            <>
              <ResizablePanel
                key={column.id}
                defaultSize={columnSizes[columnIndex] || 100 / columns.length}
                minSize={15}
              >
                <div 
                  className={`flex flex-col ${styles.gap} h-full transition-all duration-200 ${
                    isDropTarget 
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg scale-[1.01]" 
                      : isDragging 
                        ? "opacity-75" 
                        : ""
                  }`}
                >
                  <KanbanColumnHeader
                    column={column}
                    taskCount={columnTasks.length}
                    densityMode={densityMode}
                    isSelectionMode={isSelectionMode}
                    onAddTask={onAddTask}
                    onUncheckRecurrentTasks={onUncheckRecurrentTasks}
                    onColorChange={(color) => onColorChange(column.id, color)}
                    onToggleSelectionMode={() => isSelectionMode ? onExitSelectionMode() : onEnterSelectionMode()}
                  />

                  <SortableContext
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                    id={column.id}
                  >
                    <DroppableColumn 
                      id={column.id}
                      isActive={isDragging}
                      className={`flex flex-col ${styles.cardGap} ${styles.minHeight} ${styles.padding} rounded-b-lg border border-t-0 ${getColumnBackgroundClass(column.color)} ${
                        isDropTarget ? "!bg-primary/10 border-primary/30" : ""
                      }`}
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        {columnTasks.map((task) => (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, transition: { duration: 0.1 } }}
                            transition={{
                              duration: 0.15,
                              ease: "easeOut",
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
                              canMoveRight={columnIndex < columns.length - 1}
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
                              columnName={column.name}
                              completedColumnId={completedColumnId}
                              onMoveToCompleted={(taskId, colId) => updateTask(taskId, { column_id: colId })}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </DroppableColumn>
                  </SortableContext>
                </div>
              </ResizablePanel>
              {columnIndex < columns.length - 1 && (
                <ResizableHandle withHandle />
              )}
            </>
          );
        })}
      </ResizablePanelGroup>
    </div>
  );
});
