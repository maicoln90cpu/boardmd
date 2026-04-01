import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/ui/useToast";
import { supabase } from "@/integrations/supabase/client";

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string;
  what_did: string;
  what_learned: string;
  what_improve: string;
  next_week_plan: string;
  mood: number | null;
  created_at: string;
  updated_at: string;
}

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function useWeeklyReviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("weekly_reviews")
      .select("*")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(20);
    if (data) setReviews(data as WeeklyReview[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchReviews().finally(() => setLoading(false));
  }, [user, fetchReviews]);

  const saveReview = useCallback(async (review: {
    week_start: string;
    what_did: string;
    what_learned: string;
    what_improve: string;
    next_week_plan: string;
    mood: number;
  }) => {
    if (!user) return;
    
    const existing = reviews.find(r => r.week_start === review.week_start);
    
    if (existing) {
      const { error } = await supabase
        .from("weekly_reviews")
        .update({ ...review, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) {
        toast({ title: "Erro ao salvar retrospectiva", variant: "destructive" });
      } else {
        toast({ title: "Retrospectiva atualizada!" });
        fetchReviews();
      }
    } else {
      const { error } = await supabase.from("weekly_reviews").insert({
        ...review,
        user_id: user.id,
      });
      if (error) {
        toast({ title: "Erro ao salvar retrospectiva", variant: "destructive" });
      } else {
        toast({ title: "Retrospectiva salva!" });
        fetchReviews();
      }
    }
  }, [user, reviews, toast, fetchReviews]);

  const getCurrentWeekStart = useCallback(() => getWeekStart(), []);

  const getReviewForWeek = useCallback((weekStart: string) => {
    return reviews.find(r => r.week_start === weekStart) || null;
  }, [reviews]);

  return {
    reviews,
    loading,
    saveReview,
    getCurrentWeekStart,
    getReviewForWeek,
    refresh: fetchReviews,
  };
}
