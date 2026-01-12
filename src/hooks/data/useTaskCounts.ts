import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
      // Query otimizada: busca apenas category_id das tarefas do usuário
      const { data, error } = await supabase
        .from("tasks")
        .select("category_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao buscar contagem de tarefas:", error);
        return;
      }

      // Agregar contagens no cliente
      const countMap = (data || []).reduce((acc, task) => {
        if (task.category_id) {
          acc[task.category_id] = (acc[task.category_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      setCounts(countMap);
      setTotalCount(data?.length || 0);
    } catch (err) {
      console.error("Erro ao processar contagem:", err);
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
