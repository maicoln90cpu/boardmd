import { oneSignalNotifier } from "@/lib/notifications/oneSignalNotifier";
import {
  defaultNotificationTemplates,
  formatNotificationTemplate,
  getTemplateById,
  NotificationTemplate,
} from "@/lib/defaultNotificationTemplates";

// Unique client instance ID for observability
const CLIENT_INSTANCE_ID_KEY = "push-client-instance-id";

function getClientInstanceId(): string {
  let id = localStorage.getItem(CLIENT_INSTANCE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_INSTANCE_ID_KEY, id);
  }
  return id;
}

interface SendPushOptions {
  userId: string;
  templateId: string;
  templates?: NotificationTemplate[];
  variables?: Record<string, string>;
  dedupKey: string;
  triggerSource: string;
  extraData?: Record<string, unknown>;
}

/**
 * Centralized push sender that:
 * 1. Checks if template is enabled
 * 2. Formats with template variables
 * 3. Includes dedup_key + observability metadata
 */
export async function sendPushWithTemplate(options: SendPushOptions): Promise<boolean> {
  const {
    userId,
    templateId,
    templates,
    variables = {},
    dedupKey,
    triggerSource,
    extraData = {},
  } = options;

  const userTemplates = templates || defaultNotificationTemplates;
  const template = getTemplateById(userTemplates, templateId);

  // If template doesn't exist or is disabled, block
  if (!template || template.enabled === false) {
    return false;
  }

  const formatted = formatNotificationTemplate(template, variables);

  return oneSignalNotifier.send({
    user_id: userId,
    title: formatted.title,
    body: formatted.body,
    notification_type: templateId,
    url: "/",
    data: {
      ...extraData,
      dedup_key: dedupKey,
      trigger_source: triggerSource,
      client_instance_id: getClientInstanceId(),
      app_route: typeof window !== "undefined" ? window.location.pathname : "/",
    },
  });
}

/**
 * Check if a template is enabled (returns false if not found or disabled)
 */
export function isTemplateEnabled(
  templateId: string,
  templates?: NotificationTemplate[]
): boolean {
  const userTemplates = templates || defaultNotificationTemplates;
  const template = getTemplateById(userTemplates, templateId);
  return !!template && template.enabled !== false;
}
