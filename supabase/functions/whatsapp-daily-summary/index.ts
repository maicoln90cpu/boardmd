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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with enabled daily_reminder WhatsApp template
    const { data: templates, error: tplErr } = await supabase
      .from('whatsapp_templates')
      .select('user_id, message_template, send_time')
      .eq('template_type', 'daily_reminder')
      .eq('is_enabled', true);

    if (tplErr) throw tplErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: 'No active daily_reminder templates' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const currentHour = now.getUTCHours() - 3; // BRT = UTC-3
    const adjustedHour = currentHour < 0 ? currentHour + 24 : currentHour;

    const results: { user_id: string; sent: boolean; reason?: string }[] = [];

    for (const tpl of templates) {
      // Check if current hour matches template send_time
      const sendTimeHour = tpl.send_time ? parseInt((tpl.send_time as string).split(':')[0], 10) : 7;
      if (adjustedHour !== sendTimeHour) {
        results.push({ user_id: tpl.user_id, sent: false, reason: `hour mismatch: ${adjustedHour} vs ${sendTimeHour}` });
        continue;
      }

      // Check WhatsApp connection
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('phone_number, is_connected')
        .eq('user_id', tpl.user_id)
        .single();

      if (!config?.is_connected || !config?.phone_number) {
        results.push({ user_id: tpl.user_id, sent: false, reason: 'not connected' });
        continue;
      }

      // Check if already sent today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: existingLogs } = await supabase
        .from('whatsapp_logs')
        .select('id')
        .eq('user_id', tpl.user_id)
        .eq('template_type', 'daily_reminder')
        .eq('status', 'sent')
        .gte('sent_at', todayStart.toISOString())
        .limit(1);

      if (existingLogs && existingLogs.length > 0) {
        results.push({ user_id: tpl.user_id, sent: false, reason: 'already sent today' });
        continue;
      }

      // Count pending tasks
      const { count: pendingCount } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', tpl.user_id)
        .eq('is_completed', false);

      // Count overdue tasks
      const { count: overdueCount } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', tpl.user_id)
        .eq('is_completed', false)
        .lt('due_date', now.toISOString())
        .not('due_date', 'is', null);

      const overdueText = overdueCount && overdueCount > 0
        ? `⚠️ ${overdueCount} tarefa(s) atrasada(s)`
        : '✅ Nenhuma tarefa atrasada!';

      // Replace variables
      let message = tpl.message_template;
      message = message.replace(/\{\{pendingTasks\}\}/g, String(pendingCount || 0));
      message = message.replace(/\{\{overdueText\}\}/g, overdueText);

      // Send via Evolution API
      const evoUrl = (config as any).api_url || Deno.env.get('EVOLUTION_API_URL') || '';
      const evoKey = (config as any).api_key || Deno.env.get('EVOLUTION_API_KEY') || '';

      // Get instance name
      const { data: fullConfig } = await supabase
        .from('whatsapp_config')
        .select('instance_name, api_url, api_key')
        .eq('user_id', tpl.user_id)
        .single();

      if (!fullConfig) {
        results.push({ user_id: tpl.user_id, sent: false, reason: 'no config' });
        continue;
      }

      const baseUrl = (fullConfig.api_url || evoUrl).replace(/\/$/, '');
      const apiKey = fullConfig.api_key || evoKey;

      let phone = config.phone_number.replace(/\D/g, '');
      if (!phone.startsWith('55') && phone.length <= 11) {
        phone = '55' + phone;
      }

      const res = await fetch(`${baseUrl}/message/sendText/${fullConfig.instance_name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ number: phone, text: message }),
      });

      const resData = await res.json();

      // Log
      await supabase.from('whatsapp_logs').insert({
        user_id: tpl.user_id,
        template_type: 'daily_reminder',
        phone_number: phone,
        message,
        status: res.ok ? 'sent' : 'failed',
        error_message: res.ok ? null : JSON.stringify(resData),
      });

      results.push({ user_id: tpl.user_id, sent: res.ok });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[whatsapp-daily-summary] Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
