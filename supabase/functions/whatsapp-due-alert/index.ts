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

    // Get all enabled due_date templates
    const { data: templates, error: tplErr } = await supabase
      .from('whatsapp_templates')
      .select('user_id, message_template, due_date_hours_before, due_date_hours_before_2, excluded_column_ids')
      .eq('template_type', 'due_date')
      .eq('is_enabled', true);

    if (tplErr) throw tplErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: 'No active due_date templates' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    // Brazil is UTC-3 (no DST since 2019)
    const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
    const nowBRT = new Date(now.getTime() + BRT_OFFSET_MS);
    const results: { user_id: string; task_id?: string; sent: boolean; reason?: string; alert_type?: string }[] = [];

    for (const tpl of templates) {
      // Check WhatsApp connection
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('phone_number, is_connected, instance_name, api_url, api_key')
        .eq('user_id', tpl.user_id)
        .single();

      if (!config?.is_connected || !config?.phone_number) {
        results.push({ user_id: tpl.user_id, sent: false, reason: 'not connected' });
        continue;
      }

      const hoursBefore1 = tpl.due_date_hours_before || 24;
      const hoursBefore2 = tpl.due_date_hours_before_2 || null;
      const excludedIds: string[] = tpl.excluded_column_ids || [];

      // Get all non-completed tasks with due_date for this user
      let taskQuery = supabase
        .from('tasks')
        .select('id, title, due_date, column_id')
        .eq('user_id', tpl.user_id)
        .eq('is_completed', false)
        .not('due_date', 'is', null)
        .gte('due_date', now.toISOString());

      if (excludedIds.length > 0) {
        for (const colId of excludedIds) {
          taskQuery = taskQuery.neq('column_id', colId);
        }
      }

      const { data: tasks } = await taskQuery;

      if (!tasks || tasks.length === 0) {
        results.push({ user_id: tpl.user_id, sent: false, reason: 'no tasks due' });
        continue;
      }

      const baseUrl = (config.api_url || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '');
      const apiKey = config.api_key || Deno.env.get('EVOLUTION_API_KEY') || '';

      let phone = config.phone_number.replace(/\D/g, '');
      if (!phone.startsWith('55') && phone.length <= 11) {
        phone = '55' + phone;
      }

      // For each task, check if NOW is within a 30-min window of (due_date - X hours)
      const WINDOW_MS = 30 * 60 * 1000; // 30 min window (cron interval)

      const alertConfigs = [
        { hours: hoursBefore1, label: 'alert_1' },
        ...(hoursBefore2 ? [{ hours: hoursBefore2, label: 'alert_2' }] : []),
      ];

      for (const task of tasks) {
        const dueDate = new Date(task.due_date!);

        for (const alertCfg of alertConfigs) {
          // The alert should fire at: due_date - alertCfg.hours
          const alertTime = new Date(dueDate.getTime() - alertCfg.hours * 60 * 60 * 1000);
          const diffMs = now.getTime() - alertTime.getTime();

          // Only send if we're within the window (0 to WINDOW_MS after the alert time)
          if (diffMs < 0 || diffMs > WINDOW_MS) {
            continue;
          }

          // Check if already sent for this task + alert type today
          // Use BRT midnight for "today" duplicate check
          const todayBRT = new Date(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), nowBRT.getUTCDate());
          const todayStartUTC = new Date(todayBRT.getTime() - BRT_OFFSET_MS);
          const todayStart = todayStartUTC;
          const { data: existingLogs } = await supabase
            .from('whatsapp_logs')
            .select('id')
            .eq('user_id', tpl.user_id)
            .eq('template_type', `due_date_${alertCfg.label}`)
            .eq('status', 'sent')
            .gte('sent_at', todayStart.toISOString())
            .ilike('message', `%${task.title}%`)
            .limit(1);

          if (existingLogs && existingLogs.length > 0) {
            results.push({ user_id: tpl.user_id, task_id: task.id, sent: false, reason: 'already sent', alert_type: alertCfg.label });
            continue;
          }

          // Calculate time remaining
          const remainMs = dueDate.getTime() - now.getTime();
          const remainHours = Math.floor(remainMs / (1000 * 60 * 60));
          const remainMins = Math.floor((remainMs % (1000 * 60 * 60)) / (1000 * 60));
          const timeRemaining = remainHours > 0
            ? `${remainHours}h${remainMins > 0 ? ` ${remainMins}min` : ''}`
            : `${remainMins} minutos`;

          let message = tpl.message_template;
          message = message.replace(/\{\{taskTitle\}\}/g, task.title);
          message = message.replace(/\{\{timeRemaining\}\}/g, timeRemaining);

          const res = await fetch(`${baseUrl}/message/sendText/${config.instance_name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: apiKey },
            body: JSON.stringify({ number: phone, text: message }),
          });

          const resData = await res.json();

          await supabase.from('whatsapp_logs').insert({
            user_id: tpl.user_id,
            template_type: `due_date_${alertCfg.label}`,
            phone_number: phone,
            message,
            status: res.ok ? 'sent' : 'failed',
            error_message: res.ok ? null : JSON.stringify(resData),
          });

          results.push({ user_id: tpl.user_id, task_id: task.id, sent: res.ok, alert_type: alertCfg.label });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[whatsapp-due-alert] Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
