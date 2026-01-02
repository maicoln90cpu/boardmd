import { useState, useCallback } from "react";
import { Column } from "@/hooks/useColumns";
import { Task } from "@/hooks/useTasks";
import { useUndo } from "@/hooks/useUndoStack";
import { useToast } from "@/hooks/useToast";
import { calculateNextRecurrenceDate } from "@/lib/recurrenceUtils";
import { supabase } from "@/integrations/supabase/client";

interface UseKanbanTaskActionsOptions {
  columns: Column[];
  tasks: Task[];
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  onTaskCompleted?: () => void;
}

export function useKanbanTaskActions({
  columns,
  tasks,
  updateTask,
  deleteTask,
  onTaskCompleted,
}: UseKanbanTaskActionsOptions) {
  const { pushAction } = useUndo();
  const { toast } = useToast();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const handleAddTask = useCallback((columnId: string) => {
    setSelectedTask(null);
    setSelectedColumn(columnId);
    setModalOpen(true);
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setSelectedTask(task);
    setSelectedColumn(task.column_id);
    setModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((id: string) => {
    setTaskToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (taskToDelete) {
      const taskData = tasks.find(t => t.id === taskToDelete);
      if (taskData) {
        pushAction({
          type: "DELETE_TASK",
          description: `Tarefa "${taskData.title}" excluída`,
          payload: {
            taskId: taskToDelete,
            fullData: {
              id: taskData.id,
              title: taskData.title,
              description: taskData.description,
              category_id: taskData.category_id,
              column_id: taskData.column_id,
              position: taskData.position,
              priority: taskData.priority,
              due_date: taskData.due_date,
              is_completed: taskData.is_completed,
              is_favorite: taskData.is_favorite,
              tags: taskData.tags,
              subtasks: taskData.subtasks,
              recurrence_rule: taskData.recurrence_rule,
              mirror_task_id: taskData.mirror_task_id,
              user_id: taskData.user_id,
            },
          },
        });
      }
      await deleteTask(taskToDelete);
      setTaskToDelete(null);
    }
    setDeleteDialogOpen(false);
  }, [taskToDelete, tasks, pushAction, deleteTask]);

  const handleMoveTask = useCallback(async (taskId: string, direction: "left" | "right") => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentColumnIndex = columns.findIndex(c => c.id === task.column_id);
    const targetIndex = direction === "left" ? currentColumnIndex - 1 : currentColumnIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < columns.length) {
      const targetColumn = columns[targetIndex];
      const sourceColumn = columns[currentColumnIndex];
      const destinationTasks = tasks.filter(t => t.column_id === targetColumn.id);
      
      pushAction({
        type: "MOVE_TASK",
        description: `Tarefa movida para "${targetColumn.name}"`,
        payload: {
          taskId,
          previousColumnId: task.column_id,
          previousPosition: task.position,
        },
      });
      
      const updates: Partial<Task> = {
        column_id: targetColumn.id,
        position: destinationTasks.length
      };
      
      if (targetColumn.name.toLowerCase() === "concluído") {
        updates.is_completed = true;
        onTaskCompleted?.();
      } else if (sourceColumn?.name.toLowerCase() === "concluído") {
        updates.is_completed = false;
      }
      
      await updateTask(taskId, updates);
    }
  }, [tasks, columns, pushAction, updateTask, onTaskCompleted]);

  const handleUncheckRecurrentTasks = useCallback(async (columnId: string, getTasksForColumn: (id: string) => Task[]) => {
    const columnTasks = getTasksForColumn(columnId);
    const completedTasks = columnTasks.filter(task => task.is_completed === true);
    
    if (completedTasks.length === 0) {
      toast({
        title: "Nenhuma tarefa riscada",
        description: "Não há tarefas concluídas para resetar nesta coluna",
      });
      return;
    }
    
    for (const task of completedTasks) {
      localStorage.removeItem(`task-completed-${task.id}`);
      
      const nextDueDate = calculateNextRecurrenceDate(task.due_date, task.recurrence_rule);
      
      await updateTask(task.id, {
        due_date: nextDueDate,
        is_completed: false
      });
      
      if (task.mirror_task_id) {
        await supabase.from("tasks").update({
          due_date: nextDueDate,
          is_completed: false
        }).eq("id", task.mirror_task_id);
      }
      
      const { data: reverseMirrors } = await supabase
        .from("tasks")
        .select("id")
        .eq("mirror_task_id", task.id);
        
      if (reverseMirrors && reverseMirrors.length > 0) {
        await supabase.from("tasks").update({
          due_date: nextDueDate,
          is_completed: false
        }).in("id", reverseMirrors.map(t => t.id));
      }
    }
    
    window.dispatchEvent(new CustomEvent('tasks-unchecked'));
    
    toast({
      title: "✅ Tarefas resetadas",
      description: `${completedTasks.length} tarefa(s) riscada(s) resetada(s) com próxima data calculada`,
    });
  }, [updateTask, toast]);

  // Bulk Actions
  const handleBulkDelete = useCallback(async (taskIds: string[]) => {
    for (const taskId of taskIds) {
      const taskData = tasks.find(t => t.id === taskId);
      if (taskData) {
        pushAction({
          type: "DELETE_TASK",
          description: `${taskIds.length} tarefa(s) excluída(s)`,
          payload: {
            taskId,
            fullData: {
              id: taskData.id,
              title: taskData.title,
              description: taskData.description,
              category_id: taskData.category_id,
              column_id: taskData.column_id,
              position: taskData.position,
              priority: taskData.priority,
              due_date: taskData.due_date,
              is_completed: taskData.is_completed,
              is_favorite: taskData.is_favorite,
              tags: taskData.tags,
              subtasks: taskData.subtasks,
              recurrence_rule: taskData.recurrence_rule,
              mirror_task_id: taskData.mirror_task_id,
              user_id: taskData.user_id,
            },
          },
        });
      }
      await deleteTask(taskId);
    }
    toast({
      title: "Tarefas excluídas",
      description: `${taskIds.length} tarefa(s) excluída(s) com sucesso`,
    });
  }, [tasks, pushAction, deleteTask, toast]);

  const handleBulkComplete = useCallback(async (taskIds: string[], completed: boolean) => {
    for (const taskId of taskIds) {
      await updateTask(taskId, { is_completed: completed });
      if (completed) {
        onTaskCompleted?.();
      }
    }
    toast({
      title: completed ? "Tarefas completadas" : "Tarefas reabertas",
      description: `${taskIds.length} tarefa(s) atualizada(s)`,
    });
  }, [updateTask, onTaskCompleted, toast]);

  const handleBulkMove = useCallback(async (taskIds: string[], columnId: string) => {
    const destinationColumn = columns.find(c => c.id === columnId);
    const isCompletedColumn = destinationColumn?.name.toLowerCase() === "concluído";
    
    for (const taskId of taskIds) {
      const updates: Partial<Task> = { column_id: columnId };
      if (isCompletedColumn) {
        updates.is_completed = true;
        onTaskCompleted?.();
      }
      await updateTask(taskId, updates);
    }
    toast({
      title: "Tarefas movidas",
      description: `${taskIds.length} tarefa(s) movida(s) para "${destinationColumn?.name}"`,
    });
  }, [columns, updateTask, onTaskCompleted, toast]);

  return {
    // Modal state
    modalOpen,
    setModalOpen,
    selectedTask,
    selectedColumn,
    
    // Delete dialog state
    deleteDialogOpen,
    setDeleteDialogOpen,
    taskToDelete,
    
    // Actions
    handleAddTask,
    handleEditTask,
    handleDeleteClick,
    confirmDelete,
    handleMoveTask,
    handleUncheckRecurrentTasks,
    
    // Bulk actions
    handleBulkDelete,
    handleBulkComplete,
    handleBulkMove,
  };
}
