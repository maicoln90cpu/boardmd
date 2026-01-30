import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Hook to handle notification action messages from service worker
 * Handles task complete, snooze, and navigation actions
 */
export function useNotificationActions() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle messages from service worker
    const handleServiceWorkerMessage = async (event: MessageEvent) => {
      const { type, taskId, action, url } = event.data || {};

      if (type === "TASK_ACTION" && taskId) {
        if (action === "complete") {
          await completeTask(taskId);
        } else if (action === "snooze") {
          await snoozeTask(taskId);
        }
      }

      if (type === "NAVIGATE_TO" && url) {
        navigate(url);
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    // Handle URL params for task actions (when app was closed)
    const urlParams = new URLSearchParams(location.search);
    const completeTaskId = urlParams.get("complete_task");
    const snoozeTaskId = urlParams.get("snooze_task");

    if (completeTaskId) {
      completeTask(completeTaskId);
      // Clean up URL
      urlParams.delete("complete_task");
      navigate({ search: urlParams.toString() }, { replace: true });
    }

    if (snoozeTaskId) {
      snoozeTask(snoozeTaskId);
      // Clean up URL
      urlParams.delete("snooze_task");
      navigate({ search: urlParams.toString() }, { replace: true });
    }

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [navigate, location.search]);

  return null;
}

async function completeTask(taskId: string) {
  try {
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: true })
      .eq("id", taskId);

    if (error) throw error;

    toast.success("Tarefa concluída!", {
      description: "A tarefa foi marcada como concluída.",
    });

    // Emit event for other components to update
    window.dispatchEvent(new CustomEvent("task-updated", { detail: { taskId } }));
  } catch (error) {
    console.error("Error completing task from notification:", error);
    toast.error("Erro ao concluir tarefa");
  }
}

async function snoozeTask(taskId: string) {
  try {
    // Get current task
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("due_date")
      .eq("id", taskId)
      .single();

    if (fetchError) throw fetchError;

    // Add 1 hour to due date
    const currentDueDate = task.due_date ? new Date(task.due_date) : new Date();
    const newDueDate = new Date(currentDueDate.getTime() + 60 * 60 * 1000);

    const { error } = await supabase
      .from("tasks")
      .update({ due_date: newDueDate.toISOString() })
      .eq("id", taskId);

    if (error) throw error;

    toast.success("Tarefa adiada!", {
      description: "A tarefa foi adiada por 1 hora.",
    });

    // Emit event for other components to update
    window.dispatchEvent(new CustomEvent("task-updated", { detail: { taskId } }));
  } catch (error) {
    console.error("Error snoozing task from notification:", error);
    toast.error("Erro ao adiar tarefa");
  }
}
