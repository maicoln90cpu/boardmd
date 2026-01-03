import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { calculateNextRecurrenceDate } from "@/lib/recurrenceUtils";

interface Column {
  id: string;
  name: string;
  position: number;
}

interface UseTaskResetProps {
  columns: Column[];
  resetAllTasksToFirstColumn: (firstColumnId: string, excludeColumns?: string[]) => Promise<void>;
  onBoardRefresh: () => void;
}

export function useTaskReset({
  columns,
  resetAllTasksToFirstColumn,
  onBoardRefresh
}: UseTaskResetProps) {
  const { toast } = useToast();
  const { addActivity } = useActivityLog();

  const handleResetRecurrentTasks = useCallback(async () => {
    const recurrentColumn = columns.find(col => col.name.toLowerCase() === "recorrente");
    if (!recurrentColumn) {
      toast({
        title: "Coluna não encontrada",
        description: "Coluna 'Recorrente' não existe",
        variant: "destructive"
      });
      return;
    }

    // Query direta ao Supabase para buscar TODAS as tarefas na coluna Recorrente
    const { data: recurrentTasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, title, is_completed, recurrence_rule, tags, due_date")
      .eq("column_id", recurrentColumn.id)
      .not("recurrence_rule", "is", null);
    
    if (fetchError) {
      if (import.meta.env.DEV) console.error("[DEBUG RESET] Erro ao buscar tarefas:", fetchError);
      toast({
        title: "Erro ao buscar tarefas",
        description: fetchError.message,
        variant: "destructive"
      });
      return;
    }

    // Filtrar: só tarefas riscadas (is_completed = true) e sem tag de espelho
    const tasksToReset = recurrentTasks?.filter(
      task => !task.tags?.includes("espelho-diário") && task.is_completed === true
    ) || [];
    
    if (import.meta.env.DEV) console.log("[DEBUG RESET] Tarefas recorrentes RISCADAS encontradas:", tasksToReset.length);
    
    if (tasksToReset.length === 0) {
      toast({
        title: "Nenhuma tarefa",
        description: "Não há tarefas recorrentes riscadas para resetar"
      });
      return;
    }

    // Limpar checkboxes do localStorage
    tasksToReset.forEach(task => {
      localStorage.removeItem(`task-completed-${task.id}`);
    });

    // Preparar batch updates por data de próxima recorrência
    const updatesByNextDate: Record<string, string[]> = {};
    tasksToReset.forEach(task => {
      const nextDueDate = calculateNextRecurrenceDate(task.due_date, task.recurrence_rule as any);
      const dateKey = nextDueDate || 'null';
      if (!updatesByNextDate[dateKey]) {
        updatesByNextDate[dateKey] = [];
      }
      updatesByNextDate[dateKey].push(task.id);
    });

    // Batch update para cada grupo de data
    let successCount = 0;
    for (const [dateKey, taskIds] of Object.entries(updatesByNextDate)) {
      const nextDueDate = dateKey === 'null' ? null : dateKey;
      const { error } = await supabase
        .from("tasks")
        .update({
          is_completed: false,
          due_date: nextDueDate
        })
        .in("id", taskIds);
      
      if (error) {
        if (import.meta.env.DEV) console.error("[RESET] Erro batch update:", error);
      } else {
        successCount += taskIds.length;
      }
    }

    // Sincronização bidirecional - batch para mirrors
    const allTaskIds = tasksToReset.map(t => t.id);
    const { data: tasksWithMirrors } = await supabase
      .from("tasks")
      .select("id, mirror_task_id")
      .in("id", allTaskIds)
      .not("mirror_task_id", "is", null);
    
    if (tasksWithMirrors && tasksWithMirrors.length > 0) {
      const mirrorIds = tasksWithMirrors.map(t => t.mirror_task_id).filter(Boolean) as string[];
      await supabase
        .from("tasks")
        .update({ is_completed: false })
        .in("id", mirrorIds);
    }

    // Buscar reverse mirrors em batch
    const { data: reverseMirrors } = await supabase
      .from("tasks")
      .select("id")
      .in("mirror_task_id", allTaskIds);
    
    if (reverseMirrors && reverseMirrors.length > 0) {
      await supabase
        .from("tasks")
        .update({ is_completed: false })
        .in("id", reverseMirrors.map(t => t.id));
    }

    // Disparar evento para forçar refetch
    window.dispatchEvent(new CustomEvent('task-updated'));
    addActivity("recurrent_reset", "Tarefas recorrentes resetadas");
    toast({
      title: "Tarefas resetadas",
      description: `${successCount} tarefa(s) recorrente(s) resetada(s) com próxima data calculada`
    });
    onBoardRefresh();
  }, [columns, toast, addActivity, onBoardRefresh]);

  const handleResetDaily = useCallback(async () => {
    if (!columns.length) return;

    // Identificar coluna "Recorrente" (se existir)
    const recurrentColumn = columns.find(col => col.name.toLowerCase() === "recorrente");

    // Identificar coluna "A Fazer" (destino padrão)
    const targetColumn = columns.find(col => col.name === "A Fazer") || columns[0];

    const excludeIds = recurrentColumn ? [recurrentColumn.id] : [];
    await resetAllTasksToFirstColumn(targetColumn.id, excludeIds);
    addActivity("daily_reset", "Kanban Diário resetado");
    toast({
      title: "Kanban resetado",
      description: "Todas as tarefas (exceto recorrentes) foram movidas"
    });
    onBoardRefresh();
  }, [columns, resetAllTasksToFirstColumn, addActivity, toast, onBoardRefresh]);

  return {
    handleResetRecurrentTasks,
    handleResetDaily
  };
}
