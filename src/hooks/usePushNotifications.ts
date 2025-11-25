import { useState, useEffect } from "react";
import { pushNotifications } from "@/utils/pushNotifications";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "./useSettings";
import { Task } from "./useTasks";
import { differenceInMinutes, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { 
  defaultNotificationTemplates, 
  formatNotificationTemplate,
  getTemplateById 
} from "@/lib/defaultNotificationTemplates";

export function usePushNotifications(tasks: Task[]) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const { toast } = useToast();
  const { settings } = useSettings();

  useEffect(() => {
    setIsSupported(pushNotifications.isSupported());
    setPermission(pushNotifications.getPermissionStatus());
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (!("serviceWorker" in navigator)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Erro ao verificar subscription:", error);
    }
  };

  const requestPermission = async () => {
    try {
      const result = await pushNotifications.requestPermission();
      setPermission(result);

      if (result === "granted") {
        await subscribe();
        toast({
          title: "✓ Notificações ativadas",
          description: "Você receberá alertas de tarefas vencidas",
        });
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

  const subscribe = async () => {
    try {
      const subscription = await pushNotifications.subscribe();
      if (subscription) {
        setIsSubscribed(true);
        scheduleTaskNotifications();
      }
    } catch (error) {
      console.error("Erro ao registrar push:", error);
    }
  };

  const unsubscribe = async () => {
    try {
      await pushNotifications.unsubscribe();
      setIsSubscribed(false);
      toast({
        title: "Notificações desativadas",
        description: "Você não receberá mais alertas push",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar as notificações",
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
      const urgentThreshold = 60; // 1 hora
      const warningThreshold = configuredHours * 60;
      const earlyThreshold = warningThreshold * 2;

      // Enviar notificações via Edge Function para maior confiabilidade
      const sendPushViaEdgeFunction = async (templateId: string, variables: Record<string, string>) => {
        const template = getTemplateById(userTemplates, templateId);
        if (!template) return;

        const formatted = formatNotificationTemplate(template, variables);

        if (user && isSubscribed) {
          try {
            await pushNotifications.sendPushNotification({
              user_id: user.id,
              title: formatted.title,
              body: formatted.body,
              data: { taskId: task.id },
              url: `/`,
              notification_type: templateId,
            });
          } catch (error) {
            console.error('Error sending push notification:', error);
            // Fallback para notificação local
            pushNotifications.scheduleLocalNotification(
              formatted.title, 
              formatted.body, 
              0, 
              `task-${task.id}`
            );
          }
        } else {
          // Usar notificação local se não estiver inscrito
          pushNotifications.scheduleLocalNotification(
            formatted.title, 
            formatted.body, 
            0, 
            `task-${task.id}`
          );
        }
      };

      const hours = Math.floor(minutesUntilDue / 60);
      const timeRemaining = hours > 1 
        ? `${hours} horas` 
        : minutesUntilDue > 1 
          ? `${minutesUntilDue} minutos`
          : "menos de 1 minuto";

      // Agendar notificações baseadas nos thresholds usando templates
      if (isPast(dueDate)) {
        // Notificação imediata para tarefas atrasadas
        sendPushViaEdgeFunction('due_overdue', { 
          taskTitle: task.title 
        });
      } else if (minutesUntilDue <= urgentThreshold && minutesUntilDue > 0) {
        // Notificação urgente (1 hora antes)
        const delay = Math.max(0, (minutesUntilDue - 60) * 60 * 1000);
        setTimeout(() => {
          sendPushViaEdgeFunction('due_urgent', { 
            taskTitle: task.title,
            timeRemaining: "menos de 1 hora"
          });
        }, delay);
      } else if (minutesUntilDue <= warningThreshold) {
        // Notificação de aviso (horas configuradas)
        const delay = Math.max(0, (minutesUntilDue - warningThreshold) * 60 * 1000);
        setTimeout(() => {
          sendPushViaEdgeFunction('due_warning', { 
            taskTitle: task.title,
            timeRemaining: `${hours} hora${hours > 1 ? 's' : ''}`
          });
        }, delay);
      } else if (minutesUntilDue <= earlyThreshold) {
        // Notificação antecipada (dobro das horas configuradas)
        const delay = Math.max(0, (minutesUntilDue - earlyThreshold) * 60 * 1000);
        setTimeout(() => {
          sendPushViaEdgeFunction('due_early', { 
            taskTitle: task.title,
            timeRemaining: `${hours} horas`
          });
        }, delay);
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
