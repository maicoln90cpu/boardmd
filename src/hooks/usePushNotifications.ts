import { useState, useEffect } from "react";
import { pushNotifications } from "@/utils/pushNotifications";
import { useToast } from "./use-toast";
import { useSettings } from "./useSettings";
import { Task } from "./useTasks";
import { differenceInMinutes, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

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
      const sendPushViaEdgeFunction = async (title: string, body: string) => {
        if (user && isSubscribed) {
          try {
            await pushNotifications.sendPushNotification({
              user_id: user.id,
              title,
              body,
              data: { taskId: task.id },
              url: `/`,
            });
          } catch (error) {
            console.error('Error sending push notification:', error);
            // Fallback para notificação local
            pushNotifications.scheduleLocalNotification(title, body, 0, `task-${task.id}`);
          }
        } else {
          // Usar notificação local se não estiver inscrito
          pushNotifications.scheduleLocalNotification(title, body, 0, `task-${task.id}`);
        }
      };

      // Agendar notificações baseadas nos thresholds
      if (isPast(dueDate)) {
        // Notificação imediata para tarefas atrasadas
        sendPushViaEdgeFunction(
          "⏰ Tarefa Atrasada!",
          `"${task.title}" já passou do prazo`
        );
      } else if (minutesUntilDue <= urgentThreshold && minutesUntilDue > 0) {
        // Notificação urgente (1 hora antes)
        const delay = Math.max(0, (minutesUntilDue - 60) * 60 * 1000);
        setTimeout(() => {
          sendPushViaEdgeFunction(
            "🔥 Prazo Urgente!",
            `"${task.title}" vence em menos de 1 hora`
          );
        }, delay);
      } else if (minutesUntilDue <= warningThreshold) {
        // Notificação de aviso (horas configuradas)
        const delay = Math.max(0, (minutesUntilDue - warningThreshold) * 60 * 1000);
        const hours = Math.floor(minutesUntilDue / 60);
        setTimeout(() => {
          sendPushViaEdgeFunction(
            "⚠️ Prazo Próximo",
            `"${task.title}" vence em ${hours} hora${hours > 1 ? 's' : ''}`
          );
        }, delay);
      } else if (minutesUntilDue <= earlyThreshold) {
        // Notificação antecipada (dobro das horas configuradas)
        const delay = Math.max(0, (minutesUntilDue - earlyThreshold) * 60 * 1000);
        const hours = Math.floor(minutesUntilDue / 60);
        setTimeout(() => {
          sendPushViaEdgeFunction(
            "📅 Prazo se Aproximando",
            `"${task.title}" vence em ${hours} horas`
          );
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
