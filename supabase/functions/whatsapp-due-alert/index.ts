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
      .select('user_id, message_template, send_time, send_time_2, due_date_hours_before, excluded_column_ids')
      .eq('template_type', 'due_date')
      .eq('is_enabled', true);

    if (tplErr) throw tplErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: 'No active due_date templates' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const currentHour = now.getUTCHours() - 3;
    const adjustedHour = currentHour < 0 ? currentHour + 24 : currentHour;
    const currentMinute = now.getUTCMinutes();

    const results: { user_id: string; task_id?: string; sent: boolean; reason?: string }[] = [];

    for (const tpl of templates) {
      // Check if current time matches send_time or send_time_2 (within 30 min window)
      const matchesTime = (timeStr: string | null): boolean => {
        if (!timeStr) return false;
        const hour = parseInt((timeStr as string).split(':')[0], 10);
        return adjustedHour === hour;
      };

      if (!matchesTime(tpl.send_time) && !matchesTime(tpl.send_time_2)) {
        results.push({ user_id: tpl.user_id, sent: false, reason: 'time mismatch' });
        continue;
      }

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

      const hoursBefore = (tpl as any).due_date_hours_before || 24;
      const excludedIds: string[] = (tpl as any).excluded_column_ids || [];

      // Find tasks with due_date within the window
      const futureLimit = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

      let taskQuery = supabase
        .from('tasks')
        .select('id, title, due_date')
        .eq('user_id', tpl.user_id)
        .eq('is_completed', false)
        .not('due_date', 'is', null)
        .gte('due_date', now.toISOString())
        .lte('due_date', futureLimit.toISOString());

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

      for (const task of tasks) {
        // Check if already sent for this task today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: existingLogs } = await supabase
          .from('whatsapp_logs')
          .select('id')
          .eq('user_id', tpl.user_id)
          .eq('template_type', 'due_date')
          .eq('status', 'sent')
          .gte('sent_at', todayStart.toISOString())
          .ilike('message', `%${task.title}%`)
          .limit(1);

        if (existingLogs && existingLogs.length > 0) {
          results.push({ user_id: tpl.user_id, task_id: task.id, sent: false, reason: 'already sent today' });
          continue;
        }

        // Calculate time remaining
        const dueDate = new Date(task.due_date!);
        const diffMs = dueDate.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const timeRemaining = diffHours > 0
          ? `${diffHours}h${diffMins > 0 ? ` ${diffMins}min` : ''}`
          : `${diffMins} minutos`;

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
          template_type: 'due_date',
          phone_number: phone,
          message,
          status: res.ok ? 'sent' : 'failed',
          error_message: res.ok ? null : JSON.stringify(resData),
        });

        results.push({ user_id: tpl.user_id, task_id: task.id, sent: res.ok });
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
