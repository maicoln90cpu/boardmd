import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/ui/useToast";
import { logger } from "@/lib/logger";
import { calculateNextRecurrenceDate, RecurrenceRule } from "@/lib/recurrenceUtils";
import { formatDateTimeBR } from "@/lib/dateUtils";

/**
 * Hook centralizado para mutações de tarefas via Supabase.
 * Substitui chamadas inline de supabase.from("tasks") em componentes.
 */
export function useTaskMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }, [queryClient]);

  /** Toggle is_completed + sync mirrors bidirecionais */
  const toggleComplete = useCallback(
    async (taskId: string, completed: boolean, mirrorTaskId?: string | null) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: completed })
        .eq("id", taskId);
      if (error) throw error;

      // Sync mirrors bidirecionais
      if (mirrorTaskId) {
        await supabase
          .from("tasks")
          .update({ is_completed: completed })
          .eq("id", mirrorTaskId);
      }

      const { data: reverseMirrors } = await supabase
        .from("tasks")
        .select("id")
        .eq("mirror_task_id", taskId);

      if (reverseMirrors && reverseMirrors.length > 0) {
        await supabase
          .from("tasks")
          .update({ is_completed: completed })
          .in(
            "id",
            reverseMirrors.map((t) => t.id),
          );
      }

      invalidateTasks();
    },
    [invalidateTasks],
  );

  /** Mover tarefa para outra coluna */
  const moveToColumn = useCallback(
    async (taskId: string, columnId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ column_id: columnId })
        .eq("id", taskId);
      if (error) throw error;

      invalidateTasks();
    },
    [invalidateTasks],
  );

  /**
   * Reset imediato de tarefa recorrente:
   * Calcula próxima due_date, seta is_completed=false, sincroniza mirrors.
   * Retorna a próxima data calculada para exibição no toast.
   */
  const immediateRecurrenceReset = useCallback(
    async (
      taskId: string,
      dueDate: string | null,
      recurrenceRule: RecurrenceRule | null,
      mirrorTaskId?: string | null,
    ): Promise<string> => {
      const nextDueDate = calculateNextRecurrenceDate(dueDate, recurrenceRule);

      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: false, due_date: nextDueDate })
        .eq("id", taskId);
      if (error) throw error;

      // Sync mirror
      if (mirrorTaskId) {
        await supabase
          .from("tasks")
          .update({ is_completed: false, due_date: nextDueDate })
          .eq("id", mirrorTaskId);
      }

      invalidateTasks();
      return nextDueDate;
    },
    [invalidateTasks],
  );

  /** Reset imediato com toast e feedback visual */
  const immediateRecurrenceResetWithToast = useCallback(
    async (
      taskId: string,
      dueDate: string | null,
      recurrenceRule: RecurrenceRule | null,
      mirrorTaskId?: string | null,
    ): Promise<string | null> => {
      try {
        const nextDueDate = await immediateRecurrenceReset(
          taskId,
          dueDate,
          recurrenceRule,
          mirrorTaskId,
        );
        toast({
          title: "✓ Tarefa concluída e resetada",
          description: `Próxima: ${formatDateTimeBR(new Date(nextDueDate))}`,
        });
        return nextDueDate;
      } catch (error) {
        logger.error("Erro ao resetar tarefa recorrente:", error);
        toast({
          title: "Erro ao resetar tarefa",
          description: "Não foi possível calcular a próxima data.",
          variant: "destructive",
        });
        return null;
      }
    },
    [immediateRecurrenceReset, toast],
  );

  /** Toggle simples de conclusão com toast (usado no mobile checklist) */
  const toggleCompleteWithToast = useCallback(
    async (taskId: string, currentCompleted: boolean, onAddPoints?: () => void) => {
      try {
        const newCompleted = !currentCompleted;
        await toggleComplete(taskId, newCompleted);
        if (newCompleted && onAddPoints) onAddPoints();
        toast({
          title: newCompleted ? "Tarefa concluída!" : "Tarefa reaberta",
          duration: 1500,
        });
      } catch (error) {
        logger.error("Erro ao atualizar tarefa:", error);
        toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
      }
    },
    [toggleComplete, toast],
  );

  /** Mover tarefa com toast e feedback (usado no mobile drawer) */
  const moveToColumnWithToast = useCallback(
    async (taskId: string, columnId: string, columnName?: string) => {
      try {
        await moveToColumn(taskId, columnId);
        toast({
          title: `Movida para "${columnName || "coluna"}"`,
          duration: 1500,
        });
      } catch (error) {
        logger.error("Erro ao mover tarefa:", error);
        toast({ title: "Erro ao mover tarefa", variant: "destructive" });
      }
    },
    [moveToColumn, toast],
  );

  return {
    toggleComplete,
    toggleCompleteWithToast,
    moveToColumn,
    moveToColumnWithToast,
    immediateRecurrenceReset,
    immediateRecurrenceResetWithToast,
    invalidateTasks,
  };
}
