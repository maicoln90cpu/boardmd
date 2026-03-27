import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors } from '../_shared/cors.ts';
import { json, error } from '../_shared/response.ts';
import { parseBody } from '../_shared/validate.ts';
import { createAdminClient } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('send-whatsapp');

interface SendPayload {
  user_id: string;
  phone_number: string;
  message: string;
  template_type?: string;
  retry_log_id?: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createAdminClient();
    const payload = await parseBody<SendPayload>(req);

    const { data: config } = await supabase
      .from('whatsapp_config').select('*').eq('user_id', payload.user_id).single();

    if (!config || !config.is_connected) {
      return error('WhatsApp not connected', 400);
    }

    const evoUrl = (config.api_url || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '');
    const evoKey = config.api_key || Deno.env.get('EVOLUTION_API_KEY') || '';

    let phone = payload.phone_number.replace(/\D/g, '');
    if (!phone.startsWith('55') && phone.length <= 11) phone = '55' + phone;

    const res = await fetch(`${evoUrl}/message/sendText/${config.instance_name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: evoKey },
      body: JSON.stringify({ number: phone, text: payload.message }),
    });

    const data = await res.json();

    if (payload.retry_log_id) {
      await supabase.from('whatsapp_logs').update({
        status: res.ok ? 'sent' : 'failed',
        error_message: res.ok ? null : JSON.stringify(data),
        sent_at: new Date().toISOString(),
      }).eq('id', payload.retry_log_id);

      const { data: currentLog } = await supabase
        .from('whatsapp_logs').select('retry_count').eq('id', payload.retry_log_id).single();
      if (currentLog) {
        await supabase.from('whatsapp_logs').update({ retry_count: (currentLog.retry_count || 0) + 1 }).eq('id', payload.retry_log_id);
      }
    } else {
      await supabase.from('whatsapp_logs').insert({
        user_id: payload.user_id, template_type: payload.template_type || 'manual',
        phone_number: phone, message: payload.message,
        status: res.ok ? 'sent' : 'failed', error_message: res.ok ? null : JSON.stringify(data),
      });
    }

    return json({ success: res.ok, data });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error('Error:', err);
    return error(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
