import { supabase } from "@/integrations/supabase/client";
import { logger, prodLogger } from "@/lib/logger";

export type AuditEventType = 
  | 'login'
  | 'logout'
  | 'delete_account'
  | 'password_change'
  | 'data_export'
  | 'failed_login'
  | 'signup';

interface AuditLogData {
  eventType: AuditEventType;
  metadata?: Record<string, unknown>;
}

export const logAuditEvent = async ({ eventType, metadata = {} }: AuditLogData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      logger.warn('[audit] No user found for audit log');
      return;
    }

    // Capturar informações do navegador
    const userAgent = navigator.userAgent;

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        event_type: eventType,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
        user_agent: userAgent,
        // ip_address será capturado pelo edge function se necessário
      });

    if (error) {
      prodLogger.error('[audit] Failed to log event:', error);
    } else {
      logger.log(`[audit] Event logged: ${eventType}`);
    }
  } catch (err) {
    prodLogger.error('[audit] Error logging event:', err);
  }
};

export const useAuditLog = () => {
  return { logAuditEvent };
};
