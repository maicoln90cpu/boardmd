import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useToast } from "@/hooks/ui/useToast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
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

/**
 * Hook para reset de tarefas recorrentes
 *
 * Lógica:
 * - Busca tarefas com recurrence_rule que estão completadas OU com due_date no passado
 * - Completadas: reseta is_completed + avança due_date
 * - Não completadas com due_date passado: apenas avança due_date
 */
export function useTaskReset({
  columns,
  resetAllTasksToFirstColumn,
  onBoardRefresh,
}: UseTaskResetProps) {
  const { toast } = useToast();
  const { addActivity } = useActivityLog();
  const queryClient = useQueryClient();

  const handleResetRecurrentTasks = useCallback(async () => {
    // Buscar APENAS tarefas recorrentes completadas (riscadas)
    const { data: completedTasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, title, is_completed, recurrence_rule, due_date")
      .eq("is_completed", true)
      .not("recurrence_rule", "is", null);

    if (fetchError) {
      logger.error("[RESET] Erro ao buscar tarefas recorrentes:", fetchError);
      toast({ title: "Erro ao buscar tarefas", description: fetchError.message, variant: "destructive" });
      return;
    }

    if (!completedTasks || completedTasks.length === 0) {
      toast({ title: "Nenhuma tarefa", description: "Não há tarefas recorrentes completadas para resetar" });
      return;
    }

    logger.log("[RESET] Tarefas recorrentes completadas encontradas:", completedTasks.length);

    // Limpar checkboxes do localStorage
    completedTasks.forEach((task) => localStorage.removeItem(`task-completed-${task.id}`));

    // Processar cada tarefa: avançar due_date e resetar is_completed
    let successCount = 0;
    for (const task of completedTasks) {
      const nextDueDate = calculateNextRecurrenceDate(task.due_date, task.recurrence_rule as any);
      const { error } = await supabase
        .from("tasks")
        .update({ due_date: nextDueDate, is_completed: false })
        .eq("id", task.id);
      if (error) {
        logger.error(`[RESET] Erro tarefa ${task.id}:`, error);
      } else {
        successCount++;
      }
    }

    // Sincronizar mirrors
    const allTaskIds = completedTasks.map((t) => t.id);
    const { data: tasksWithMirrors } = await supabase
      .from("tasks")
      .select("id, mirror_task_id")
      .in("id", allTaskIds)
      .not("mirror_task_id", "is", null);

    if (tasksWithMirrors && tasksWithMirrors.length > 0) {
      const mirrorIds = tasksWithMirrors.map((t) => t.mirror_task_id).filter(Boolean) as string[];
      await supabase.from("tasks").update({ is_completed: false }).in("id", mirrorIds);
    }

    const { data: reverseMirrors } = await supabase
      .from("tasks")
      .select("id")
      .in("mirror_task_id", allTaskIds);

    if (reverseMirrors && reverseMirrors.length > 0) {
      await supabase
        .from("tasks")
        .update({ is_completed: false })
        .in("id", reverseMirrors.map((t) => t.id));
    }

    // Invalidar cache do TanStack Query para refletir na UI sem F5
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });

    addActivity("recurrent_reset", "Tarefas recorrentes resetadas globalmente");
    toast({
      title: "Tarefas resetadas",
      description: `${successCount} tarefa(s) recorrente(s) resetada(s)`,
    });
    onBoardRefresh();
  }, [toast, addActivity, onBoardRefresh, queryClient]);

  const handleResetDaily = useCallback(async () => {
    if (!columns.length) return;

    const targetColumn = columns.find((col) => col.name === "A Fazer") || columns[0];

    const { data: recurrentTasks } = await supabase
      .from("tasks")
      .select("id")
      .not("recurrence_rule", "is", null);

    const excludeTaskIds = recurrentTasks?.map((t) => t.id) || [];

    await resetAllTasksToFirstColumn(targetColumn.id, excludeTaskIds);
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    addActivity("daily_reset", "Kanban resetado (exceto recorrentes)");
    toast({ title: "Kanban resetado", description: "Tarefas não-recorrentes foram movidas" });
    onBoardRefresh();
  }, [columns, resetAllTasksToFirstColumn, addActivity, toast, onBoardRefresh, queryClient]);

  return {
    handleResetRecurrentTasks,
    handleResetDaily,
  };
}
