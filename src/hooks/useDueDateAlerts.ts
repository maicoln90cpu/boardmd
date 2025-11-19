import { useEffect, useRef } from "react";
import { Task } from "./useTasks";
import { useToast } from "./use-toast";
import { differenceInHours, differenceInMinutes, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Request browser notification permission on first call
let permissionRequested = false;
function requestNotificationPermission() {
  if (!permissionRequested && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
    permissionRequested = true;
  }
}

// Show browser notification
function showBrowserNotification(title: string, body: string, urgent: boolean = false) {
  if ("Notification" in window && Notification.permission === "granted") {
    const notification = new Notification(title, {
      body,
      icon: "/pwa-icon.png",
      badge: "/favicon.png",
      tag: "due-date-alert",
      requireInteraction: urgent,
    });

    if (!urgent) {
      setTimeout(() => notification.close(), 5000);
    }
  }
}

export function useDueDateAlerts(tasks: Task[]) {
  const { toast } = useToast();
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Request permission once
    requestNotificationPermission();

    const checkDueDates = async () => {
      const now = new Date();

      // Buscar nomes das colunas para verificar se estão concluídas
      const columnIds = [...new Set(tasks.map(t => t.column_id))];
      const { data: columnsData } = await supabase
        .from("columns")
        .select("id, name")
        .in("id", columnIds);
      
      const columnMap = new Map(columnsData?.map(c => [c.id, c.name]) || []);

      tasks.forEach((task) => {
        // Não notificar se:
        // 1. Não tem due_date
        // 2. Está na coluna "Concluído" (ou similar)
        // 3. Está marcada como concluída no localStorage
        const columnName = columnMap.get(task.column_id) || "";
        const isCompleted = columnName.toLowerCase().includes("concluí") || 
                           localStorage.getItem(`task-completed-${task.id}`) === "true";
        
        if (!task.due_date || task.column_id?.includes("done") || isCompleted) return;

        const dueDate = new Date(task.due_date);
        const taskId = task.id;

        // Se já notificou, não notificar novamente
        if (notifiedTasksRef.current.has(taskId)) return;

        // Verifica se está atrasada
        if (isPast(dueDate) && !notifiedTasksRef.current.has(`${taskId}-overdue`)) {
          toast({
            title: "⏰ Tarefa Atrasada!",
            description: `"${task.title}" já passou do prazo`,
            variant: "destructive",
          });
          showBrowserNotification(
            "⏰ Tarefa Atrasada!",
            `"${task.title}" já passou do prazo`,
            true
          );
          notifiedTasksRef.current.add(`${taskId}-overdue`);
          return;
        }

        const hoursUntilDue = differenceInHours(dueDate, now);
        const minutesUntilDue = differenceInMinutes(dueDate, now);

        // Alerta 1 hora antes
        if (minutesUntilDue <= 60 && minutesUntilDue > 0) {
          if (!notifiedTasksRef.current.has(`${taskId}-1h`)) {
            toast({
              title: "🔥 Prazo Urgente!",
              description: `"${task.title}" vence em menos de 1 hora`,
              variant: "destructive",
            });
            showBrowserNotification(
              "🔥 Prazo Urgente!",
              `"${task.title}" vence em menos de 1 hora`,
              true
            );
            notifiedTasksRef.current.add(`${taskId}-1h`);
          }
          return;
        }

        // Alerta 24 horas antes
        if (hoursUntilDue <= 24 && hoursUntilDue > 1) {
          if (!notifiedTasksRef.current.has(`${taskId}-24h`)) {
            toast({
              title: "⚠️ Prazo Próximo",
              description: `"${task.title}" vence em ${hoursUntilDue} horas`,
            });
            showBrowserNotification(
              "⚠️ Prazo Próximo",
              `"${task.title}" vence em ${hoursUntilDue} horas`,
              false
            );
            notifiedTasksRef.current.add(`${taskId}-24h`);
          }
        }
      });
    };

    // Verifica imediatamente
    checkDueDates();

    // Verifica a cada minuto
    const interval = setInterval(checkDueDates, 60000);

    return () => clearInterval(interval);
  }, [tasks, toast]);

  // Função para determinar o status de urgência
  const getTaskUrgency = (task: Task): "overdue" | "urgent" | "warning" | "normal" => {
    if (!task.due_date || task.column_id?.includes("done")) return "normal";

    const dueDate = new Date(task.due_date);
    const now = new Date();

    if (isPast(dueDate)) return "overdue";

    const minutesUntilDue = differenceInMinutes(dueDate, now);
    const hoursUntilDue = differenceInHours(dueDate, now);

    if (minutesUntilDue <= 60) return "urgent";
    if (hoursUntilDue <= 24) return "warning";

    return "normal";
  };

  return { getTaskUrgency };
}
