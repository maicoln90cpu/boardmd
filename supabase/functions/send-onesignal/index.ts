import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotificationPayload {
  user_id?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  url?: string;
  notification_type?: string;
}

async function sendToOneSignal(
  notificationData: Record<string, unknown>,
  apiKey: string,
): Promise<Record<string, unknown>> {
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${apiKey}`,
    },
    body: JSON.stringify(notificationData),
  });
  return await response.json();
}

// Dedup window: 2 hours (reduced from 4h for more frequent legitimate alerts)
const DEDUP_WINDOW_HOURS = 2;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('[send-onesignal] Missing OneSignal credentials');
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: NotificationPayload = await req.json();
    console.log('[send-onesignal] Received payload:', JSON.stringify(payload));

    // === DEDUP GLOBAL ===
    const dedupKey = (payload.data as any)?.dedup_key as string | undefined;
    
    if (dedupKey && payload.user_id && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const windowStart = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
      
      const { data: existing } = await supabaseAdmin
        .from('push_logs')
        .select('id')
        .eq('user_id', payload.user_id)
        .gte('timestamp', windowStart)
        .in('status', ['sent', 'sent_fallback', 'no_recipients'])
        .limit(1);
      
      // We need to filter by dedup_key in data jsonb
      // Since we can't do jsonb filter easily, query with notification_type + check data
      const { data: existingDedup } = await supabaseAdmin
        .from('push_logs')
        .select('id, data')
        .eq('user_id', payload.user_id)
        .gte('timestamp', windowStart)
        .in('status', ['sent', 'sent_fallback', 'no_recipients']);
      
      const isDuplicate = existingDedup?.some(log => {
        const logData = log.data as Record<string, unknown> | null;
        return logData && logData.dedup_key === dedupKey;
      });
      
      if (isDuplicate) {
        console.log(`[send-onesignal] DEDUP: Skipping duplicate for key="${dedupKey}"`);
        
        // Log as dedup_skipped
        await supabaseAdmin.from('push_logs').insert({
          user_id: payload.user_id,
          title: payload.title,
          body: payload.body,
          data: { ...payload.data, dedup_key: dedupKey },
          notification_type: payload.notification_type || 'onesignal',
          status: 'dedup_skipped',
          error_message: `Duplicate within ${DEDUP_WINDOW_HOURS}h window`,
          device_name: 'OneSignal',
        });
        
        return new Response(
          JSON.stringify({
            success: true,
            dedup_skipped: true,
            dedup_key: dedupKey,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Base notification data
    const baseData: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: payload.title, pt: payload.title },
      contents: { en: payload.body, pt: payload.body },
      url: payload.url || '/',
      data: {
        ...payload.data,
        notification_type: payload.notification_type || 'general',
        timestamp: new Date().toISOString(),
      },
      chrome_web_icon: '/pwa-icon.png',
      firefox_icon: '/pwa-icon.png',
      ttl: 86400,
    };

    let result: Record<string, unknown>;
    let usedFallback = false;

    if (payload.user_id) {
      // Attempt 1: target by external_id
      const primaryData = {
        ...baseData,
        include_aliases: { external_id: [payload.user_id] },
        target_channel: 'push',
      };

      console.log('[send-onesignal] Attempt 1: targeting by external_id:', payload.user_id);
      result = await sendToOneSignal(primaryData, ONESIGNAL_REST_API_KEY);
      console.log('[send-onesignal] Attempt 1 response:', JSON.stringify(result));

      // Check if 0 recipients or invalid_aliases — fallback to tag filter
      const recipients = (result as any).recipients;
      const hasInvalidAliases = result.errors && (result.errors as any).invalid_aliases;
      if (recipients === 0 || recipients === undefined || hasInvalidAliases) {
        console.warn('[send-onesignal] 0 recipients via external_id, trying fallback by tag user_id');
        usedFallback = true;

        const fallbackData = {
          ...baseData,
          filters: [
            { field: 'tag', key: 'user_id', relation: '=', value: payload.user_id },
          ],
        };

        result = await sendToOneSignal(fallbackData, ONESIGNAL_REST_API_KEY);
        console.log('[send-onesignal] Fallback response:', JSON.stringify(result));
      }
    } else {
      // Send to all subscribed users
      const segmentData = {
        ...baseData,
        included_segments: ['Subscribed Users'],
      };
      console.log('[send-onesignal] Targeting all subscribed users');
      result = await sendToOneSignal(segmentData, ONESIGNAL_REST_API_KEY);
      console.log('[send-onesignal] Response:', JSON.stringify(result));
    }

    // Save log to database
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && payload.user_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const recipients = (result as any).recipients ?? 0;

        // Determine status
        let logStatus = 'failed';
        let logError: string | null = result.errors ? JSON.stringify(result.errors) : null;

        if (result.id) {
          if (recipients > 0) {
            logStatus = 'sent';
          } else if (usedFallback) {
            logStatus = 'sent_fallback';
            logError = null;
          } else {
            logStatus = 'no_recipients';
            logError = 'Nenhum dispositivo encontrado — a notificação pode ter sido entregue via cache do OneSignal';
          }
        }

        await supabase.from('push_logs').insert({
          user_id: payload.user_id,
          title: payload.title,
          body: payload.body,
          data: { ...payload.data, recipients, used_fallback: usedFallback, dedup_key: dedupKey || null },
          notification_type: payload.notification_type || 'onesignal',
          status: logStatus,
          error_message: logError,
          device_name: 'OneSignal',
        });

        console.log('[send-onesignal] Log saved. Recipients:', recipients, 'Fallback:', usedFallback);
      } catch (logError) {
        console.error('[send-onesignal] Failed to save log:', logError);
      }
    }

    if (result.errors && !usedFallback) {
      console.error('[send-onesignal] OneSignal errors:', result.errors);
      return new Response(
        JSON.stringify({ success: false, errors: result.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: result.id,
        recipients: (result as any).recipients ?? 0,
        used_fallback: usedFallback,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-onesignal] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
