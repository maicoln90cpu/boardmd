import { useEffect, useRef } from "react";
import { Task } from "@/hooks/tasks/useTasks";
import { useToast } from "@/hooks/ui/useToast";
import { differenceInMinutes, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/data/useSettings";
import { logger } from "@/lib/logger";
import {
  defaultNotificationTemplates,
  formatNotificationTemplate,
  getTemplateById,
} from "@/lib/defaultNotificationTemplates";
import { sendPushWithTemplate, isTemplateEnabled } from "@/lib/notifications/pushHelper";

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

// Overdue summary threshold
const OVERDUE_SUMMARY_THRESHOLD = 5;

// Pure function to calculate task urgency (no side effects)
export function getTaskUrgency(task: Task): "overdue" | "urgent" | "warning" | "normal" {
  if (!task.due_date || task.column_id?.includes("done")) return "normal";

  const dueDate = new Date(task.due_date);
  const now = new Date();

  if (isPast(dueDate)) return "overdue";

  const minutesUntilDue = differenceInMinutes(dueDate, now);
  const hoursUntilDue = Math.floor(minutesUntilDue / 60);

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

  // Load push timestamps and notified set only once on mount
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      pushTimestampsRef.current = loadPushTimestamps();
      const snoozeMinutes = settingsRef.current.snoozeMinutes || 30;
      notifiedTasksRef.current = loadNotifiedSet(snoozeMinutes);
    }
  }, []);

  useEffect(() => {
    const notifSettings = settingsRef.current;
    
    // Não executar se notificações estão desabilitadas
    if (!notifSettings.dueDate) return;

    // Request permission once
    requestNotificationPermission();

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
      if (!currentSettings.dueDate) return;
      const excludedColumns = currentSettings.excludedPushColumnIds || [];
      const { data: { user } } = await supabase.auth.getUser();
      const userTemplates = settings.notificationTemplates || defaultNotificationTemplates;

      const columnMap = await getColumnMap();

      // Helper: check if ALL channels (toast/browser/push) should be blocked
      const isAllBlocked = (templateId: string): boolean => {
        return !isTemplateEnabled(templateId, userTemplates);
      };

      // Dedup check for local notifications (toast + browser)
      const isLocalDedupActive = (taskId: string, level: string): boolean => {
        const key = `toast-${taskId}-${level}`;
        const lastTime = pushTimestampsRef.current.get(key);
        return !!lastTime && Date.now() - lastTime < PUSH_DEDUP_MS;
      };
      const markLocalSent = (taskId: string, level: string) => {
        pushTimestampsRef.current.set(`toast-${taskId}-${level}`, Date.now());
        savePushTimestamps(pushTimestampsRef.current);
      };

      // Push dedup check
      const isPushDedupActive = (taskId: string, level: string): boolean => {
        const key = `${taskId}-${level}`;
        if (pendingPushesRef.current.has(key)) return true;
        const lastTime = pushTimestampsRef.current.get(key);
        return !!lastTime && Date.now() - lastTime < PUSH_DEDUP_MS;
      };
      const markPushSent = (taskId: string, level: string) => {
        pushTimestampsRef.current.set(`${taskId}-${level}`, Date.now());
        savePushTimestamps(pushTimestampsRef.current);
      };

      // Send push via centralized helper
      const sendPush = async (templateId: string, taskTitle: string, taskId: string, level: string, timeRemaining?: string) => {
        if (!user) return;
        const pushKey = `${taskId}-${level}`;
        if (isPushDedupActive(taskId, level)) return;
        
        pendingPushesRef.current.add(pushKey);
        try {
          const vars: Record<string, string> = { taskTitle };
          if (timeRemaining) vars.timeRemaining = timeRemaining;
          
          await sendPushWithTemplate({
            userId: user.id,
            templateId,
            templates: userTemplates,
            variables: vars,
            dedupKey: `${templateId}:${taskId}`,
            triggerSource: 'due_date',
            extraData: { taskId },
          });
          
          markPushSent(taskId, level);
        } finally {
          pendingPushesRef.current.delete(pushKey);
        }
      };

      // Helper to notify (toast + browser + push) respecting template enabled
      const notifyTask = async (
        templateId: string,
        taskId: string,
        level: string,
        toastTitle: string,
        toastDescription: string,
        urgent: boolean,
        taskTitle: string,
        timeRemaining?: string
      ) => {
        // Template OFF = block ALL channels
        if (isAllBlocked(templateId)) return;
        
        // Local dedup (toast + browser)
        if (!isLocalDedupActive(taskId, level)) {
          toastRef.current({
            title: toastTitle,
            description: toastDescription,
            variant: urgent ? "destructive" : undefined,
          });
          showBrowserNotification(toastTitle, toastDescription, urgent);
          markLocalSent(taskId, level);
        }
        
        // Push (separate dedup)
        await sendPush(templateId, taskTitle, taskId, level, timeRemaining);
      };

      // === OVERDUE SUMMARY: collect overdue tasks first ===
      const overdueTasks = tasks.filter(task => {
        if (!task.due_date || task.is_completed) return false;
        const colName = columnMap.get(task.column_id) || "";
        if (colName.toLowerCase().includes("concluí")) return false;
        if (excludedColumns.includes(task.column_id)) return false;
        return isPast(new Date(task.due_date));
      });

      // If many overdue, send summary instead of individual alerts
      if (overdueTasks.length >= OVERDUE_SUMMARY_THRESHOLD) {
        const summaryKey = "overdue-summary";
        if (!notifiedTasksRef.current.has(summaryKey) && !isLocalDedupActive("summary", "overdue")) {
          
          if (!isAllBlocked('due_overdue_summary') && !isAllBlocked('due_overdue')) {
            const topTasks = overdueTasks.slice(0, 3).map(t => t.title).join(", ");
            const count = String(overdueTasks.length);
            
            toastRef.current({
              title: `⏰ ${count} Tarefas Atrasadas`,
              description: `Você tem ${count} tarefas atrasadas. Revise suas pendências.`,
              variant: "destructive",
            });
            showBrowserNotification(
              `⏰ ${count} Tarefas Atrasadas`,
              `Você tem ${count} tarefas atrasadas. As mais urgentes: ${topTasks}`,
              true
            );
            markLocalSent("summary", "overdue");
            
            if (user) {
              await sendPushWithTemplate({
                userId: user.id,
                templateId: 'due_overdue_summary',
                templates: userTemplates,
                variables: { count, topTasks },
                dedupKey: `due_overdue_summary:${new Date().toISOString().slice(0, 10)}`,
                triggerSource: 'due_date',
                extraData: { overdueCount: overdueTasks.length },
              });
            }
          }
          
          notifiedTasksRef.current.add(summaryKey);
          // Mark all overdue as notified to prevent individual alerts
          overdueTasks.forEach(t => notifiedTasksRef.current.add(`${t.id}-overdue`));
          saveNotifiedSet(notifiedTasksRef.current);
        }
        // Skip individual overdue processing but continue with urgent/warning/early
      }

      // Process each task for non-overdue alerts (and overdue if < threshold)
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
          notifiedTasksRef.current.delete(`${taskId}-custom-0`);
          notifiedTasksRef.current.delete(`${taskId}-custom-1`);
          saveNotifiedSet(notifiedTasksRef.current);
          return;
        }

        if (excludedColumns.includes(task.column_id)) return;

        const dueDate = new Date(task.due_date);
        const taskId = task.id;
        const minutesUntilDue = differenceInMinutes(dueDate, now);

        // === Per-task custom reminders ===
        const taskReminders = (task as any).notification_settings?.reminders as Array<{ hours_before: number; channel: 'push' | 'whatsapp' | 'both' }> | undefined;
        
        if (taskReminders && taskReminders.length > 0) {
          // Handle overdue with global logic
          if (isPast(dueDate)) {
            if (!notifiedTasksRef.current.has(`${taskId}-overdue`)) {
              // Only notify individually if below summary threshold
              if (overdueTasks.length < OVERDUE_SUMMARY_THRESHOLD) {
                notifyTask('due_overdue', taskId, 'overdue', "⏰ Tarefa Atrasada!", `"${task.title}" já passou do prazo`, true, task.title);
              }
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
              
              if (reminder.channel === 'push' || reminder.channel === 'both') {
                if (!isAllBlocked('due_warning')) {
                  toastRef.current({
                    title: "🔔 Lembrete de Tarefa",
                    description: `"${task.title}" vence em ${timeText}`,
                  });
                  showBrowserNotification("🔔 Lembrete de Tarefa", `"${task.title}" vence em ${timeText}`, reminder.hours_before <= 1);
                }
                sendPush('due_warning', task.title, task.id, `custom-${idx}`, timeText);
              }
              
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
          return;
        }

        // === Global thresholds (fallback) ===
        const configuredHours = currentSettings.dueDateHours || 24;
        const urgentThreshold = 60;
        const warningThreshold = configuredHours * 60;
        const earlyThreshold = warningThreshold * 2;

        // Overdue
        if (isPast(dueDate)) {
          if (!notifiedTasksRef.current.has(`${taskId}-overdue`)) {
            if (overdueTasks.length < OVERDUE_SUMMARY_THRESHOLD) {
              notifyTask('due_overdue', taskId, 'overdue', "⏰ Tarefa Atrasada!", `"${task.title}" já passou do prazo`, true, task.title);
            }
            notifiedTasksRef.current.add(`${taskId}-overdue`);
            saveNotifiedSet(notifiedTasksRef.current);
          }
          return;
        }

        // Urgent (1 hour)
        if (minutesUntilDue <= urgentThreshold && minutesUntilDue > 0) {
          if (!notifiedTasksRef.current.has(`${taskId}-urgent`)) {
            notifyTask('due_urgent', taskId, 'urgent', "🔥 Prazo Urgente!", `"${task.title}" vence em menos de 1 hora`, true, task.title, 'menos de 1 hora');
            notifiedTasksRef.current.add(`${taskId}-urgent`);
            saveNotifiedSet(notifiedTasksRef.current);
          }
          return;
        }

        // Warning (configured hours)
        if (minutesUntilDue <= warningThreshold && minutesUntilDue > urgentThreshold) {
          if (!notifiedTasksRef.current.has(`${taskId}-warning`)) {
            const hoursUntilDue = Math.floor(minutesUntilDue / 60);
            const timeText = `${hoursUntilDue} hora${hoursUntilDue > 1 ? 's' : ''}`;
            notifyTask('due_warning', taskId, 'warning', "⚠️ Prazo Próximo", `"${task.title}" vence em ${timeText}`, false, task.title, timeText);
            notifiedTasksRef.current.add(`${taskId}-warning`);
            saveNotifiedSet(notifiedTasksRef.current);
          }
          return;
        }

        // Early (double configured hours)
        if (minutesUntilDue <= earlyThreshold && minutesUntilDue > warningThreshold) {
          if (!notifiedTasksRef.current.has(`${taskId}-early`)) {
            const hoursUntilDue = Math.floor(minutesUntilDue / 60);
            const timeText = `${hoursUntilDue} horas`;
            notifyTask('due_early', taskId, 'early', "📅 Prazo se Aproximando", `"${task.title}" vence em ${timeText}`, false, task.title, timeText);
            notifiedTasksRef.current.add(`${taskId}-early`);
            saveNotifiedSet(notifiedTasksRef.current);
          }
        }
      });
    };

    // Verifica imediatamente
    checkDueDates();

    // Usar checkInterval configurado (em minutos)
    const checkIntervalMs = (notifSettings.checkInterval || 15) * 60000;
    const interval = setInterval(checkDueDates, checkIntervalMs);

    return () => clearInterval(interval);
  }, [tasks, settings.notificationTemplates, settings.notifications.dueDate]);
}
