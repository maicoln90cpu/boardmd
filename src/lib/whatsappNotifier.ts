import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface WhatsAppNotifyParams {
  userId: string;
  templateType: string;
  variables: Record<string, string>;
}

/**
 * Sends a WhatsApp notification using the user's configured templates.
 * For EVENT templates (no send_time), it sends immediately.
 * For FIXED TIME templates, it checks the hour before sending.
 */
export async function sendWhatsAppNotification({
  userId,
  templateType,
  variables,
}: WhatsAppNotifyParams): Promise<boolean> {
  try {
    // Check WhatsApp connection
    const { data: config } = await supabase
      .from("whatsapp_config")
      .select("phone_number, is_connected")
      .eq("user_id", userId)
      .single();

    if (!config?.is_connected || !config?.phone_number) {
      return false;
    }

    // Get template
    const { data: templates } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("user_id", userId)
      .eq("template_type", templateType);

    // Check if template exists and is enabled
    const template = templates?.[0];
    if (!template || !template.is_enabled) {
      return false;
    }

    // EVENT templates: no time check needed (pomodoro, achievement, task_completed, goal_reached)
    const eventTemplates = ["pomodoro", "achievement", "task_completed", "goal_reached"];
    
    // FIXED TIME templates: check send_time (handled by cron, skip client-side)
    // Only event templates should be sent from client-side
    if (!eventTemplates.includes(templateType)) {
      // For due_date, check hours_before logic
      if (templateType === "due_date") {
        // due_date is handled by whatsapp-due-alert edge function
        return false;
      }
      // Other fixed-time templates are handled by whatsapp-daily-summary cron
      return false;
    }

    // Replace variables in template
    let message = template.message_template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }

    // Send via edge function
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: {
        user_id: userId,
        phone_number: config.phone_number,
        message,
        template_type: templateType,
      },
    });

    if (error) {
      logger.error("[WhatsApp] Error sending:", error);
      return false;
    }

    return data?.success || false;
  } catch (err) {
    logger.error("[WhatsApp] Notification error:", err);
    return false;
  }
}

/**
 * Helper: Send task completed notification
 */
export async function notifyTaskCompleted(
  userId: string,
  taskTitle: string,
  completedCount: number,
  pendingCount: number
): Promise<void> {
  sendWhatsAppNotification({
    userId,
    templateType: "task_completed",
    variables: {
      taskTitle,
      completedCount: String(completedCount),
      pendingCount: String(pendingCount),
    },
  }).catch(() => {}); // Fire and forget
}

/**
 * Helper: Send goal reached notification
 */
export async function notifyGoalReached(
  userId: string,
  goalTitle: string,
  target: number,
  period: string
): Promise<void> {
  sendWhatsAppNotification({
    userId,
    templateType: "goal_reached",
    variables: {
      goalTitle,
      target: String(target),
      period,
    },
  }).catch(() => {});
}

/**
 * Helper: Send pomodoro notification
 */
export async function notifyPomodoro(
  userId: string,
  sessionType: string,
  message: string
): Promise<void> {
  sendWhatsAppNotification({
    userId,
    templateType: "pomodoro",
    variables: { sessionType, message },
  }).catch(() => {});
}

/**
 * Helper: Send achievement notification
 */
export async function notifyAchievement(
  userId: string,
  achievementTitle: string,
  points: number
): Promise<void> {
  sendWhatsAppNotification({
    userId,
    templateType: "achievement",
    variables: {
      achievementTitle,
      points: String(points),
    },
  }).catch(() => {});
}
