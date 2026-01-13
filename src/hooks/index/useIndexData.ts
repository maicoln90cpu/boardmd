import { useCallback } from "react";
import { useCategories } from "@/hooks/data/useCategories";
import { useColumns } from "@/hooks/data/useColumns";
import { useTasks, Task } from "@/hooks/tasks/useTasks";
import { useNotes } from "@/hooks/useNotes";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useToast } from "@/hooks/ui/useToast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { supabase } from "@/integrations/supabase/client";

export function useIndexData() {
  const { toast } = useToast();
  const { addActivity } = useActivityLog();

  // Data hooks
  const {
    categories,
    loading: loadingCategories,
    addCategory
  } = useCategories();
  
  const {
    columns,
    loading: loadingColumns,
    hiddenColumns,
    toggleColumnVisibility,
    getVisibleColumns,
    resetToDefaultView,
    deleteColumn,
    renameColumn,
    reorderColumns,
    addColumn,
    toggleColumnKanbanVisibility
  } = useColumns();
  
  const { notes } = useNotes();
  const { notebooks } = useNotebooks();
  
  // Tasks
  const {
    tasks: allTasks,
    resetAllTasksToFirstColumn: resetDailyTasks,
    updateTask: updateDailyTask,
    addTask
  } = useTasks("all");

  // Task reordering
  const handleReorderDailyTasks = useCallback(async (
    reorderedTasks: Array<{ id: string; position: number }>,
    refreshDailyBoard: () => void
  ) => {
    if (!updateDailyTask) return;
    try {
      for (const { id, position } of reorderedTasks) {
        await supabase
          .from("tasks")
          .update({ position, updated_at: new Date().toISOString() })
          .eq("id", id);
      }
      window.dispatchEvent(new CustomEvent('task-updated'));
      refreshDailyBoard();
      addActivity("ai_organize", "Tarefas organizadas com IA");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error reordering tasks:", error);
      toast({
        title: "Erro ao reordenar tarefas",
        variant: "destructive"
      });
    }
  }, [updateDailyTask, addActivity, toast]);

  // Task select for history
  const handleTaskSelect = useCallback((
    task: Task,
    setSelectedTaskForHistory: (id: string | null) => void,
    setShowHistory: (show: boolean) => void
  ) => {
    setSelectedTaskForHistory(task.id);
    setShowHistory(true);
  }, []);

  return {
    // Loading states
    loadingCategories,
    loadingColumns,
    
    // Data
    categories,
    columns,
    notes,
    notebooks,
    allTasks,
    addTask,
    addCategory,
    
    // Column operations
    hiddenColumns,
    toggleColumnVisibility,
    getVisibleColumns,
    resetToDefaultView,
    deleteColumn,
    renameColumn,
    reorderColumns,
    addColumn,
    toggleColumnKanbanVisibility,
    
    // Task operations
    resetDailyTasks,
    
    // Handlers
    handleReorderDailyTasks,
    handleTaskSelect,
  };
}
