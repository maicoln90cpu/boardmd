import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Hook otimizado para contagem de tarefas por categoria
 * Usa query agregada em vez de carregar todas as tarefas
 */
export function useTaskCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCounts = useCallback(async () => {
    if (!user) {
      setCounts({});
      setTotalCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_task_counts_by_category', {
        p_user_id: user.id,
      });

      if (error) {
        logger.error("Erro ao buscar contagem de tarefas:", error);
        return;
      }

      const countMap: Record<string, number> = {};
      let total = 0;
      for (const row of (data || []) as any[]) {
        countMap[row.category_id] = Number(row.task_count);
        total += Number(row.task_count);
      }

      setCounts(countMap);
      setTotalCount(total);
    } catch (err) {
      logger.error("Erro ao processar contagem:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();

    // Subscription para atualizar contagens em tempo real
    const channel = supabase
      .channel("task-counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          // Refetch counts quando houver mudanças
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCounts]);

  return { counts, totalCount, loading, refetch: fetchCounts };
}
