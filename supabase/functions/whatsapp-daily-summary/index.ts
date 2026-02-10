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

    // Get all enabled daily_reminder and daily_report templates
    const { data: templates, error: tplErr } = await supabase
      .from('whatsapp_templates')
      .select('user_id, template_type, message_template, send_time, excluded_column_ids')
      .in('template_type', ['daily_reminder', 'daily_report'])
      .eq('is_enabled', true);

    if (tplErr) throw tplErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: 'No active templates' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    // Brazil is UTC-3 (no DST since 2019)
    const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
    const nowBRT = new Date(now.getTime() + BRT_OFFSET_MS);
    const currentHour = nowBRT.getUTCHours();
    const adjustedHour = currentHour;

    const results: { user_id: string; template_type: string; sent: boolean; reason?: string }[] = [];

    for (const tpl of templates) {
      const sendTimeHour = tpl.send_time ? parseInt((tpl.send_time as string).split(':')[0], 10) : (tpl.template_type === 'daily_report' ? 23 : 7);
      if (adjustedHour !== sendTimeHour) {
        results.push({ user_id: tpl.user_id, template_type: tpl.template_type, sent: false, reason: `hour mismatch: ${adjustedHour} vs ${sendTimeHour}` });
        continue;
      }

      // Check WhatsApp connection
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('phone_number, is_connected, instance_name, api_url, api_key')
        .eq('user_id', tpl.user_id)
        .single();

      if (!config?.is_connected || !config?.phone_number) {
        results.push({ user_id: tpl.user_id, template_type: tpl.template_type, sent: false, reason: 'not connected' });
        continue;
      }

      // Check if already sent today
      // Use BRT midnight for "today" check
      const todayBRT = new Date(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), nowBRT.getUTCDate());
      // Convert BRT midnight back to UTC for DB query
      const todayStartUTC = new Date(todayBRT.getTime() - BRT_OFFSET_MS);
      const todayStart = todayStartUTC;
      const { data: existingLogs } = await supabase
        .from('whatsapp_logs')
        .select('id')
        .eq('user_id', tpl.user_id)
        .eq('template_type', tpl.template_type)
        .eq('status', 'sent')
        .gte('sent_at', todayStart.toISOString())
        .limit(1);

      if (existingLogs && existingLogs.length > 0) {
        results.push({ user_id: tpl.user_id, template_type: tpl.template_type, sent: false, reason: 'already sent today' });
        continue;
      }

      const excludedIds: string[] = (tpl as any).excluded_column_ids || [];

      // Build column filter
      let taskQuery = supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', tpl.user_id)
        .eq('is_completed', false);

      if (excludedIds.length > 0) {
        // Exclude tasks in specific columns
        for (const colId of excludedIds) {
          taskQuery = taskQuery.neq('column_id', colId);
        }
      }

      let message = tpl.message_template;

      if (tpl.template_type === 'daily_reminder') {
        const { count: pendingCount } = await taskQuery;

        let overdueQuery = supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', tpl.user_id)
          .eq('is_completed', false)
          .lt('due_date', now.toISOString())
          .not('due_date', 'is', null);

        if (excludedIds.length > 0) {
          for (const colId of excludedIds) {
            overdueQuery = overdueQuery.neq('column_id', colId);
          }
        }
        const { count: overdueCount } = await overdueQuery;

        const overdueText = overdueCount && overdueCount > 0
          ? `⚠️ ${overdueCount} tarefa(s) atrasada(s)`
          : '✅ Nenhuma tarefa atrasada!';

        message = message.replace(/\{\{pendingTasks\}\}/g, String(pendingCount || 0));
        message = message.replace(/\{\{overdueText\}\}/g, overdueText);

      } else if (tpl.template_type === 'daily_report') {
        // Total tasks (not completed) respecting excluded columns
        const { count: pendingCount } = await taskQuery;

        // Completed today
        // Use BRT date boundaries for "completed today" query
        const todayBRTStart = new Date(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), nowBRT.getUTCDate());
        const todayBRTEnd = new Date(todayBRTStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        // Convert BRT boundaries to UTC for DB query
        const todayStartUTCReport = new Date(todayBRTStart.getTime() - BRT_OFFSET_MS);
        const todayEndUTCReport = new Date(todayBRTEnd.getTime() - BRT_OFFSET_MS);
        let completedQuery = supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', tpl.user_id)
          .eq('is_completed', true)
          .gte('updated_at', todayStartUTCReport.toISOString())
          .lte('updated_at', todayEndUTCReport.toISOString());

        if (excludedIds.length > 0) {
          for (const colId of excludedIds) {
            completedQuery = completedQuery.neq('column_id', colId);
          }
        }
        const { count: completedToday } = await completedQuery;

        const total = (pendingCount || 0) + (completedToday || 0);
        const percent = total > 0 ? Math.round(((completedToday || 0) / total) * 100) : 0;

        // Progress bar
        const filled = Math.round(percent / 10);
        const progressBar = '▓'.repeat(filled) + '░'.repeat(10 - filled) + ` ${percent}%`;

        // Overdue
        let overdueQuery = supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', tpl.user_id)
          .eq('is_completed', false)
          .lt('due_date', now.toISOString())
          .not('due_date', 'is', null);
        if (excludedIds.length > 0) {
          for (const colId of excludedIds) {
            overdueQuery = overdueQuery.neq('column_id', colId);
          }
        }
        const { count: overdueCount } = await overdueQuery;
        const overdueText = overdueCount && overdueCount > 0
          ? `⚠️ ${overdueCount} tarefa(s) atrasada(s)`
          : '✅ Nenhuma tarefa atrasada!';

        message = message.replace(/\{\{completedToday\}\}/g, String(completedToday || 0));
        message = message.replace(/\{\{totalTasks\}\}/g, String(total));
        message = message.replace(/\{\{completionPercent\}\}/g, String(percent));
        message = message.replace(/\{\{pendingTasks\}\}/g, String(pendingCount || 0));
        message = message.replace(/\{\{overdueText\}\}/g, overdueText);
        message = message.replace(/\{\{progressBar\}\}/g, progressBar);
      }

      // Send via Evolution API
      const baseUrl = (config.api_url || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '');
      const apiKey = config.api_key || Deno.env.get('EVOLUTION_API_KEY') || '';

      let phone = config.phone_number.replace(/\D/g, '');
      if (!phone.startsWith('55') && phone.length <= 11) {
        phone = '55' + phone;
      }

      const res = await fetch(`${baseUrl}/message/sendText/${config.instance_name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ number: phone, text: message }),
      });

      const resData = await res.json();

      await supabase.from('whatsapp_logs').insert({
        user_id: tpl.user_id,
        template_type: tpl.template_type,
        phone_number: phone,
        message,
        status: res.ok ? 'sent' : 'failed',
        error_message: res.ok ? null : JSON.stringify(resData),
      });

      results.push({ user_id: tpl.user_id, template_type: tpl.template_type, sent: res.ok });
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
