import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/useToast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { calculateNextRecurrenceDate } from "@/lib/recurrenceUtils";
import { logger } from "@/lib/logger";

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
 * NOVA LÓGICA (pós-remoção do Diário):
 * - Busca TODAS tarefas com recurrence_rule globalmente
 * - Não depende mais da coluna "Recorrente"
 * - Reset aplica apenas em tarefas com is_completed = true
 */
export function useTaskReset({
  columns,
  resetAllTasksToFirstColumn,
  onBoardRefresh
}: UseTaskResetProps) {
  const { toast } = useToast();
  const { addActivity } = useActivityLog();

  /**
   * Reseta TODAS as tarefas recorrentes (com recurrence_rule) que estão completadas.
   * Busca global - não depende de coluna específica.
   */
  const handleResetRecurrentTasks = useCallback(async () => {
    // Buscar TODAS as tarefas recorrentes completadas (global)
    const { data: recurrentTasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, title, is_completed, recurrence_rule, due_date")
      .eq("is_completed", true)
      .not("recurrence_rule", "is", null);
    
    if (fetchError) {
      logger.error("[RESET] Erro ao buscar tarefas recorrentes:", fetchError);
      toast({
        title: "Erro ao buscar tarefas",
        description: fetchError.message,
        variant: "destructive"
      });
      return;
    }

    if (!recurrentTasks || recurrentTasks.length === 0) {
      toast({
        title: "Nenhuma tarefa",
        description: "Não há tarefas recorrentes completadas para resetar"
      });
      return;
    }
    
    logger.log("[RESET] Tarefas recorrentes completadas encontradas:", recurrentTasks.length);

    // Limpar checkboxes do localStorage
    recurrentTasks.forEach(task => {
      localStorage.removeItem(`task-completed-${task.id}`);
    });

    // Preparar batch updates por data de próxima recorrência
    const updatesByNextDate: Record<string, string[]> = {};
    recurrentTasks.forEach(task => {
      const nextDueDate = calculateNextRecurrenceDate(task.due_date, task.recurrence_rule as any);
      const dateKey = nextDueDate || 'null';
      if (!updatesByNextDate[dateKey]) {
        updatesByNextDate[dateKey] = [];
      }
      updatesByNextDate[dateKey].push(task.id);
    });

    // Batch update para cada grupo de data
    // IMPORTANTE: Apenas atualizamos is_completed e due_date
    // NÃO tocamos em track_metrics, track_comments, metric_type para preservar configuração do usuário
    let successCount = 0;
    for (const [dateKey, taskIds] of Object.entries(updatesByNextDate)) {
      const nextDueDate = dateKey === 'null' ? null : dateKey;
      const { error } = await supabase
        .from("tasks")
        .update({
          is_completed: false,
          due_date: nextDueDate
          // Campos preservados: track_metrics, track_comments, metric_type
        })
        .in("id", taskIds);
      
      if (error) {
        logger.error("[RESET] Erro batch update:", error);
      } else {
        successCount += taskIds.length;
      }
    }

    // Sincronização bidirecional - batch para mirrors (manter compatibilidade)
    const allTaskIds = recurrentTasks.map(t => t.id);
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
    addActivity("recurrent_reset", "Tarefas recorrentes resetadas globalmente");
    toast({
      title: "Tarefas resetadas",
      description: `${successCount} tarefa(s) recorrente(s) resetada(s)`
    });
    onBoardRefresh();
  }, [toast, addActivity, onBoardRefresh]);

  /**
   * Reseta o Kanban movendo tarefas para a primeira coluna.
   * Exclui tarefas recorrentes (por recurrence_rule).
   */
  const handleResetDaily = useCallback(async () => {
    if (!columns.length) return;

    // Identificar coluna "A Fazer" (destino padrão)
    const targetColumn = columns.find(col => col.name === "A Fazer") || columns[0];

    // Buscar IDs de tarefas recorrentes para excluir do reset
    const { data: recurrentTasks } = await supabase
      .from("tasks")
      .select("id")
      .not("recurrence_rule", "is", null);

    const excludeTaskIds = recurrentTasks?.map(t => t.id) || [];

    // Mover apenas tarefas não-recorrentes
    await resetAllTasksToFirstColumn(targetColumn.id, excludeTaskIds);
    addActivity("daily_reset", "Kanban resetado (exceto recorrentes)");
    toast({
      title: "Kanban resetado",
      description: "Tarefas não-recorrentes foram movidas"
    });
    onBoardRefresh();
  }, [columns, resetAllTasksToFirstColumn, addActivity, toast, onBoardRefresh]);

  return {
    handleResetRecurrentTasks,
    handleResetDaily
  };
}
