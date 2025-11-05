import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

interface TaskHistoryEntry {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  changes: Json;
  created_at: string;
}

export function useTaskHistory(taskId: string | null) {
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (taskId) {
      fetchHistory();
    } else {
      setHistory([]);
      setLoading(false);
    }
  }, [taskId]);

  const fetchHistory = async () => {
    if (!taskId) return;

    const { data, error } = await supabase
      .from("task_history")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setHistory(data);
    }
    setLoading(false);
  };

  const addHistoryEntry = async (taskId: string, action: string, changes: Record<string, any>) => {
    if (!user) return;

    await supabase.from("task_history").insert([{
      task_id: taskId,
      user_id: user.id,
      action,
      changes
    }]);
  };

  return { history, loading, addHistoryEntry };
}
