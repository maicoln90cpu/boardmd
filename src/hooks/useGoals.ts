import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { addDays, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target: number;
  current: number;
  period: "weekly" | "monthly";
  start_date: string;
  end_date: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type GoalInsert = Omit<Goal, "id" | "user_id" | "created_at" | "updated_at">;

export function useGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!user?.id,
  });

  const activeGoals = goals.filter(g => !g.is_completed && new Date(g.end_date) >= new Date());

  const createGoal = useMutation({
    mutationFn: async (goal: Omit<GoalInsert, "is_completed" | "current">) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("goals")
        .insert({
          ...goal,
          user_id: user.id,
          current: 0,
          is_completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar meta: " + error.message);
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Goal> & { id: string }) => {
      const { data, error } = await supabase
        .from("goals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const incrementGoal = useMutation({
    mutationFn: async (goalId: string) => {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) throw new Error("Meta não encontrada");

      const newCurrent = goal.current + 1;
      const isCompleted = newCurrent >= goal.target;

      const { data, error } = await supabase
        .from("goals")
        .update({ 
          current: newCurrent,
          is_completed: isCompleted 
        })
        .eq("id", goalId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, justCompleted: isCompleted && !goal.is_completed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      if (data.justCompleted) {
        toast.success("🎉 Meta concluída! Parabéns!");
      }
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta excluída");
    },
  });

  const getDefaultDates = (period: "weekly" | "monthly") => {
    const today = new Date();
    if (period === "weekly") {
      return {
        start_date: startOfWeek(today, { weekStartsOn: 1 }).toISOString().split("T")[0],
        end_date: endOfWeek(today, { weekStartsOn: 1 }).toISOString().split("T")[0],
      };
    }
    return {
      start_date: startOfMonth(today).toISOString().split("T")[0],
      end_date: endOfMonth(today).toISOString().split("T")[0],
    };
  };

  return {
    goals,
    activeGoals,
    isLoading,
    createGoal,
    updateGoal,
    incrementGoal,
    deleteGoal,
    getDefaultDates,
  };
}
