import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/ui/useToast";

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  frequency: string;
  color: string;
  icon: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitCheckin {
  id: string;
  habit_id: string;
  user_id: string;
  checked_date: string;
  created_at: string;
}

export function useHabits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<HabitCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_habits_with_checkins', {
        p_user_id: user.id,
      });

      if (error) {
        toast({ title: "Erro ao carregar hábitos", variant: "destructive" });
        return;
      }

      const habitsMap = new Map<string, Habit>();
      const checkinsList: HabitCheckin[] = [];

      for (const row of (data || []) as any[]) {
        if (!habitsMap.has(row.habit_id)) {
          habitsMap.set(row.habit_id, {
            id: row.habit_id,
            user_id: user.id,
            name: row.habit_name,
            frequency: row.frequency,
            color: row.color,
            icon: row.icon,
            is_archived: row.is_archived,
            created_at: row.habit_created_at,
            updated_at: row.habit_updated_at,
          });
        }
        if (row.checkin_id) {
          checkinsList.push({
            id: row.checkin_id,
            habit_id: row.habit_id,
            user_id: user.id,
            checked_date: row.checked_date,
            created_at: row.checkin_created_at,
          });
        }
      }

      setHabits(Array.from(habitsMap.values()));
      setCheckins(checkinsList);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addHabit = useCallback(async (name: string, color: string, icon: string) => {
    if (!user) return;
    const { error } = await supabase.from("habits").insert({
      user_id: user.id,
      name,
      color,
      icon,
    });
    if (error) {
      toast({ title: "Erro ao criar hábito", variant: "destructive" });
    } else {
      toast({ title: "Hábito criado!" });
      fetchHabits();
    }
  }, [user, toast, fetchHabits]);

  const deleteHabit = useCallback(async (id: string) => {
    // Optimistic update
    const previousHabits = habits;
    const previousCheckins = checkins;
    setHabits(prev => prev.filter(h => h.id !== id));
    setCheckins(prev => prev.filter(c => c.habit_id !== id));

    try {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Hábito excluído" });
    } catch (error) {
      // Rollback
      setHabits(previousHabits);
      setCheckins(previousCheckins);
      toast({ title: "Erro ao excluir hábito", variant: "destructive" });
    }
  }, [habits, checkins, toast]);

  const toggleCheckin = useCallback(async (habitId: string, date: string) => {
    if (!user) return;
    const existing = checkins.find(c => c.habit_id === habitId && c.checked_date === date);

    if (existing) {
      // Optimistic remove
      const previousCheckins = checkins;
      setCheckins(prev => prev.filter(c => c.id !== existing.id));

      try {
        const { error } = await supabase.from("habit_checkins").delete().eq("id", existing.id);
        if (error) throw error;
      } catch {
        setCheckins(previousCheckins);
        toast({ title: "Erro ao remover check-in", variant: "destructive" });
      }
    } else {
      // Optimistic add with temp id
      const tempCheckin: HabitCheckin = {
        id: `temp-${Date.now()}`,
        habit_id: habitId,
        user_id: user.id,
        checked_date: date,
        created_at: new Date().toISOString(),
      };
      setCheckins(prev => [...prev, tempCheckin]);

      try {
        const { data, error } = await supabase.from("habit_checkins").insert({
          habit_id: habitId,
          user_id: user.id,
          checked_date: date,
        }).select().single();
        if (error) throw error;
        // Replace temp with real
        setCheckins(prev => prev.map(c => c.id === tempCheckin.id ? (data as HabitCheckin) : c));
      } catch {
        setCheckins(prev => prev.filter(c => c.id !== tempCheckin.id));
        toast({ title: "Erro ao registrar check-in", variant: "destructive" });
      }
    }
  }, [user, checkins, toast]);

  const getStreak = useCallback((habitId: string) => {
    const habitCheckins = checkins
      .filter(c => c.habit_id === habitId)
      .map(c => c.checked_date)
      .sort()
      .reverse();
    
    if (habitCheckins.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i <= 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      if (habitCheckins.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }, [checkins]);

  const isCheckedToday = useCallback((habitId: string) => {
    const today = new Date().toISOString().split("T")[0];
    return checkins.some(c => c.habit_id === habitId && c.checked_date === today);
  }, [checkins]);

  return {
    habits: habits.filter(h => !h.is_archived),
    checkins,
    loading,
    addHabit,
    deleteHabit,
    toggleCheckin,
    getStreak,
    isCheckedToday,
    refresh: () => Promise.all([fetchHabits(), fetchCheckins()]),
  };
}
