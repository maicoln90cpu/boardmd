import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { json, error } from '../_shared/response.ts';
import { parseBody } from '../_shared/validate.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('send-onesignal');

interface NotificationPayload {
  user_id?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  url?: string;
  notification_type?: string;
}

async function sendToOneSignal(notificationData: Record<string, unknown>, apiKey: string): Promise<Record<string, unknown>> {
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${apiKey}` },
    body: JSON.stringify(notificationData),
  });
  return await response.json();
}

const DEDUP_WINDOW_HOURS = 2;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      log.error('Missing OneSignal credentials');
      return error('OneSignal not configured', 500);
    }

    const payload = await parseBody<NotificationPayload>(req);
    log.info('Received payload:', JSON.stringify(payload));

    // Dedup check
    const dedupKey = (payload.data as any)?.dedup_key as string | undefined;
    if (dedupKey && payload.user_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const windowStart = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

      const { data: existingDedup } = await supabaseAdmin
        .from('push_logs').select('id, data')
        .eq('user_id', payload.user_id).gte('timestamp', windowStart)
        .in('status', ['sent', 'sent_fallback', 'no_recipients']);

      const isDuplicate = existingDedup?.some(l => (l.data as any)?.dedup_key === dedupKey);
      if (isDuplicate) {
        log.info(`DEDUP: Skipping duplicate for key="${dedupKey}"`);
        await supabaseAdmin.from('push_logs').insert({
          user_id: payload.user_id, title: payload.title, body: payload.body,
          data: { ...payload.data, dedup_key: dedupKey },
          notification_type: payload.notification_type || 'onesignal',
          status: 'dedup_skipped', error_message: `Duplicate within ${DEDUP_WINDOW_HOURS}h window`,
          device_name: 'OneSignal',
        });
        return json({ success: true, dedup_skipped: true, dedup_key: dedupKey });
      }
    }

    const baseData: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: payload.title, pt: payload.title },
      contents: { en: payload.body, pt: payload.body },
      url: payload.url || '/',
      data: { ...payload.data, notification_type: payload.notification_type || 'general', timestamp: new Date().toISOString() },
      chrome_web_icon: '/pwa-icon.png', firefox_icon: '/pwa-icon.png', ttl: 86400,
    };

    let result: Record<string, unknown>;
    let usedFallback = false;

    if (payload.user_id) {
      result = await sendToOneSignal({ ...baseData, include_aliases: { external_id: [payload.user_id] }, target_channel: 'push' }, ONESIGNAL_REST_API_KEY);
      log.info('Attempt 1 response:', JSON.stringify(result));

      const recipients = (result as any).recipients;
      if (recipients === 0 || recipients === undefined || (result.errors && (result.errors as any).invalid_aliases)) {
        log.warn('0 recipients via external_id, trying fallback by tag');
        usedFallback = true;
        result = await sendToOneSignal({ ...baseData, filters: [{ field: 'tag', key: 'user_id', relation: '=', value: payload.user_id }] }, ONESIGNAL_REST_API_KEY);
      }
    } else {
      result = await sendToOneSignal({ ...baseData, included_segments: ['Subscribed Users'] }, ONESIGNAL_REST_API_KEY);
    }

    // Save log
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && payload.user_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const recipients = (result as any).recipients ?? 0;
        let logStatus = 'failed';
        let logError: string | null = result.errors ? JSON.stringify(result.errors) : null;

        if (result.id) {
          if (recipients > 0) { logStatus = 'sent'; }
          else if (usedFallback) { logStatus = 'sent_fallback'; logError = null; }
          else { logStatus = 'no_recipients'; logError = 'Nenhum dispositivo encontrado'; }
        }

        await supabase.from('push_logs').insert({
          user_id: payload.user_id, title: payload.title, body: payload.body,
          data: { ...payload.data, recipients, used_fallback: usedFallback, dedup_key: dedupKey || null },
          notification_type: payload.notification_type || 'onesignal',
          status: logStatus, error_message: logError, device_name: 'OneSignal',
        });
      } catch (logError) { log.error('Failed to save log:', logError); }
    }

    if (result.errors && !usedFallback) {
      log.error('OneSignal errors:', result.errors);
      return json({ success: false, errors: result.errors }, 400);
    }

    return json({ success: true, notification_id: result.id, recipients: (result as any).recipients ?? 0, used_fallback: usedFallback });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error('Error:', err);
    return error(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
