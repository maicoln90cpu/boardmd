import { useEffect, useRef } from "react";
import { Task } from "./useTasks";
import { useToast } from "./use-toast";
import { differenceInHours, differenceInMinutes, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "./useSettings";

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

// Persistence utilities for notification state
const STORAGE_KEY = "due-date-notifications";

type NotificationEntry = {
  key: string;
  timestamp: number;
};

function loadNotifiedSet(snoozeMinutes: number): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    
    const parsed: NotificationEntry[] = JSON.parse(raw);
    const now = Date.now();
    const snoozeMs = snoozeMinutes * 60 * 1000;

    // Only keep entries within snooze window
    return new Set(
      parsed
        .filter(entry => now - entry.timestamp < snoozeMs)
        .map(entry => entry.key)
    );
  } catch {
    return new Set();
  }
}

function saveNotifiedSet(set: Set<string>) {
  try {
    const now = Date.now();
    const entries: NotificationEntry[] = Array.from(set).map(key => ({
      key,
      timestamp: now,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Failed to save notification state:", error);
  }
}

// Pure function to calculate task urgency (no side effects)
export function getTaskUrgency(task: Task): "overdue" | "urgent" | "warning" | "normal" {
  if (!task.due_date || task.column_id?.includes("done")) return "normal";

  const dueDate = new Date(task.due_date);
  const now = new Date();

  if (isPast(dueDate)) return "overdue";

  const minutesUntilDue = differenceInMinutes(dueDate, now);
  const hoursUntilDue = differenceInHours(dueDate, now);

  if (minutesUntilDue <= 60) return "urgent";
  if (hoursUntilDue <= 24) return "warning";

  return "normal";
}

export function useDueDateAlerts(tasks: Task[]) {
  const { toast } = useToast();
  const { settings } = useSettings();
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Não executar se notificações estão desabilitadas
    if (!settings.notifications.dueDate) return;

    // Request permission once
    requestNotificationPermission();

    // Load persisted notification state with snooze
    const snoozeMinutes = settings.notifications.snoozeMinutes || 30;
    notifiedTasksRef.current = loadNotifiedSet(snoozeMinutes);

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
        
        if (!task.due_date || task.column_id?.includes("done") || isCompleted) {
          // Limpar notificações antigas quando tarefa está concluída
          const taskId = task.id;
          notifiedTasksRef.current.delete(`${taskId}-early`);
          notifiedTasksRef.current.delete(`${taskId}-warning`);
          notifiedTasksRef.current.delete(`${taskId}-urgent`);
          notifiedTasksRef.current.delete(`${taskId}-overdue`);
          saveNotifiedSet(notifiedTasksRef.current);
          return;
        }

        const dueDate = new Date(task.due_date);
        const taskId = task.id;
        const minutesUntilDue = differenceInMinutes(dueDate, now);

        // Configurações
        const configuredHours = settings.notifications.dueDateHours || 24;
        const urgentThreshold = 60; // Fixo: 1 hora em minutos
        const warningThreshold = configuredHours * 60; // Configurável em minutos
        const earlyThreshold = warningThreshold * 2; // Dobro do configurado

        // Verifica se está atrasada
        if (isPast(dueDate)) {
          if (!notifiedTasksRef.current.has(`${taskId}-overdue`)) {
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
            saveNotifiedSet(notifiedTasksRef.current);
          }
          return;
        }

        // Nível 3: Alerta urgente (1 hora antes)
        if (minutesUntilDue <= urgentThreshold && minutesUntilDue > 0) {
          if (!notifiedTasksRef.current.has(`${taskId}-urgent`)) {
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
            notifiedTasksRef.current.add(`${taskId}-urgent`);
            saveNotifiedSet(notifiedTasksRef.current);
          }
          return;
        }

        // Nível 2: Alerta de aviso (horas configuradas)
        if (minutesUntilDue <= warningThreshold && minutesUntilDue > urgentThreshold) {
          if (!notifiedTasksRef.current.has(`${taskId}-warning`)) {
            const hoursUntilDue = Math.floor(minutesUntilDue / 60);
            toast({
              title: "⚠️ Prazo Próximo",
              description: `"${task.title}" vence em ${hoursUntilDue} hora${hoursUntilDue > 1 ? 's' : ''}`,
            });
            showBrowserNotification(
              "⚠️ Prazo Próximo",
              `"${task.title}" vence em ${hoursUntilDue} hora${hoursUntilDue > 1 ? 's' : ''}`,
              false
            );
            notifiedTasksRef.current.add(`${taskId}-warning`);
            saveNotifiedSet(notifiedTasksRef.current);
          }
          return;
        }

        // Nível 1: Alerta antecipado (dobro das horas configuradas)
        if (minutesUntilDue <= earlyThreshold && minutesUntilDue > warningThreshold) {
          if (!notifiedTasksRef.current.has(`${taskId}-early`)) {
            const hoursUntilDue = Math.floor(minutesUntilDue / 60);
            toast({
              title: "📅 Prazo se Aproximando",
              description: `"${task.title}" vence em ${hoursUntilDue} horas`,
            });
            showBrowserNotification(
              "📅 Prazo se Aproximando",
              `"${task.title}" vence em ${hoursUntilDue} horas`,
              false
            );
            notifiedTasksRef.current.add(`${taskId}-early`);
            saveNotifiedSet(notifiedTasksRef.current);
          }
        }
      });
    };

    // Verifica imediatamente
    checkDueDates();

    // Item 4: Usar checkInterval configurado (em minutos)
    const checkIntervalMs = (settings.notifications.checkInterval || 15) * 60000;
    const interval = setInterval(checkDueDates, checkIntervalMs);

    return () => clearInterval(interval);
  }, [tasks, toast, settings.notifications]);
}
