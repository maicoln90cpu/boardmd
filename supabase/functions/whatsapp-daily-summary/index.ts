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

    // BRT offset (UTC-3)
    const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
    const now = new Date();
    const nowBRT = new Date(now.getTime() + BRT_OFFSET_MS);
    const currentHour = nowBRT.getUTCHours();
    const currentWeekday = nowBRT.getUTCDay(); // 0=Sun, 1=Mon...

    // BRT midnight boundaries
    const todayBRTMidnight = new Date(Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), nowBRT.getUTCDate()));
    const todayStartUTC = new Date(todayBRTMidnight.getTime() - BRT_OFFSET_MS); // 03:00 UTC
    const todayEndUTC = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Supported template types for this cron function
    const supportedTypes = ['daily_reminder', 'daily_report', 'daily_motivation', 'weekly_summary', 'task_overdue'];

    const { data: templates, error: tplErr } = await supabase
      .from('whatsapp_templates')
      .select('user_id, template_type, message_template, send_time, send_time_2, excluded_column_ids')
      .in('template_type', supportedTypes)
      .eq('is_enabled', true);

    if (tplErr) throw tplErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: 'No active templates' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { user_id: string; template_type: string; sent: boolean; reason?: string }[] = [];

    for (const tpl of templates) {
      // === HOUR CHECK ===
      if (tpl.template_type !== 'task_overdue') {
        const sendTimeHour = tpl.send_time
          ? parseInt((tpl.send_time as string).split(':')[0], 10)
          : getDefaultHour(tpl.template_type);

        if (currentHour !== sendTimeHour) {
          results.push({ user_id: tpl.user_id, template_type: tpl.template_type, sent: false, reason: `hour mismatch: ${currentHour} vs ${sendTimeHour}` });
          continue;
        }
      }

      // === WEEKLY: DAY CHECK ===
      if (tpl.template_type === 'weekly_summary') {
        const targetDay = tpl.send_time_2 ? parseInt(tpl.send_time_2 as string, 10) : 1;
        if (currentWeekday !== targetDay) {
          results.push({ user_id: tpl.user_id, template_type: tpl.template_type, sent: false, reason: `weekday mismatch: ${currentWeekday} vs ${targetDay}` });
          continue;
        }
      }

      // === CONNECTION CHECK ===
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('phone_number, is_connected, instance_name, api_url, api_key')
        .eq('user_id', tpl.user_id)
        .single();

      if (!config?.is_connected || !config?.phone_number) {
        results.push({ user_id: tpl.user_id, template_type: tpl.template_type, sent: false, reason: 'not connected' });
        continue;
      }

      // === DEDUP CHECK (skip for task_overdue which dedupes per-task) ===
      if (tpl.template_type !== 'task_overdue') {
        const { data: existingLogs } = await supabase
          .from('whatsapp_logs')
          .select('id')
          .eq('user_id', tpl.user_id)
          .eq('template_type', tpl.template_type)
          .eq('status', 'sent')
          .gte('sent_at', todayStartUTC.toISOString())
          .limit(1);

        if (existingLogs && existingLogs.length > 0) {
          results.push({ user_id: tpl.user_id, template_type: tpl.template_type, sent: false, reason: 'already sent today' });
          continue;
        }
      }

      const excludedIds: string[] = (tpl as any).excluded_column_ids || [];

      // === BUILD MESSAGE ===
      let messages: { message: string; logType: string }[] = [];

      if (tpl.template_type === 'task_overdue') {
        messages = await buildOverdueMessages(supabase, tpl, excludedIds, now, todayStartUTC);
      } else {
        const msg = await buildTemplateMessage(supabase, tpl, excludedIds, now, todayStartUTC, todayEndUTC);
        if (msg) messages = [{ message: msg, logType: tpl.template_type }];
      }

      if (messages.length === 0) {
        results.push({ user_id: tpl.user_id, template_type: tpl.template_type, sent: false, reason: 'no message to send' });
        continue;
      }

      // === SEND ===
      const baseUrl = (config.api_url || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '');
      const apiKey = config.api_key || Deno.env.get('EVOLUTION_API_KEY') || '';
      let phone = config.phone_number.replace(/\D/g, '');
      if (!phone.startsWith('55') && phone.length <= 11) phone = '55' + phone;

      for (const { message, logType } of messages) {
        const res = await fetch(`${baseUrl}/message/sendText/${config.instance_name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: apiKey },
          body: JSON.stringify({ number: phone, text: message }),
        });
        const resData = await res.json();

        await supabase.from('whatsapp_logs').insert({
          user_id: tpl.user_id,
          template_type: logType,
          phone_number: phone,
          message,
          status: res.ok ? 'sent' : 'failed',
          error_message: res.ok ? null : JSON.stringify(resData),
        });

        results.push({ user_id: tpl.user_id, template_type: logType, sent: res.ok });
      }
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

function getDefaultHour(templateType: string): number {
  switch (templateType) {
    case 'daily_reminder': return 8;
    case 'daily_report': return 23;
    case 'daily_motivation': return 7;
    case 'weekly_summary': return 9;
    default: return 8;
  }
}

async function buildTemplateMessage(
  supabase: any, tpl: any, excludedIds: string[],
  now: Date, todayStartUTC: Date, todayEndUTC: Date
): Promise<string | null> {
  let message = tpl.message_template;
  const userId = tpl.user_id;

  // Pending tasks query builder
  const buildPendingQuery = () => {
    let q = supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_completed', false);
    for (const colId of excludedIds) q = q.neq('column_id', colId);
    return q;
  };

  // Overdue query builder
  const buildOverdueQuery = () => {
    let q = supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_completed', false)
      .lt('due_date', now.toISOString()).not('due_date', 'is', null);
    for (const colId of excludedIds) q = q.neq('column_id', colId);
    return q;
  };

  if (tpl.template_type === 'daily_reminder' || tpl.template_type === 'daily_motivation') {
    const { count: pendingCount } = await buildPendingQuery();
    const { count: overdueCount } = await buildOverdueQuery();

    const overdueText = overdueCount && overdueCount > 0
      ? `⚠️ ${overdueCount} tarefa(s) atrasada(s)` : '✅ Nenhuma tarefa atrasada!';

    message = message.replace(/\{\{pendingTasks\}\}/g, String(pendingCount || 0));
    message = message.replace(/\{\{overdueText\}\}/g, overdueText);

    // daily_motivation extras
    if (tpl.template_type === 'daily_motivation') {
      // Top priority task
      let topQ = supabase.from('tasks').select('title, priority')
        .eq('user_id', userId).eq('is_completed', false)
        .order('priority', { ascending: true }).limit(1);
      for (const colId of excludedIds) topQ = topQ.neq('column_id', colId);
      const { data: topTask } = await topQ;
      const topPriority = topTask?.[0]?.title || 'Nenhuma tarefa prioritária';

      // Streak
      const { data: statsData } = await supabase.from('user_stats')
        .select('current_streak').eq('user_id', userId).single();
      const streak = statsData?.current_streak || 0;

      message = message.replace(/\{\{topPriority\}\}/g, topPriority);
      message = message.replace(/\{\{streak\}\}/g, String(streak));
    }

  } else if (tpl.template_type === 'daily_report') {
    const { count: pendingCount } = await buildPendingQuery();

    let completedQuery = supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_completed', true)
      .gte('updated_at', todayStartUTC.toISOString())
      .lte('updated_at', todayEndUTC.toISOString());
    for (const colId of excludedIds) completedQuery = completedQuery.neq('column_id', colId);
    const { count: completedToday } = await completedQuery;

    const total = (pendingCount || 0) + (completedToday || 0);
    const percent = total > 0 ? Math.round(((completedToday || 0) / total) * 100) : 0;
    const filled = Math.round(percent / 10);
    const progressBar = '▓'.repeat(filled) + '░'.repeat(10 - filled) + ` ${percent}%`;

    const { count: overdueCount } = await buildOverdueQuery();
    const overdueText = overdueCount && overdueCount > 0
      ? `⚠️ ${overdueCount} tarefa(s) atrasada(s)` : '✅ Nenhuma tarefa atrasada!';

    message = message.replace(/\{\{completedToday\}\}/g, String(completedToday || 0));
    message = message.replace(/\{\{totalTasks\}\}/g, String(total));
    message = message.replace(/\{\{completionPercent\}\}/g, String(percent));
    message = message.replace(/\{\{pendingTasks\}\}/g, String(pendingCount || 0));
    message = message.replace(/\{\{overdueText\}\}/g, overdueText);
    message = message.replace(/\{\{progressBar\}\}/g, progressBar);

  } else if (tpl.template_type === 'weekly_summary') {
    // Completed this week (last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let weekQuery = supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_completed', true)
      .gte('updated_at', weekAgo.toISOString());
    for (const colId of excludedIds) weekQuery = weekQuery.neq('column_id', colId);
    const { count: completedWeek } = await weekQuery;

    const { count: pendingCount } = await buildPendingQuery();

    // Streak
    const { data: statsData } = await supabase.from('user_stats')
      .select('current_streak').eq('user_id', userId).single();
    const streak = statsData?.current_streak || 0;

    // Top category
    let catQuery = supabase.from('tasks').select('category_id, categories(name)')
      .eq('user_id', userId).eq('is_completed', true)
      .gte('updated_at', weekAgo.toISOString()).limit(100);
    const { data: catTasks } = await catQuery;
    const catCounts: Record<string, number> = {};
    (catTasks || []).forEach((t: any) => {
      const name = t.categories?.name || 'Sem categoria';
      catCounts[name] = (catCounts[name] || 0) + 1;
    });
    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    message = message.replace(/\{\{completedWeek\}\}/g, String(completedWeek || 0));
    message = message.replace(/\{\{pendingTasks\}\}/g, String(pendingCount || 0));
    message = message.replace(/\{\{streak\}\}/g, String(streak));
    message = message.replace(/\{\{topCategory\}\}/g, topCategory);
  }

  return message;
}

async function buildOverdueMessages(
  supabase: any, tpl: any, excludedIds: string[],
  now: Date, todayStartUTC: Date
): Promise<{ message: string; logType: string }[]> {
  const userId = tpl.user_id;

  // Find overdue tasks
  let q = supabase.from('tasks').select('id, title, due_date')
    .eq('user_id', userId).eq('is_completed', false)
    .lt('due_date', now.toISOString()).not('due_date', 'is', null)
    .limit(50);
  for (const colId of excludedIds) q = q.neq('column_id', colId);
  const { data: overdueTasks } = await q;

  if (!overdueTasks || overdueTasks.length === 0) return [];

  // Total overdue count
  const totalOverdue = overdueTasks.length;
  const messages: { message: string; logType: string }[] = [];

  for (const task of overdueTasks) {
    // Dedup: check if already notified today for this task
    const { data: logs } = await supabase.from('whatsapp_logs')
      .select('id').eq('user_id', userId)
      .eq('template_type', `task_overdue_${task.id}`)
      .eq('status', 'sent')
      .gte('sent_at', todayStartUTC.toISOString())
      .limit(1);

    if (logs && logs.length > 0) continue;

    // Calculate overdue time
    const overdueMs = now.getTime() - new Date(task.due_date).getTime();
    const overdueHours = Math.floor(overdueMs / (1000 * 60 * 60));
    const overdueDays = Math.floor(overdueHours / 24);
    const overdueTime = overdueDays > 0
      ? `${overdueDays} dia(s) e ${overdueHours % 24} hora(s)`
      : `${overdueHours} hora(s)`;

    let msg = tpl.message_template;
    msg = msg.replace(/\{\{taskTitle\}\}/g, task.title);
    msg = msg.replace(/\{\{overdueTime\}\}/g, overdueTime);
    msg = msg.replace(/\{\{totalOverdue\}\}/g, String(totalOverdue));

    messages.push({ message: msg, logType: `task_overdue_${task.id}` });
  }

  // Limit to 3 messages per run to avoid spam
  return messages.slice(0, 3);
}
