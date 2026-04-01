import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/ui/useToast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { TaskCompletionLog, TaskCompletionStats } from "@/types";

// Re-export for consumers
export type { TaskCompletionLog, TaskCompletionStats } from "@/types";

export const METRIC_TYPES = [
  { id: "time_minutes", name: "Tempo (minutos)", unit: "min", icon: "⏱️" },
  { id: "pages", name: "Páginas", unit: "pág", icon: "📖" },
  { id: "weight_kg", name: "Peso (kg)", unit: "kg", icon: "🏋️" },
  { id: "distance_km", name: "Distância (km)", unit: "km", icon: "🏃" },
  { id: "count", name: "Quantidade", unit: "un", icon: "🔢" },
  { id: "percentage", name: "Percentual", unit: "%", icon: "📊" },
  { id: "calories", name: "Calorias", unit: "kcal", icon: "🔥" },
  { id: "money", name: "Valor (R$)", unit: "R$", icon: "💰" },
] as const;

export function useTaskCompletionLogs(taskId?: string) {
  const [logs, setLogs] = useState<TaskCompletionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchLogs = useCallback(async (targetTaskId?: string) => {
    const id = targetTaskId || taskId;
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("task_completion_logs")
        .select("*")
        .eq("task_id", id)
        .order("completed_at", { ascending: false });

      if (error) throw error;
      setLogs((data as TaskCompletionLog[]) || []);
    } catch (error) {
      logger.error("Erro ao buscar logs:", error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const addLog = useCallback(async (
    targetTaskId: string,
    metricValue: number | null,
    metricType: string | null,
    comment: string | null
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("task_completion_logs")
        .insert({
          task_id: targetTaskId,
          user_id: user.id,
          metric_value: metricValue,
          metric_type: metricType,
          comment: comment,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      // Refresh logs if we're tracking this task
      if (targetTaskId === taskId) {
        await fetchLogs();
      }
      
      return true;
    } catch (error) {
      logger.error("Erro ao adicionar log:", error);
      toast({
        title: "Erro ao salvar registro",
        description: "Não foi possível salvar a métrica da tarefa.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, taskId, fetchLogs, toast]);

  const deleteLog = useCallback(async (logId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("task_completion_logs")
        .delete()
        .eq("id", logId);

      if (error) throw error;
      
      setLogs(prev => prev.filter(log => log.id !== logId));
      return true;
    } catch (error) {
      logger.error("Erro ao deletar log:", error);
      toast({
        title: "Erro ao excluir registro",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const getStats = useCallback((): TaskCompletionStats => {
    const totalDays = logs.length;
    const metricsWithValue = logs.filter(log => log.metric_value !== null);
    const sumMetric = metricsWithValue.reduce((sum, log) => sum + (log.metric_value || 0), 0);
    const avgMetric = metricsWithValue.length > 0 ? sumMetric / metricsWithValue.length : 0;

    return { totalDays, sumMetric, avgMetric };
  }, [logs]);

  const getMetricLabel = (metricType: string | null): { name: string; unit: string; icon: string } => {
    const found = METRIC_TYPES.find(m => m.id === metricType);
    return found || { name: "Valor", unit: "", icon: "📊" };
  };

  return {
    logs,
    loading,
    fetchLogs,
    addLog,
    deleteLog,
    getStats,
    getMetricLabel,
  };
}
