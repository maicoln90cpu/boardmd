/**
 * Hook para gerenciar notificações push via OneSignal + WhatsApp
 */

import { useState, useEffect } from "react";
import { pushNotifications } from "@/lib/push/pushNotifications";
import { useToast } from "@/hooks/ui/useToast";
import { useSettings } from "@/hooks/data/useSettings";
import { Task } from "@/hooks/tasks/useTasks";
import { differenceInMinutes, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { 
  defaultNotificationTemplates, 
  formatNotificationTemplate,
  getTemplateById 
} from "@/lib/defaultNotificationTemplates";
import { oneSignalNotifier } from "@/lib/notifications/oneSignalNotifier";
import { useOneSignal } from "@/hooks/useOneSignal";
import { sendWhatsAppNotification } from "@/lib/whatsappNotifier";
import { logger } from "@/lib/logger";

export function usePushNotifications(tasks: Task[]) {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = useOneSignal();
  const { toast } = useToast();
  const { settings } = useSettings();

  const requestPermission = async () => {
    try {
      const result = await subscribe();

      if (result) {
        toast({
          title: "✓ Notificações ativadas",
          description: "Você receberá alertas de tarefas vencidas",
        });
        scheduleTaskNotifications();
      } else {
        toast({
          title: "Permissão negada",
          description: "Ative as notificações nas configurações do navegador",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível solicitar permissão",
        variant: "destructive",
      });
    }
  };

  // Agendar notificações para tarefas pendentes
  const scheduleTaskNotifications = async () => {
    if (!settings.notifications.dueDate) return;

    const now = new Date();

    // Buscar nomes das colunas
    const columnIds = [...new Set(tasks.map(t => t.column_id))];
    const { data: columnsData } = await supabase
      .from("columns")
      .select("id, name")
      .in("id", columnIds);
    
    const columnMap = new Map(columnsData?.map(c => [c.id, c.name]) || []);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Get user's notification templates (or use defaults)
    const userTemplates = settings.notificationTemplates || defaultNotificationTemplates;

    tasks.forEach((task) => {
      if (!task.due_date) return;

      const columnName = columnMap.get(task.column_id) || "";
      const isCompleted = columnName.toLowerCase().includes("concluí") || 
                         localStorage.getItem(`task-completed-${task.id}`) === "true";
      
      if (isCompleted) return;

      const dueDate = new Date(task.due_date);
      const minutesUntilDue = differenceInMinutes(dueDate, now);

      // Configurações do /config
      const configuredHours = settings.notifications.dueDateHours || 24;
      const configuredHours2 = settings.notifications.dueDateHours2;
      const urgentThreshold = 60; // 1 hora
      const warningThreshold = configuredHours * 60;
      const earlyThreshold = warningThreshold * 2;
      // Second alert thresholds
      const warningThreshold2 = configuredHours2 ? configuredHours2 * 60 : null;
      const earlyThreshold2 = warningThreshold2 ? warningThreshold2 * 2 : null;

      // Enviar notificações via OneSignal + WhatsApp
      const sendPushNotification = async (templateId: string, variables: Record<string, string>) => {
        const template = getTemplateById(userTemplates, templateId);
        if (!template) return;

        const formatted = formatNotificationTemplate(template, variables);

        // === Push notification (OneSignal / Local) ===
        if (user && isSubscribed) {
          try {
            await oneSignalNotifier.send({
              user_id: user.id,
              title: formatted.title,
              body: formatted.body,
              notification_type: templateId,
              url: '/',
              data: { taskId: task.id },
            });
          } catch (error) {
            logger.error('Error sending push notification:', error);
            pushNotifications.scheduleLocalNotification(
              formatted.title, 
              formatted.body, 
              0, 
              `task-${task.id}`
            );
          }
        } else {
          pushNotifications.scheduleLocalNotification(
            formatted.title, 
            formatted.body, 
            0, 
            `task-${task.id}`
          );
        }

        // === WhatsApp notification ===
        if (user) {
          // Map push template IDs to WhatsApp template types
          const whatsappTemplateMap: Record<string, string> = {
            'due_overdue': 'due_date',
            'due_urgent': 'due_date',
            'due_warning': 'due_date',
            'due_early': 'due_date',
          };

          const whatsappType = whatsappTemplateMap[templateId];
          if (whatsappType) {
            // Prevent duplicate WhatsApp sends with localStorage
            const whatsappKey = `whatsapp-sent-${task.id}-${templateId}`;
            const lastSent = localStorage.getItem(whatsappKey);
            const snoozeMs = (settings.notifications.snoozeMinutes || 60) * 60 * 1000;

            if (!lastSent || Date.now() - Number(lastSent) > snoozeMs) {
              sendWhatsAppNotification({
                userId: user.id,
                templateType: whatsappType,
                variables,
              }).then((sent) => {
                if (sent) {
                  localStorage.setItem(whatsappKey, String(Date.now()));
                  logger.info(`[WhatsApp] Sent ${whatsappType} for task ${task.id}`);
                }
              });
            }
          }
        }
      };

      const hours = Math.floor(minutesUntilDue / 60);

      // Agendar notificações baseadas nos thresholds usando templates
      if (isPast(dueDate)) {
        sendPushNotification('due_overdue', { 
          taskTitle: task.title 
        });
      } else if (minutesUntilDue <= urgentThreshold && minutesUntilDue > 0) {
        const delay = Math.max(0, (minutesUntilDue - 60) * 60 * 1000);
        setTimeout(() => {
          sendPushNotification('due_urgent', { 
            taskTitle: task.title,
            timeRemaining: "menos de 1 hora"
          });
        }, delay);
      } else if (minutesUntilDue <= warningThreshold) {
        const delay = Math.max(0, (minutesUntilDue - warningThreshold) * 60 * 1000);
        setTimeout(() => {
          sendPushNotification('due_warning', { 
            taskTitle: task.title,
            timeRemaining: `${hours} hora${hours > 1 ? 's' : ''}`
          });
        }, delay);
      } else if (minutesUntilDue <= earlyThreshold) {
        const delay = Math.max(0, (minutesUntilDue - earlyThreshold) * 60 * 1000);
        setTimeout(() => {
          sendPushNotification('due_early', { 
            taskTitle: task.title,
            timeRemaining: `${hours} horas`
          });
        }, delay);
      }

      // === Second alert (dueDateHours2) ===
      if (warningThreshold2 && earlyThreshold2 && !isPast(dueDate) && minutesUntilDue > 0) {
        const snoozeKey2 = `push-sent-2nd-${task.id}`;
        const lastSent2 = localStorage.getItem(snoozeKey2);
        const snoozeMs = (settings.notifications.snoozeMinutes || 30) * 60 * 1000;
        const shouldSend2 = !lastSent2 || Date.now() - Number(lastSent2) > snoozeMs;

        if (shouldSend2) {
          if (minutesUntilDue <= warningThreshold2) {
            const h2 = Math.floor(minutesUntilDue / 60);
            sendPushNotification('due_warning', {
              taskTitle: task.title,
              timeRemaining: `${h2} hora${h2 > 1 ? 's' : ''}`,
            });
            localStorage.setItem(snoozeKey2, String(Date.now()));
          } else if (minutesUntilDue <= earlyThreshold2) {
            const h2 = Math.floor(minutesUntilDue / 60);
            sendPushNotification('due_early', {
              taskTitle: task.title,
              timeRemaining: `${h2} horas`,
            });
            localStorage.setItem(snoozeKey2, String(Date.now()));
          }
        }
      }
    });
  };

  // Re-agendar quando as tarefas ou configurações mudarem
  useEffect(() => {
    if (isSubscribed && permission === "granted") {
      scheduleTaskNotifications();
    }
  }, [tasks, settings.notifications, isSubscribed, permission]);

  return {
    isSupported,
    isSubscribed,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
  };
}
