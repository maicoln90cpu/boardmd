import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { logger } from "@/lib/logger";

/**
 * Hook para integrar metas com tarefas
 * Escuta mudanças nas tarefas e incrementa automaticamente as metas com auto_increment
 */
export function useGoalTaskIntegration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastProcessedRef = useRef<Set<string>>(new Set());

  const incrementAutoGoals = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Buscar metas ativas com auto_increment
      const { data: goals, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("auto_increment", true)
        .eq("is_completed", false)
        .gte("end_date", new Date().toISOString().split("T")[0]);

      if (goalsError || !goals || goals.length === 0) return;

      // Incrementar cada meta
      for (const goal of goals) {
        const newCurrent = goal.current + 1;
        const isCompleted = newCurrent >= goal.target;

        await supabase
          .from("goals")
          .update({ 
            current: newCurrent,
            is_completed: isCompleted 
          })
          .eq("id", goal.id);

        if (isCompleted) {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#10B981', '#34D399', '#6EE7B7', '#FFD700'],
          });
          toast.success(`🎉 Meta "${goal.title}" concluída!`);
        }
      }

      // Invalidar cache de metas
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    } catch (error) {
      logger.error("Error incrementing auto goals:", error);
    }
  }, [user?.id, queryClient]);

  useEffect(() => {
    if (!user?.id) return;

    // Subscrever a mudanças na tabela de tarefas
    const channel = supabase
      .channel("goal-task-integration")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const oldTask = payload.old as { id: string; is_completed?: boolean };
          const newTask = payload.new as { id: string; is_completed?: boolean };

          // Verificar se a tarefa foi marcada como concluída
          if (!oldTask.is_completed && newTask.is_completed) {
            // Evitar processar a mesma tarefa múltiplas vezes
            if (lastProcessedRef.current.has(newTask.id)) return;
            lastProcessedRef.current.add(newTask.id);

            // Limpar após 5 segundos para permitir reprocessamento futuro
            setTimeout(() => {
              lastProcessedRef.current.delete(newTask.id);
            }, 5000);

            await incrementAutoGoals();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, incrementAutoGoals]);

  return { incrementAutoGoals };
}
