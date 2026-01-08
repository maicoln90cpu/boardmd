import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  url?: string;
  notification_type?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Construir notificação
    const notificationData: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: payload.title, pt: payload.title },
      contents: { en: payload.body, pt: payload.body },
      url: payload.url || '/',
      data: {
        ...payload.data,
        notification_type: payload.notification_type || 'general',
        timestamp: new Date().toISOString(),
      },
      // Configurações de exibição
      chrome_web_icon: '/pwa-icon.png',
      firefox_icon: '/pwa-icon.png',
      // TTL de 24 horas
      ttl: 86400,
    };

    // Se user_id especificado, enviar para usuário específico
    if (payload.user_id) {
      notificationData.include_aliases = {
        external_id: [payload.user_id],
      };
      notificationData.target_channel = 'push';
      console.log('[send-onesignal] Targeting user:', payload.user_id);
    } else {
      // Enviar para todos os inscritos
      notificationData.included_segments = ['Subscribed Users'];
      console.log('[send-onesignal] Targeting all subscribed users');
    }

    console.log('[send-onesignal] Sending notification:', JSON.stringify(notificationData));

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationData),
    });

    const result = await response.json();
    console.log('[send-onesignal] OneSignal response:', JSON.stringify(result));

    // Registrar log no banco
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && payload.user_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        await supabase.from('push_logs').insert({
          user_id: payload.user_id,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          notification_type: payload.notification_type || 'onesignal',
          status: result.id ? 'sent' : 'failed',
          error_message: result.errors ? JSON.stringify(result.errors) : null,
          device_name: 'OneSignal',
        });
        
        console.log('[send-onesignal] Log saved to database');
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
        recipients: result.recipients,
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
