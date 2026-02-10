import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendPayload {
  user_id: string;
  phone_number: string;
  message: string;
  template_type?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const payload: SendPayload = await req.json();

    // Get user's WhatsApp config
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('user_id', payload.user_id)
      .single();

    if (!config || !config.is_connected) {
      return new Response(JSON.stringify({ error: 'WhatsApp not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const evoUrl = (config.api_url || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '');
    const evoKey = config.api_key || Deno.env.get('EVOLUTION_API_KEY') || '';

    // Format phone number (ensure it has country code and @s.whatsapp.net)
    let phone = payload.phone_number.replace(/\D/g, '');
    if (!phone.startsWith('55') && phone.length <= 11) {
      phone = '55' + phone;
    }

    // Send message via Evolution API
    const res = await fetch(`${evoUrl}/message/sendText/${config.instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: evoKey,
      },
      body: JSON.stringify({
        number: phone,
        text: payload.message,
      }),
    });

    const data = await res.json();

    // Log the message
    await supabase.from('whatsapp_logs').insert({
      user_id: payload.user_id,
      template_type: payload.template_type || 'manual',
      phone_number: phone,
      message: payload.message,
      status: res.ok ? 'sent' : 'failed',
      error_message: res.ok ? null : JSON.stringify(data),
    });

    return new Response(JSON.stringify({
      success: res.ok,
      data,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-whatsapp] Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
