import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Auth from request
    const authHeader = req.headers.get('authorization');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, api_url, api_key } = body;

    // Get or use provided config
    let evoUrl = api_url;
    let evoKey = api_key;

    if (!evoUrl || !evoKey) {
      // Try from database
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (config) {
        evoUrl = evoUrl || config.api_url;
        evoKey = evoKey || config.api_key;
      }
    }

    // Fallback to env secrets
    if (!evoUrl) evoUrl = Deno.env.get('EVOLUTION_API_URL');
    if (!evoKey) evoKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evoUrl || !evoKey) {
      return new Response(JSON.stringify({ error: 'Evolution API credentials not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Remove trailing slash
    evoUrl = evoUrl.replace(/\/$/, '');
    const instanceName = `boardmd-${user.id.substring(0, 8)}`;

    switch (action) {
      case 'check': {
        // Check if instance exists
        try {
          const res = await fetch(`${evoUrl}/instance/connectionState/${instanceName}`, {
            headers: { apikey: evoKey },
          });
          const data = await res.json();
          return new Response(JSON.stringify({
            exists: res.ok,
            state: data?.instance?.state || data?.state || 'unknown',
            instanceName,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch {
          return new Response(JSON.stringify({ exists: false, state: 'not_found', instanceName }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'create': {
        const res = await fetch(`${evoUrl}/instance/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: evoKey },
          body: JSON.stringify({
            instanceName,
            integration: 'WHATSAPP-BAILEYS',
            qrcode: true,
          }),
        });
        const data = await res.json();

        // Save config
        await supabase.from('whatsapp_config').upsert({
          user_id: user.id,
          instance_name: instanceName,
          instance_id: data?.instance?.instanceId || null,
          api_url: evoUrl,
          api_key: evoKey,
          is_connected: false,
        }, { onConflict: 'user_id' });

        return new Response(JSON.stringify({
          success: res.ok,
          instance: data,
          qrcode: data?.qrcode?.base64 || null,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'connect': {
        const res = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
          headers: { apikey: evoKey },
        });
        const data = await res.json();

        return new Response(JSON.stringify({
          success: res.ok,
          qrcode: data?.base64 || data?.qrcode?.base64 || null,
          state: data?.instance?.state || 'connecting',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'status': {
        const res = await fetch(`${evoUrl}/instance/connectionState/${instanceName}`, {
          headers: { apikey: evoKey },
        });
        const data = await res.json();
        const isConnected = data?.instance?.state === 'open' || data?.state === 'open';

        // Update config
        if (isConnected) {
          await supabase.from('whatsapp_config')
            .update({ is_connected: true })
            .eq('user_id', user.id);
        }

        return new Response(JSON.stringify({
          connected: isConnected,
          state: data?.instance?.state || data?.state || 'unknown',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'disconnect': {
        // 1. Logout da sessão
        try {
          await fetch(`${evoUrl}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: { apikey: evoKey },
          });
        } catch (e) {
          console.log('[whatsapp-instance] Logout error (ignored):', e);
        }

        // 2. Deletar instância completamente da Evolution API
        try {
          await fetch(`${evoUrl}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: { apikey: evoKey },
          });
        } catch (e) {
          console.log('[whatsapp-instance] Delete instance error (ignored):', e);
        }

        // 3. Limpar config no banco
        await supabase.from('whatsapp_config')
          .update({ is_connected: false, instance_id: null })
          .eq('user_id', user.id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'save_config': {
        await supabase.from('whatsapp_config').upsert({
          user_id: user.id,
          instance_name: instanceName,
          api_url: evoUrl,
          api_key: evoKey,
          is_connected: false,
        }, { onConflict: 'user_id' });

        return new Response(JSON.stringify({ success: true, instanceName }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[whatsapp-instance] Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
