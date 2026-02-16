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

      // Check if 0 recipients — fallback to tag filter
      const recipients = (result as any).recipients;
      if ((recipients === 0 || recipients === undefined) && !result.errors) {
        console.warn('[send-onesignal] 0 recipients via external_id, trying fallback by tag user_id');
        usedFallback = true;

        const fallbackData = {
          ...baseData,
          included_segments: ['All'],
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

        await supabase.from('push_logs').insert({
          user_id: payload.user_id,
          title: payload.title,
          body: payload.body,
          data: { ...payload.data, recipients, used_fallback: usedFallback },
          notification_type: payload.notification_type || 'onesignal',
          status: result.id ? (recipients > 0 ? 'sent' : 'no_recipients') : 'failed',
          error_message: result.errors ? JSON.stringify(result.errors) : (recipients === 0 ? 'Nenhum dispositivo encontrado para este usuário' : null),
          device_name: 'OneSignal',
        });

        console.log('[send-onesignal] Log saved. Recipients:', recipients, 'Fallback:', usedFallback);
      } catch (logError) {
        console.error('[send-onesignal] Failed to save log:', logError);
      }
    }

    if (result.errors) {
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
