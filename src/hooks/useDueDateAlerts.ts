import { useEffect, useRef } from "react";
import { Task } from "@/hooks/tasks/useTasks";
import { useToast } from "@/hooks/ui/useToast";
import { differenceInMinutes, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/data/useSettings";
import { logger } from "@/lib/logger";
import {
  defaultNotificationTemplates,
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

/**
 * Simplified due-date alerts hook.
 * 
 * 3 RULES:
 * 1. GOLDEN RULE: Per-task reminders (notification_settings.reminders) are the ONLY source for that task
 * 2. GLOBAL FALLBACK: Tasks WITHOUT individual reminders use global thresholds (dueDateHours)
 * 3. DEDUP: Backend (Edge Function) handles dedup. Only an in-memory Set prevents re-toasts in the same session.
 * 
 * FLOW per task:
 * 1. Excluded column? → SKIP
 * 2. Completed? → SKIP
 * 3. Has individual reminders? → Use ONLY those
 * 4. Otherwise → Use global thresholds
 * 5. Already notified this session? (in-memory) → SKIP toast/browser
 * 6. Push → sendPushWithTemplate (backend handles dedup)
 */
export function useDueDateAlerts(tasks: Task[]) {
  const { toast } = useToast();
  const { settings } = useSettings();
  
  // Simple in-memory Set: prevents re-toast in same browser session only
  const notifiedRef = useRef<Set<string>>(new Set());
  const toastRef = useRef(toast);
  const settingsRef = useRef(settings.notifications);

  useEffect(() => { toastRef.current = toast; }, [toast]);
  useEffect(() => { settingsRef.current = settings.notifications; }, [settings.notifications]);

  useEffect(() => {
    const notifSettings = settingsRef.current;
    if (!notifSettings.dueDate) return;

    requestNotificationPermission();

    // Cache column data
    let columnMapCache: Map<string, string> | null = null;

    const getColumnMap = async () => {
      if (columnMapCache) return columnMapCache;
      const columnIds = [...new Set(tasks.map(t => t.column_id))];
      if (columnIds.length === 0) return new Map<string, string>();
      const { data: columnsData } = await supabase
        .from("columns")
        .select("id, name")
        .in("id", columnIds);
      columnMapCache = new Map(columnsData?.map(c => [c.id, c.name]) || []);
      return columnMapCache;
    };

    const checkDueDates = async () => {
      const now = new Date();
      const currentSettings = settingsRef.current;
      if (!currentSettings.dueDate) return;

      const excludedColumns = currentSettings.excludedPushColumnIds || [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userTemplates = settings.notificationTemplates || defaultNotificationTemplates;
      const columnMap = await getColumnMap();

      // Helper: is template enabled?
      const tplEnabled = (id: string) => isTemplateEnabled(id, userTemplates);

      // Helper: mark notified in-memory & show toast + browser
      const notifyLocal = (key: string, title: string, desc: string, urgent: boolean) => {
        if (notifiedRef.current.has(key)) return;
        notifiedRef.current.add(key);
        toastRef.current({ title, description: desc, variant: urgent ? "destructive" : undefined });
        showBrowserNotification(title, desc, urgent);
      };

      // Helper: send push (backend handles dedup via dedup_key)
      const push = async (templateId: string, taskId: string, vars: Record<string, string>) => {
        await sendPushWithTemplate({
          userId: user.id,
          templateId,
          templates: userTemplates,
          variables: vars,
          dedupKey: `${templateId}:${taskId}`,
          triggerSource: 'due_date',
          extraData: { taskId },
        });
      };

      // === Step 1: Collect overdue tasks (for summary logic) ===
      const overdueTasks = tasks.filter(task => {
        if (!task.due_date || task.is_completed) return false;
        const colName = columnMap.get(task.column_id) || "";
        if (colName.toLowerCase().includes("concluí")) return false;
        if (excludedColumns.includes(task.column_id)) return false;
        return isPast(new Date(task.due_date));
      });

      // === Step 2: If >= threshold overdue, send ONE summary ===
      if (overdueTasks.length >= OVERDUE_SUMMARY_THRESHOLD) {
        const summaryKey = "overdue-summary";
        if (tplEnabled('due_overdue_summary') || tplEnabled('due_overdue')) {
          notifyLocal(summaryKey,
            `⏰ ${overdueTasks.length} Tarefas Atrasadas`,
            `Você tem ${overdueTasks.length} tarefas atrasadas. Revise suas pendências.`,
            true
          );
          const topTasks = overdueTasks.slice(0, 3).map(t => t.title).join(", ");
          await push('due_overdue_summary', `summary-${new Date().toISOString().slice(0, 10)}`, {
            count: String(overdueTasks.length),
            topTasks,
          });
        }
        // Mark individual overdue as notified so they don't fire individually
        overdueTasks.forEach(t => notifiedRef.current.add(`${t.id}-overdue`));
      }

      // === Step 3: Process each task ===
      for (const task of tasks) {
        if (!task.due_date) continue;

        // Skip completed
        const colName = columnMap.get(task.column_id) || "";
        const isCompleted = task.is_completed === true || colName.toLowerCase().includes("concluí");
        if (isCompleted) continue;

        // Skip excluded columns
        if (excludedColumns.includes(task.column_id)) continue;

        const dueDate = new Date(task.due_date);
        const minutesUntilDue = differenceInMinutes(dueDate, now);

        // === GOLDEN RULE: Per-task custom reminders ===
        const taskReminders = (task as any).notification_settings?.reminders as Array<{
          hours_before: number;
          channel: 'push' | 'whatsapp' | 'both';
        }> | undefined;

        if (taskReminders && taskReminders.length > 0) {
          // Overdue for tasks with custom reminders
          if (isPast(dueDate)) {
            const key = `${task.id}-overdue`;
            if (tplEnabled('due_overdue') && overdueTasks.length < OVERDUE_SUMMARY_THRESHOLD) {
              notifyLocal(key, "⏰ Tarefa Atrasada!", `"${task.title}" já passou do prazo`, true);
              await push('due_overdue', task.id, { taskTitle: task.title });
            }
            continue;
          }

          // Check each custom reminder
          for (let idx = 0; idx < taskReminders.length; idx++) {
            const reminder = taskReminders[idx];
            const reminderMinutes = reminder.hours_before * 60;
            const key = `${task.id}-custom-${idx}`;

            if (minutesUntilDue <= reminderMinutes && minutesUntilDue > 0) {
              const hours = Math.floor(minutesUntilDue / 60);
              const timeText = hours > 0 ? `${hours} hora${hours > 1 ? 's' : ''}` : `${minutesUntilDue} minutos`;

              if (reminder.channel === 'push' || reminder.channel === 'both') {
                if (tplEnabled('due_warning')) {
                  notifyLocal(key, "🔔 Lembrete de Tarefa", `"${task.title}" vence em ${timeText}`, reminder.hours_before <= 1);
                  await push('due_warning', task.id, { taskTitle: task.title, timeRemaining: timeText });
                }
              }

              if (reminder.channel === 'whatsapp' || reminder.channel === 'both') {
                import("@/lib/whatsappNotifier").then(({ sendWhatsAppNotification }) => {
                  sendWhatsAppNotification({
                    userId: user.id,
                    templateType: 'due_date',
                    variables: { taskTitle: task.title, timeRemaining: timeText },
                  });
                });
              }
            }
          }
          continue; // Golden rule: skip global thresholds
        }

        // === GLOBAL FALLBACK: No custom reminders ===
        const configuredHours = currentSettings.dueDateHours || 24;
        const urgentThreshold = 60; // 1h
        const warningThreshold = configuredHours * 60;
        const earlyThreshold = warningThreshold * 2;

        if (isPast(dueDate)) {
          // Overdue (individual, only if below summary threshold)
          if (overdueTasks.length < OVERDUE_SUMMARY_THRESHOLD && tplEnabled('due_overdue')) {
            const key = `${task.id}-overdue`;
            notifyLocal(key, "⏰ Tarefa Atrasada!", `"${task.title}" já passou do prazo`, true);
            await push('due_overdue', task.id, { taskTitle: task.title });
          }
        } else if (minutesUntilDue <= urgentThreshold && minutesUntilDue > 0) {
          if (tplEnabled('due_urgent')) {
            const key = `${task.id}-urgent`;
            notifyLocal(key, "🔥 Prazo Urgente!", `"${task.title}" vence em menos de 1 hora`, true);
            await push('due_urgent', task.id, { taskTitle: task.title, timeRemaining: 'menos de 1 hora' });
          }
        } else if (minutesUntilDue <= warningThreshold && minutesUntilDue > urgentThreshold) {
          if (tplEnabled('due_warning')) {
            const key = `${task.id}-warning`;
            const hours = Math.floor(minutesUntilDue / 60);
            const timeText = `${hours} hora${hours > 1 ? 's' : ''}`;
            notifyLocal(key, "⚠️ Prazo Próximo", `"${task.title}" vence em ${timeText}`, false);
            await push('due_warning', task.id, { taskTitle: task.title, timeRemaining: timeText });
          }
        } else if (minutesUntilDue <= earlyThreshold && minutesUntilDue > warningThreshold) {
          if (tplEnabled('due_early')) {
            const key = `${task.id}-early`;
            const hours = Math.floor(minutesUntilDue / 60);
            const timeText = `${hours} horas`;
            notifyLocal(key, "📅 Prazo se Aproximando", `"${task.title}" vence em ${timeText}`, false);
            await push('due_early', task.id, { taskTitle: task.title, timeRemaining: timeText });
          }
        }
      }
    };

    // Run immediately then on interval
    checkDueDates();

    const checkIntervalMs = (notifSettings.checkInterval || 15) * 60000;
    const interval = setInterval(checkDueDates, checkIntervalMs);

    return () => clearInterval(interval);
  }, [tasks, settings.notificationTemplates, settings.notifications.dueDate]);
}
