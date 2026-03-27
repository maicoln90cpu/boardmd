import { handleCors } from '../_shared/cors.ts';
import { json, error } from '../_shared/response.ts';
import { getAuthenticatedUser, createAdminClient } from '../_shared/auth.ts';
import { parseBody } from '../_shared/validate.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('whatsapp-instance');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { userId, supabase } = await getAuthenticatedUser(req);
    const body = await parseBody(req);
    const { action, api_url, api_key } = body as { action: string; api_url?: string; api_key?: string };

    // Get or use provided config
    let evoUrl = api_url as string | undefined;
    let evoKey = api_key as string | undefined;

    if (!evoUrl || !evoKey) {
      const { data: config } = await supabase
        .from('whatsapp_config').select('*').eq('user_id', userId).single();
      if (config) {
        evoUrl = evoUrl || config.api_url;
        evoKey = evoKey || config.api_key;
      }
    }

    if (!evoUrl) evoUrl = Deno.env.get('EVOLUTION_API_URL');
    if (!evoKey) evoKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evoUrl || !evoKey) {
      return error('Evolution API credentials not configured', 400);
    }

    evoUrl = evoUrl.replace(/\/$/, '');
    const instanceName = `taskflow-${userId.substring(0, 8)}`;

    switch (action) {
      case 'check': {
        try {
          const res = await fetch(`${evoUrl}/instance/connectionState/${instanceName}`, { headers: { apikey: evoKey } });
          const data = await res.json();
          return json({ exists: res.ok, state: data?.instance?.state || data?.state || 'unknown', instanceName });
        } catch {
          return json({ exists: false, state: 'not_found', instanceName });
        }
      }

      case 'create': {
        const res = await fetch(`${evoUrl}/instance/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: evoKey },
          body: JSON.stringify({ instanceName, integration: 'WHATSAPP-BAILEYS', qrcode: true }),
        });
        const data = await res.json();
        await supabase.from('whatsapp_config').upsert({
          user_id: userId, instance_name: instanceName,
          instance_id: data?.instance?.instanceId || null,
          api_url: evoUrl, api_key: evoKey, is_connected: false,
        }, { onConflict: 'user_id' });
        return json({ success: res.ok, instance: data, qrcode: data?.qrcode?.base64 || null });
      }

      case 'connect': {
        const res = await fetch(`${evoUrl}/instance/connect/${instanceName}`, { headers: { apikey: evoKey } });
        const data = await res.json();
        return json({ success: res.ok, qrcode: data?.base64 || data?.qrcode?.base64 || null, state: data?.instance?.state || 'connecting' });
      }

      case 'status': {
        const res = await fetch(`${evoUrl}/instance/connectionState/${instanceName}`, { headers: { apikey: evoKey } });
        const data = await res.json();
        const isConnected = data?.instance?.state === 'open' || data?.state === 'open';
        if (isConnected) await supabase.from('whatsapp_config').update({ is_connected: true }).eq('user_id', userId);
        return json({ connected: isConnected, state: data?.instance?.state || data?.state || 'unknown' });
      }

      case 'disconnect': {
        try { await fetch(`${evoUrl}/instance/logout/${instanceName}`, { method: 'DELETE', headers: { apikey: evoKey } }); } catch (e) { log.warn('Logout error (ignored):', e); }
        try { await fetch(`${evoUrl}/instance/delete/${instanceName}`, { method: 'DELETE', headers: { apikey: evoKey } }); } catch (e) { log.warn('Delete error (ignored):', e); }
        await supabase.from('whatsapp_config').update({ is_connected: false, instance_id: null }).eq('user_id', userId);
        return json({ success: true });
      }

      case 'save_config': {
        await supabase.from('whatsapp_config').upsert({
          user_id: userId, instance_name: instanceName,
          api_url: evoUrl, api_key: evoKey, is_connected: false,
        }, { onConflict: 'user_id' });
        return json({ success: true, instanceName });
      }

      default:
        return error(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    if (err instanceof Response) return err;
    log.error('Error:', err);
    return error(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
