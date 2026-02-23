import { useEffect, useRef, useCallback } from "react";
import { Task } from "@/hooks/tasks/useTasks";
import { useToast } from "@/hooks/ui/useToast";
import { differenceInHours, differenceInMinutes, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/data/useSettings";
import { logger } from "@/lib/logger";
import { oneSignalNotifier } from "@/lib/notifications/oneSignalNotifier";
import {
  defaultNotificationTemplates,
  formatNotificationTemplate,
  getTemplateById,
} from "@/lib/defaultNotificationTemplates";

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
const PUSH_STORAGE_KEY = "due-date-push-timestamps";

type NotificationEntry = {
  key: string;
  timestamp: number;
};

type PushTimestampEntry = {
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
    logger.error("Failed to save notification state:", error);
  }
}

// Push-specific dedup: minimum 4 hours between same task+level pushes
const PUSH_DEDUP_MS = 4 * 60 * 60 * 1000;

function loadPushTimestamps(): Map<string, number> {
  try {
    const raw = localStorage.getItem(PUSH_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed: PushTimestampEntry[] = JSON.parse(raw);
    const now = Date.now();
    // Clean up old entries (older than 24h)
    return new Map(
      parsed
        .filter(e => now - e.timestamp < 24 * 60 * 60 * 1000)
        .map(e => [e.key, e.timestamp])
    );
  } catch {
    return new Map();
  }
}

function savePushTimestamps(map: Map<string, number>) {
  try {
    const entries: PushTimestampEntry[] = Array.from(map.entries()).map(([key, timestamp]) => ({
      key,
      timestamp,
    }));
    localStorage.setItem(PUSH_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    logger.error("Failed to save push timestamps:", error);
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
  const toastRef = useRef(toast);
  const settingsRef = useRef(settings.notifications);
  const pendingPushesRef = useRef<Set<string>>(new Set());
  const pushTimestampsRef = useRef<Map<string, number>>(new Map());

  // Keep refs in sync without triggering effect re-runs
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    settingsRef.current = settings.notifications;
  }, [settings.notifications]);

  // Load push timestamps once on mount
  useEffect(() => {
    pushTimestampsRef.current = loadPushTimestamps();
  }, []);

  useEffect(() => {
    const notifSettings = settingsRef.current;
    
    // Não executar se notificações estão desabilitadas
    if (!notifSettings.dueDate) return;

    // Request permission once
    requestNotificationPermission();

    // Load persisted notification state with snooze
    const snoozeMinutes = notifSettings.snoozeMinutes || 30;
    notifiedTasksRef.current = loadNotifiedSet(snoozeMinutes);

    // OTIMIZAÇÃO: Cachear dados de colunas fora do loop
    let columnMapRef: Map<string, string> | null = null;
    
    const getColumnMap = async () => {
      if (columnMapRef) return columnMapRef;
      
      const columnIds = [...new Set(tasks.map(t => t.column_id))];
      const { data: columnsData } = await supabase
        .from("columns")
        .select("id, name")
        .in("id", columnIds);
      
      columnMapRef = new Map(columnsData?.map(c => [c.id, c.name]) || []);
      return columnMapRef;
    };

    const checkDueDates = async () => {
      const now = new Date();
      const currentSettings = settingsRef.current;
      const excludedColumns = currentSettings.excludedPushColumnIds || [];
      const { data: { user } } = await supabase.auth.getUser();
      const userTemplates = settings.notificationTemplates || defaultNotificationTemplates;

      const sendOneSignalPush = async (templateId: string, taskTitle: string, taskId: string, level: string) => {
        if (!user) return;
        
        // Dedup guard: check if push is already in-flight
        const pushKey = `${taskId}-${level}`;
        if (pendingPushesRef.current.has(pushKey)) return;
        
        // Dedup guard: check timestamp-based dedup (4h minimum)
        const lastPushTime = pushTimestampsRef.current.get(pushKey);
        if (lastPushTime && Date.now() - lastPushTime < PUSH_DEDUP_MS) return;
        
        // Mark as in-flight
        pendingPushesRef.current.add(pushKey);
        
        try {
          const template = getTemplateById(userTemplates, templateId);
          if (!template) return;
          const formatted = formatNotificationTemplate(template, { taskTitle });
          await oneSignalNotifier.send({
            user_id: user.id,
            title: formatted.title,
            body: formatted.body,
            notification_type: templateId,
            url: '/',
            data: { taskId },
          });
          
          // Record timestamp for dedup
          pushTimestampsRef.current.set(pushKey, Date.now());
          savePushTimestamps(pushTimestampsRef.current);
        } finally {
          pendingPushesRef.current.delete(pushKey);
        }
      };

      const columnMap = await getColumnMap();

      tasks.forEach((task) => {
        const columnName = columnMap.get(task.column_id) || "";
        const isInDoneColumn = columnName.toLowerCase().includes("concluí");
        const isCompleted = task.is_completed === true || isInDoneColumn;
        
        if (!task.due_date || task.column_id?.includes("done") || isCompleted) {
          const taskId = task.id;
          notifiedTasksRef.current.delete(`${taskId}-early`);
          notifiedTasksRef.current.delete(`${taskId}-warning`);
          notifiedTasksRef.current.delete(`${taskId}-urgent`);
          notifiedTasksRef.current.delete(`${taskId}-overdue`);
          // Clean custom reminder keys
          notifiedTasksRef.current.delete(`${taskId}-custom-0`);
          notifiedTasksRef.current.delete(`${taskId}-custom-1`);
          saveNotifiedSet(notifiedTasksRef.current);
          return;
        }

        // Check if column is excluded from push notifications
        if (excludedColumns.includes(task.column_id)) {
          return;
        }

        const dueDate = new Date(task.due_date);
        const taskId = task.id;
        const minutesUntilDue = differenceInMinutes(dueDate, now);

        // === Per-task custom reminders ===
        const taskReminders = (task as any).notification_settings?.reminders as Array<{ hours_before: number; channel: 'push' | 'whatsapp' | 'both' }> | undefined;
        
        if (taskReminders && taskReminders.length > 0) {
          // Use task-specific reminders instead of global thresholds
          
          // Still handle overdue with global logic
          if (isPast(dueDate)) {
            if (!notifiedTasksRef.current.has(`${taskId}-overdue`)) {
              toastRef.current({
                title: "⏰ Tarefa Atrasada!",
                description: `"${task.title}" já passou do prazo`,
                variant: "destructive",
              });
              showBrowserNotification("⏰ Tarefa Atrasada!", `"${task.title}" já passou do prazo`, true);
              sendOneSignalPush('due_overdue', task.title, task.id, 'overdue');
              notifiedTasksRef.current.add(`${taskId}-overdue`);
              saveNotifiedSet(notifiedTasksRef.current);
            }
            return;
          }

          // Check each custom reminder
          taskReminders.forEach((reminder, idx) => {
            const reminderMinutes = reminder.hours_before * 60;
            const reminderKey = `${taskId}-custom-${idx}`;
            
            if (minutesUntilDue <= reminderMinutes && minutesUntilDue > 0 && !notifiedTasksRef.current.has(reminderKey)) {
              const hoursUntilDue = Math.floor(minutesUntilDue / 60);
              const timeText = hoursUntilDue > 0 ? `${hoursUntilDue} hora${hoursUntilDue > 1 ? 's' : ''}` : `${minutesUntilDue} minutos`;
              
              // Send push if channel is push or both
              if (reminder.channel === 'push' || reminder.channel === 'both') {
                toastRef.current({
                  title: "🔔 Lembrete de Tarefa",
                  description: `"${task.title}" vence em ${timeText}`,
                });
                showBrowserNotification("🔔 Lembrete de Tarefa", `"${task.title}" vence em ${timeText}`, reminder.hours_before <= 1);
                sendOneSignalPush('due_warning', task.title, task.id, `custom-${idx}`);
              }
              
              // Send WhatsApp if channel is whatsapp or both
              if (reminder.channel === 'whatsapp' || reminder.channel === 'both') {
                import("@/lib/whatsappNotifier").then(({ sendWhatsAppNotification }) => {
                  if (user) {
                    sendWhatsAppNotification({
                      userId: user.id,
                      templateType: 'due_date',
                      variables: { taskTitle: task.title, timeRemaining: timeText },
                    });
                  }
                });
              }
              
              notifiedTasksRef.current.add(reminderKey);
              saveNotifiedSet(notifiedTasksRef.current);
            }
          });
          return; // Skip global thresholds for tasks with custom reminders
        }

        // === Global thresholds (fallback) ===
        const configuredHours = currentSettings.dueDateHours || 24;
        const urgentThreshold = 60;
        const warningThreshold = configuredHours * 60;
        const earlyThreshold = warningThreshold * 2;

        // Verifica se está atrasada
        if (isPast(dueDate)) {
          if (!notifiedTasksRef.current.has(`${taskId}-overdue`)) {
            toastRef.current({
              title: "⏰ Tarefa Atrasada!",
              description: `"${task.title}" já passou do prazo`,
              variant: "destructive",
            });
            showBrowserNotification("⏰ Tarefa Atrasada!", `"${task.title}" já passou do prazo`, true);
            sendOneSignalPush('due_overdue', task.title, task.id, 'overdue');
            notifiedTasksRef.current.add(`${taskId}-overdue`);
            saveNotifiedSet(notifiedTasksRef.current);
          }
          return;
        }

        // Nível 3: Alerta urgente (1 hora antes)
        if (minutesUntilDue <= urgentThreshold && minutesUntilDue > 0) {
          if (!notifiedTasksRef.current.has(`${taskId}-urgent`)) {
            toastRef.current({
              title: "🔥 Prazo Urgente!",
              description: `"${task.title}" vence em menos de 1 hora`,
              variant: "destructive",
            });
            showBrowserNotification("🔥 Prazo Urgente!", `"${task.title}" vence em menos de 1 hora`, true);
            sendOneSignalPush('due_urgent', task.title, task.id, 'urgent');
            notifiedTasksRef.current.add(`${taskId}-urgent`);
            saveNotifiedSet(notifiedTasksRef.current);
          }
          return;
        }

        // Nível 2: Alerta de aviso (horas configuradas)
        if (minutesUntilDue <= warningThreshold && minutesUntilDue > urgentThreshold) {
          if (!notifiedTasksRef.current.has(`${taskId}-warning`)) {
            const hoursUntilDue = Math.floor(minutesUntilDue / 60);
            toastRef.current({
              title: "⚠️ Prazo Próximo",
              description: `"${task.title}" vence em ${hoursUntilDue} hora${hoursUntilDue > 1 ? 's' : ''}`,
            });
            showBrowserNotification("⚠️ Prazo Próximo", `"${task.title}" vence em ${hoursUntilDue} hora${hoursUntilDue > 1 ? 's' : ''}`, false);
            sendOneSignalPush('due_warning', task.title, task.id, 'warning');
            notifiedTasksRef.current.add(`${taskId}-warning`);
            saveNotifiedSet(notifiedTasksRef.current);
          }
          return;
        }

        // Nível 1: Alerta antecipado (dobro das horas configuradas)
        if (minutesUntilDue <= earlyThreshold && minutesUntilDue > warningThreshold) {
          if (!notifiedTasksRef.current.has(`${taskId}-early`)) {
            const hoursUntilDue = Math.floor(minutesUntilDue / 60);
            toastRef.current({
              title: "📅 Prazo se Aproximando",
              description: `"${task.title}" vence em ${hoursUntilDue} horas`,
            });
            showBrowserNotification("📅 Prazo se Aproximando", `"${task.title}" vence em ${hoursUntilDue} horas`, false);
            sendOneSignalPush('due_early', task.title, task.id, 'early');
            notifiedTasksRef.current.add(`${taskId}-early`);
            saveNotifiedSet(notifiedTasksRef.current);
          }
        }
      });
    };

    // Verifica imediatamente
    checkDueDates();

    // Item 4: Usar checkInterval configurado (em minutos)
    const checkIntervalMs = (notifSettings.checkInterval || 15) * 60000;
    const interval = setInterval(checkDueDates, checkIntervalMs);

    return () => clearInterval(interval);
  }, [tasks, settings.notificationTemplates]);
}
