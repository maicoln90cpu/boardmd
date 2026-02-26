import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/ui/useToast";
import { sendPushWithTemplate } from "@/lib/notifications/pushHelper";

export interface UserStats {
  id: string;
  user_id: string;
  total_points: number;
  tasks_completed_today: number;
  tasks_completed_week: number;
  current_streak: number;
  best_streak: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export function useUserStats() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["user-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      // Se não existir, criar
      if (!data) {
        const { data: newStats, error: insertError } = await supabase
          .from("user_stats")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newStats as UserStats;
      }

      return data as UserStats;
    },
    enabled: !!user?.id,
  });

  const updateStatsMutation = useMutation({
    mutationFn: async (updates: Partial<UserStats>) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_stats")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar estatísticas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addTaskCompletion = () => {
    if (!stats) return;

    const points = 10; // 10 pontos por tarefa
    const newTotal = stats.total_points + points;
    const newLevel = Math.floor(newTotal / 100) + 1; // A cada 100 pontos = 1 nível

    updateStatsMutation.mutate({
      total_points: newTotal,
      tasks_completed_today: stats.tasks_completed_today + 1,
      tasks_completed_week: stats.tasks_completed_week + 1,
      level: newLevel,
    });

    if (newLevel > stats.level) {
      toast({
        title: "🎉 Nível Aumentado!",
        description: `Parabéns! Você chegou ao nível ${newLevel}`,
      });

      // Push notification de nível (respects template enabled)
      if (user?.id) {
        sendPushWithTemplate({
          userId: user.id,
          templateId: 'achievement_level',
          variables: { level: String(newLevel) },
          dedupKey: `achievement_level:${newLevel}`,
          triggerSource: 'achievement',
          extraData: { points },
        });
      }
    }
  };

  const updateStreak = (completed: boolean) => {
    if (!stats) return;

    if (completed) {
      const newStreak = stats.current_streak + 1;
      updateStatsMutation.mutate({
        current_streak: newStreak,
        best_streak: Math.max(newStreak, stats.best_streak),
      });

      // Push notification de streak a cada 5 dias (respects template enabled)
      if (newStreak > 0 && newStreak % 5 === 0 && user?.id) {
        sendPushWithTemplate({
          userId: user.id,
          templateId: 'achievement_streak',
          variables: { streakDays: String(newStreak) },
          dedupKey: `achievement_streak:${newStreak}`,
          triggerSource: 'achievement',
          extraData: { points: newStreak * 5 },
        });
      }
    } else {
      updateStatsMutation.mutate({
        current_streak: 0,
      });
    }
  };

  return {
    stats,
    isLoading,
    addTaskCompletion,
    updateStreak,
    updateStats: updateStatsMutation.mutate,
  };
}
