import { memo, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, CheckSquare } from "lucide-react";
import { Column } from "@/hooks/data/useColumns";
import { ColumnColorPicker, getColumnTopBarClass, getColumnBackgroundClass } from "./ColumnColorPicker";

interface KanbanColumnHeaderProps {
  column: Column;
  taskCount: number;
  densityMode: "comfortable" | "compact" | "ultra-compact";
  isSelectionMode: boolean;
  onAddTask: (columnId: string) => void;
  onUncheckRecurrentTasks?: (columnId: string) => void;
  onColorChange: (color: string) => void;
  onToggleSelectionMode: () => void;
}

export const KanbanColumnHeader = memo(function KanbanColumnHeader({
  column,
  taskCount,
  densityMode,
  isSelectionMode,
  onAddTask,
  onUncheckRecurrentTasks,
  onColorChange,
  onToggleSelectionMode,
}: KanbanColumnHeaderProps) {
  const isRecurrentColumn = column.name.toLowerCase() === "recorrente";
  
  // Memoizar estilos baseados no modo de densidade
  const styles = useMemo(() => {
    switch (densityMode) {
      case "ultra-compact":
        return {
          headerPadding: "p-1.5",
          headerText: "text-xs",
          countText: "text-xs",
          iconSize: "h-3 w-3",
        };
      case "compact":
        return {
          headerPadding: "p-2",
          headerText: "text-sm",
          countText: "text-xs",
          iconSize: "h-4 w-4",
        };
      default:
        return {
          headerPadding: "p-3",
          headerText: "text-lg",
          countText: "text-sm",
          iconSize: "h-4 w-4",
        };
    }
  }, [densityMode]);

  // Memoizar handlers
  const handleAddTask = useCallback(() => onAddTask(column.id), [onAddTask, column.id]);
  const handleUncheck = useCallback(() => onUncheckRecurrentTasks?.(column.id), [onUncheckRecurrentTasks, column.id]);

  return (
    <div className={`rounded-t-lg overflow-hidden border border-b-0 ${getColumnBackgroundClass(column.color)}`}>
      <div className={`h-1.5 w-full ${getColumnTopBarClass(column.color)}`} />
      <div className={`flex items-center justify-between ${styles.headerPadding}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className={`${styles.headerText} font-semibold`}>{column.name}</h2>
          <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-bold ${
            taskCount === 0 
              ? "bg-muted text-muted-foreground" 
              : taskCount > 5 
                ? "bg-primary text-primary-foreground" 
                : "bg-accent text-accent-foreground"
          }`}>
            {taskCount}
          </span>
          {isRecurrentColumn && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium">
              🔄 Não reseta
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={isSelectionMode ? "default" : "ghost"}
            onClick={onToggleSelectionMode}
            title={isSelectionMode ? "Sair do modo seleção" : "Selecionar múltiplas tarefas"}
            className={isSelectionMode ? "bg-primary text-primary-foreground" : ""}
          >
            <CheckSquare className={styles.iconSize} />
          </Button>
          {isRecurrentColumn && onUncheckRecurrentTasks && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleUncheck}
              title="Desmarcar todas as tarefas recorrentes"
            >
              <RotateCcw className={styles.iconSize} />
            </Button>
          )}
          <ColumnColorPicker
            currentColor={column.color}
            onColorChange={onColorChange}
          />
          <Button
            size="sm"
            onClick={handleAddTask}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-full group"
          >
            <Plus className={`${styles.iconSize} transition-transform group-hover:rotate-90 duration-200`} />
          </Button>
        </div>
      </div>
    </div>
  );
});
