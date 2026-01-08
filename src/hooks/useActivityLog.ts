import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityLogEntry {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export function useActivityLog() {
  const { user } = useAuth();
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar logs do banco de dados
  useEffect(() => {
    if (!user) {
      setActivityLog([]);
      setLoading(false);
      return;
    }

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("id, action, details, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setActivityLog(
          data.map((log) => ({
            id: log.id,
            action: log.action,
            details: typeof log.details === 'object' 
              ? (log.details as any).message || JSON.stringify(log.details)
              : String(log.details),
            timestamp: log.created_at,
          }))
        );
      }
      setLoading(false);
    };

    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("activity_log_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newLog = payload.new as any;
          setActivityLog((prev) => [
            {
              id: newLog.id,
              action: newLog.action,
              details: typeof newLog.details === 'object'
                ? newLog.details.message || JSON.stringify(newLog.details)
                : String(newLog.details),
              timestamp: newLog.created_at,
            },
            ...prev.slice(0, 49),
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addActivity = useCallback(async (action: string, details: string) => {
    if (!user) return;

    const { error } = await supabase.from("activity_log").insert({
      user_id: user.id,
      action,
      details: { message: details },
    });

    if (error) {
      console.error("Error adding activity log:", error);
    }
  }, [user]);

  const clearActivity = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from("activity_log")
      .delete()
      .eq("user_id", user.id);

    if (!error) {
      setActivityLog([]);
    }
  }, [user]);

  return { activityLog, addActivity, clearActivity, loading };
}
