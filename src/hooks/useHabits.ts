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

  const fetchHabits = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (data) setHabits(data as Habit[]);
  }, [user]);

  const fetchCheckins = useCallback(async () => {
    if (!user) return;
    // Fetch last 90 days of checkins
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const { data } = await supabase
      .from("habit_checkins")
      .select("*")
      .eq("user_id", user.id)
      .gte("checked_date", since.toISOString().split("T")[0]);
    if (data) setCheckins(data as HabitCheckin[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchHabits(), fetchCheckins()]).finally(() => setLoading(false));
  }, [user, fetchHabits, fetchCheckins]);

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
    const { error } = await supabase.from("habits").delete().eq("id", id);
    if (!error) {
      setHabits(prev => prev.filter(h => h.id !== id));
      setCheckins(prev => prev.filter(c => c.habit_id !== id));
    }
  }, []);

  const toggleCheckin = useCallback(async (habitId: string, date: string) => {
    if (!user) return;
    const existing = checkins.find(c => c.habit_id === habitId && c.checked_date === date);
    if (existing) {
      await supabase.from("habit_checkins").delete().eq("id", existing.id);
      setCheckins(prev => prev.filter(c => c.id !== existing.id));
    } else {
      const { data } = await supabase.from("habit_checkins").insert({
        habit_id: habitId,
        user_id: user.id,
        checked_date: date,
      }).select().single();
      if (data) setCheckins(prev => [...prev, data as HabitCheckin]);
    }
  }, [user, checkins]);

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
