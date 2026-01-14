import { supabase } from "@/integrations/supabase/client";
import { logger, prodLogger } from "@/lib/logger";

export interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  notification_type: string;
  url?: string;
  data?: Record<string, unknown>;
}

export const oneSignalNotifier = {
  /**
   * Enviar notificação genérica via OneSignal
   */
  async send(payload: NotificationPayload): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-onesignal', {
        body: payload,
      });

      if (error) {
        prodLogger.error('[oneSignalNotifier] Error sending notification:', error);
        return false;
      }

      logger.log('[oneSignalNotifier] Notification sent:', data);
      return true;
    } catch (error) {
      prodLogger.error('[oneSignalNotifier] Exception:', error);
      return false;
    }
  },

  /**
   * Enviar notificação de tarefa vencendo/atrasada
   */
  async sendDueDateAlert(userId: string, taskTitle: string, hoursUntilDue: number): Promise<boolean> {
    let title: string;
    let body: string;
    let urgency: 'overdue' | 'urgent' | 'warning';

    if (hoursUntilDue <= 0) {
      title = '⏰ Tarefa Atrasada!';
      body = `"${taskTitle}" já passou do prazo`;
      urgency = 'overdue';
    } else if (hoursUntilDue <= 1) {
      title = '🔥 Prazo Urgente!';
      body = `"${taskTitle}" vence em menos de 1 hora`;
      urgency = 'urgent';
    } else if (hoursUntilDue <= 24) {
      title = '⚠️ Prazo Próximo';
      body = `"${taskTitle}" vence em ${Math.floor(hoursUntilDue)} hora(s)`;
      urgency = 'warning';
    } else {
      title = '📋 Lembrete de Tarefa';
      body = `"${taskTitle}" vence em ${Math.floor(hoursUntilDue / 24)} dia(s)`;
      urgency = 'warning';
    }

    return this.send({
      user_id: userId,
      title,
      body,
      notification_type: 'due_date',
      url: '/',
      data: { urgency, hoursUntilDue },
    });
  },

  /**
   * Enviar lembrete diário
   */
  async sendDailyReminder(userId: string, pendingTasks: number, overdueTasks: number): Promise<boolean> {
    let body: string;
    
    if (overdueTasks > 0) {
      body = `Você tem ${pendingTasks} tarefa(s) pendente(s) e ${overdueTasks} atrasada(s)`;
    } else {
      body = `Você tem ${pendingTasks} tarefa(s) pendente(s) para hoje`;
    }

    return this.send({
      user_id: userId,
      title: '📋 Resumo do Dia',
      body,
      notification_type: 'daily_reminder',
      url: '/',
      data: { pendingTasks, overdueTasks },
    });
  },

  /**
   * Enviar notificação de conquista
   */
  async sendAchievement(userId: string, achievementTitle: string, points: number): Promise<boolean> {
    return this.send({
      user_id: userId,
      title: '🏆 Nova Conquista!',
      body: `${achievementTitle} (+${points} pontos)`,
      notification_type: 'achievement',
      url: '/dashboard',
      data: { achievementTitle, points },
    });
  },

  /**
   * Enviar notificação de pomodoro completo
   */
  async sendPomodoroComplete(userId: string, sessionType: 'work' | 'break'): Promise<boolean> {
    const isWork = sessionType === 'work';
    
    return this.send({
      user_id: userId,
      title: isWork ? '🍅 Pomodoro Completo!' : '☕ Pausa Terminada!',
      body: isWork ? 'Hora de fazer uma pausa!' : 'Hora de voltar ao trabalho!',
      notification_type: 'pomodoro',
      url: '/pomodoro',
      data: { sessionType },
    });
  },
};
