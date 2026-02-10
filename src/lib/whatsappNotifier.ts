import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface WhatsAppNotifyParams {
  userId: string;
  templateType: string;
  variables: Record<string, string>;
}

/**
 * Sends a WhatsApp notification using the user's configured templates.
 * Checks if template is enabled and WhatsApp is connected before sending.
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

    // Check send_time - only send if current hour matches template hour
    if (template.send_time) {
      const now = new Date();
      const [templateHour] = (template.send_time as string).split(":").map(Number);
      const currentHour = now.getHours();
      
      // For due_date alerts, also check send_time_2
      if (templateType === "due_date") {
        const sendTime2 = (template as any).send_time_2;
        if (sendTime2) {
          const [hour2] = (sendTime2 as string).split(":").map(Number);
          if (currentHour !== templateHour && currentHour !== hour2) {
            return false;
          }
        }
        // due_date without send_time_2: skip time check (urgent)
      } else if (currentHour !== templateHour) {
        return false;
      }
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
