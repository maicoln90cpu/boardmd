import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_id?: string;
  title: string;
  body: string;
  data?: any;
  url?: string;
  notification_type?: string;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name: string | null;
}

async function sendWebPush(
  subscription: PushSubscription,
  payload: PushPayload,
  vapidKeys: { publicKey: string; privateKey: string; email: string }
) {
  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    url: payload.url || '/',
  });

  // Web Push protocol implementation
  const vapidHeaders = await generateVAPIDHeaders(
    subscription.endpoint,
    vapidKeys
  );

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      ...vapidHeaders,
    },
    body: await encryptPayload(pushPayload, subscription),
  });

  return response;
}

async function generateVAPIDHeaders(
  endpoint: string,
  vapidKeys: { publicKey: string; privateKey: string; email: string }
) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const vapidHeader = `vapid t=${vapidKeys.publicKey}, k=${vapidKeys.publicKey}`;
  
  return {
    Authorization: vapidHeader,
  };
}

async function encryptPayload(payload: string, subscription: PushSubscription) {
  // For production, use proper Web Push encryption
  // This is a simplified version - you may want to use a library like web-push
  const encoder = new TextEncoder();
  return encoder.encode(payload);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get VAPID keys
    const vapidKeys = {
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY')!,
      privateKey: Deno.env.get('VAPID_PRIVATE_KEY')!,
      email: Deno.env.get('VAPID_EMAIL')!,
    };

    if (!vapidKeys.publicKey || !vapidKeys.privateKey || !vapidKeys.email) {
      throw new Error('VAPID keys not configured');
    }

    const payload: PushPayload = await req.json();

    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    
    if (payload.user_id) {
      query = query.eq('user_id', payload.user_id);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSubscription) => {
        const startTime = Date.now();
        try {
          // Use Web Push API compatible library (web-push)
          // For now, using native Notification API simulation
          const webPushPayload = JSON.stringify({
            notification: {
              title: payload.title,
              body: payload.body,
              icon: '/pwa-icon.png',
              badge: '/favicon.png',
              data: {
                url: payload.url || '/',
                ...payload.data,
              },
            },
          });

          // Import web-push functionality
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `vapid t=${vapidKeys.publicKey}, k=${vapidKeys.publicKey}`,
              'TTL': '86400',
            },
            body: webPushPayload,
          });

          const latency = Date.now() - startTime;
          const status = response.ok ? 'delivered' : 'failed';
          const errorMessage = response.ok ? null : await response.text();

          // Log result with enhanced analytics
          await supabase.from('push_logs').insert({
            user_id: sub.user_id,
            title: payload.title,
            body: payload.body,
            status,
            error_message: errorMessage,
            data: payload.data,
            notification_type: payload.notification_type || 'manual',
            device_name: sub.device_name,
            delivered_at: response.ok ? new Date().toISOString() : null,
            latency_ms: latency,
          });

          // Remove expired subscriptions
          if (response.status === 410 || response.status === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            console.log(`Removed expired subscription: ${sub.id}`);
          }

          return { 
            success: response.ok, 
            subscription: sub.id,
            device_name: sub.device_name,
            latency 
          };
        } catch (error) {
          const latency = Date.now() - startTime;
          console.error(`Error sending to ${sub.id}:`, error);
          
          await supabase.from('push_logs').insert({
            user_id: sub.user_id,
            title: payload.title,
            body: payload.body,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            data: payload.data,
            notification_type: payload.notification_type || 'manual',
            device_name: sub.device_name,
            latency_ms: latency,
          });

          return { 
            success: false, 
            subscription: sub.id, 
            device_name: sub.device_name,
            error 
          };
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`Push notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications processed',
        sent: successful,
        failed,
        total: results.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
