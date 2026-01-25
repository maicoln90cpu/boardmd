import { memo, useMemo } from "react";
import { Column } from "@/hooks/data/useColumns";
import { Task } from "@/hooks/tasks/useTasks";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DroppableColumn } from "./DroppableColumn";
import { KanbanColumnHeader } from "./KanbanColumnHeader";
import { VirtualizedTaskList } from "./VirtualizedTaskList";
import { getColumnBackgroundClass } from "@/lib/columnStyles";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

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
  showCategoryBadge,
  priorityColors,
  getTagColor,
  onAddPoints,
  originalCategoriesMap,
  completedColumnId,
}: KanbanDesktopViewProps) {
  // Estilos baseados no modo de densidade - memoizado
  const styles = useMemo(() => {
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
  }, [densityMode, compact]);

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
            <div key={column.id} className="contents">
              <ResizablePanel
                defaultSize={columnSizes[columnIndex] || 100 / columns.length}
                minSize={15}
              >
                <div
                  className={cn(
                    "flex flex-col h-full transition-all duration-200",
                    styles.gap,
                    isDropTarget &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg scale-[1.01]",
                    isDragging && !isDropTarget && "opacity-75"
                  )}
                >
                  <KanbanColumnHeader
                    column={column}
                    taskCount={columnTasks.length}
                    densityMode={densityMode}
                    isSelectionMode={isSelectionMode}
                    onAddTask={onAddTask}
                    onColorChange={(color) => onColorChange(column.id, color)}
                    onToggleSelectionMode={() =>
                      isSelectionMode ? onExitSelectionMode() : onEnterSelectionMode()
                    }
                  />

                  <SortableContext
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                    id={column.id}
                  >
                    <DroppableColumn
                      id={column.id}
                      isActive={isDragging}
                      className={cn(
                        "flex flex-col rounded-b-lg border border-t-0",
                        styles.cardGap,
                        styles.minHeight,
                        styles.padding,
                        getColumnBackgroundClass(column.color),
                        isDropTarget && "!bg-primary/10 border-primary/30"
                      )}
                    >
                      <VirtualizedTaskList
                        tasks={columnTasks}
                        columnIndex={columnIndex}
                        columnsLength={columns.length}
                        densityMode={densityMode}
                        compact={compact}
                        isSelectionMode={isSelectionMode}
                        isSelected={isSelected}
                        onToggleSelection={onToggleSelection}
                        onEditTask={onEditTask}
                        onDeleteClick={onDeleteClick}
                        onMoveTask={onMoveTask}
                        toggleFavorite={toggleFavorite}
                        duplicateTask={duplicateTask}
                        updateTask={updateTask}
                        showCategoryBadge={showCategoryBadge}
                        priorityColors={priorityColors}
                        getTagColor={getTagColor}
                        onAddPoints={onAddPoints}
                        originalCategoriesMap={originalCategoriesMap}
                        completedColumnId={completedColumnId}
                        columnName={column.name}
                      />
                    </DroppableColumn>
                  </SortableContext>
                </div>
              </ResizablePanel>
              {columnIndex < columns.length - 1 && (
                <ResizableHandle key={`handle-${column.id}`} withHandle />
              )}
            </div>
          );
        })}
      </ResizablePanelGroup>
    </div>
  );
});
