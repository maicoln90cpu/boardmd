import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { handleCors } from '../_shared/cors.ts';
import { json, error } from '../_shared/response.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('whatsapp-daily-summary');

// ============================================================
// MOTIVATIONAL QUOTES (30)
// ============================================================
const MOTIVATIONAL_QUOTES = [
  { text: "A educação é a arma mais poderosa que você pode usar para mudar o mundo.", author: "Nelson Mandela" },
  { text: "O sucesso nasce do querer, da determinação e persistência em se chegar a um objetivo.", author: "José de Alencar" },
  { text: "Não é a força, mas a constância dos bons sentimentos que conduz os homens à felicidade.", author: "Friedrich Nietzsche" },
  { text: "A única maneira de fazer um excelente trabalho é amar o que você faz.", author: "Steve Jobs" },
  { text: "O futuro pertence àqueles que acreditam na beleza de seus sonhos.", author: "Eleanor Roosevelt" },
  { text: "Seja a mudança que você deseja ver no mundo.", author: "Mahatma Gandhi" },
  { text: "A persistência é o caminho do êxito.", author: "Charles Chaplin" },
  { text: "Grandes realizações não são feitas por impulso, mas por uma soma de pequenas realizações.", author: "Vincent Van Gogh" },
  { text: "Acredite que você pode, assim você já está no meio do caminho.", author: "Theodore Roosevelt" },
  { text: "Cada dia é uma nova chance para mudar sua vida.", author: "Autor desconhecido" },
  { text: "O único limite para a nossa realização de amanhã serão as nossas dúvidas de hoje.", author: "Franklin D. Roosevelt" },
  { text: "Tudo o que um sonho precisa para ser realizado é alguém que acredite que ele possa ser realizado.", author: "Roberto Shinyashiki" },
  { text: "Você nunca sabe que resultados virão da sua ação. Mas se você não fizer nada, não existirão resultados.", author: "Mahatma Gandhi" },
  { text: "A disciplina é a ponte entre metas e realizações.", author: "Jim Rohn" },
  { text: "Não espere por circunstâncias ideais. Elas nunca virão.", author: "Janet Erskine Stuart" },
  { text: "O insucesso é apenas uma oportunidade para recomeçar com mais inteligência.", author: "Henry Ford" },
  { text: "Quanto maior a dificuldade, maior a glória.", author: "Cícero" },
  { text: "Coragem não é a ausência de medo, mas o triunfo sobre ele.", author: "Nelson Mandela" },
  { text: "Somente aqueles que ousam falhar grandemente podem alcançar grandes coisas.", author: "Robert F. Kennedy" },
  { text: "O que não nos mata nos fortalece.", author: "Friedrich Nietzsche" },
  { text: "A melhor maneira de prever o futuro é criá-lo.", author: "Peter Drucker" },
  { text: "Dificuldades preparam pessoas comuns para destinos extraordinários.", author: "C.S. Lewis" },
  { text: "Você deve ser a mudança que deseja ver no mundo.", author: "Mahatma Gandhi" },
  { text: "Nada é impossível para aqueles que persistem.", author: "Alexandre, o Grande" },
  { text: "A vida é 10% o que acontece com você e 90% como você reage a isso.", author: "Charles R. Swindoll" },
  { text: "Faça o que puder, com o que tiver, onde estiver.", author: "Theodore Roosevelt" },
  { text: "O êxito da vida não se mede pelo caminho que você conquistou, mas sim pelas dificuldades que superou.", author: "Abraham Lincoln" },
  { text: "Não tenha medo de desistir do bom para perseguir o ótimo.", author: "John D. Rockefeller" },
  { text: "A verdadeira motivação vem de realização, desenvolvimento pessoal, satisfação no trabalho e reconhecimento.", author: "Frederick Herzberg" },
  { text: "Sua única limitação é aquela que você impõe à sua própria mente.", author: "Napoleon Hill" },
];

// ============================================================
// BIBLE QUOTES (30)
// ============================================================
const BIBLE_QUOTES = [
  { text: "O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha. Não maltrata, não procura seus interesses, não se ira facilmente, não guarda rancor.", ref: "1 Coríntios 13:4-5" },
  { text: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", ref: "João 3:16" },
  { text: "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.", ref: "Provérbios 3:5" },
  { text: "O Senhor é o meu pastor; nada me faltará.", ref: "Salmos 23:1" },
  { text: "Mas os que esperam no Senhor renovarão as suas forças, subirão com asas como águias; correrão e não se cansarão; caminharão e não se fatigarão.", ref: "Isaías 40:31" },
  { text: "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.", ref: "Salmos 37:5" },
  { text: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que esperais.", ref: "Jeremias 29:11" },
  { text: "Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus; eu te fortaleço, e te ajudo, e te sustento com a minha destra fiel.", ref: "Isaías 41:10" },
  { text: "E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus.", ref: "Romanos 8:28" },
  { text: "Sê forte e corajoso; não temas, nem te espantes, porque o Senhor teu Deus é contigo por onde quer que andares.", ref: "Josué 1:9" },
  { text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.", ref: "Salmos 46:1" },
  { text: "O Senhor é a minha luz e a minha salvação; a quem temerei?", ref: "Salmos 27:1" },
  { text: "Lança o teu cuidado sobre o Senhor, e ele te susterá; nunca permitirá que o justo seja abalado.", ref: "Salmos 55:22" },
  { text: "Bem-aventurados os que têm fome e sede de justiça, porque eles serão fartos.", ref: "Mateus 5:6" },
  { text: "Pois onde estiver o vosso tesouro, aí estará também o vosso coração.", ref: "Mateus 6:21" },
  { text: "A fé é a certeza daquilo que esperamos e a prova das coisas que não vemos.", ref: "Hebreus 11:1" },
  { text: "Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.", ref: "Eclesiastes 3:1" },
  { text: "O choro pode durar uma noite, mas a alegria vem pela manhã.", ref: "Salmos 30:5" },
  { text: "Bendize, ó minha alma, ao Senhor, e tudo o que há em mim bendiga o seu santo nome.", ref: "Salmos 103:1" },
  { text: "Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.", ref: "Salmos 91:1" },
  { text: "Antes de te formar no ventre materno, eu te conheci; antes que saísses da madre, te consagrei.", ref: "Jeremias 1:5" },
  { text: "O Senhor pelejará por vós, e vós vos calareis.", ref: "Êxodo 14:14" },
  { text: "Não se amoldem ao padrão deste mundo, mas transformem-se pela renovação da sua mente.", ref: "Romanos 12:2" },
  { text: "Deem graças em todas as circunstâncias, pois esta é a vontade de Deus para vocês em Cristo Jesus.", ref: "1 Tessalonicenses 5:18" },
  { text: "Peçam e lhes será dado; busquem e encontrarão; batam e a porta lhes será aberta.", ref: "Mateus 7:7" },
  { text: "Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo.", ref: "Salmos 23:4" },
  { text: "Sede fortes e corajosos. Não temais, nem vos aterrorizeis; pois o Senhor vosso Deus está convosco por onde quer que fordes.", ref: "Deuteronômio 31:6" },
  { text: "Eu sou a videira; vocês são os ramos. Se alguém permanecer em mim e eu nele, esse dará muitos frutos.", ref: "João 15:5" },
  { text: "Ó Senhor, tu me sondas e me conheces. Sabes quando me sento e quando me levanto; de longe percebes os meus pensamentos.", ref: "Salmos 139:1-2" },
];

// ============================================================
// HELPER: Format date in BRT (dd/MM HH:mm)
// ============================================================
function formatDateBRT(dateStr: string | null): string {
  if (!dateStr) return 'Sem prazo';
  const d = new Date(dateStr);
  const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
  const brt = new Date(d.getTime() + BRT_OFFSET_MS);
  const dd = String(brt.getUTCDate()).padStart(2, '0');
  const mm = String(brt.getUTCMonth() + 1).padStart(2, '0');
  const hh = String(brt.getUTCHours()).padStart(2, '0');
  const min = String(brt.getUTCMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${min}`;
}

function formatTimeBRT(dateStr: string): string {
  const d = new Date(dateStr);
  const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
  const brt = new Date(d.getTime() + BRT_OFFSET_MS);
  const hh = String(brt.getUTCHours()).padStart(2, '0');
  const min = String(brt.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

function getPriorityEmoji(priority: string | null): string {
  switch (priority) {
    case 'high': return '🔴';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
  }
}

function getPriorityOrder(priority: string | null): number {
  switch (priority) {
    case 'high': return 0;
    case 'medium': return 1;
    case 'low': return 2;
    default: return 3;
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse request body for force/type params
    let bodyParams: any = {};
    try { bodyParams = await req.json(); } catch { /* no body */ }
    const forceMode = bodyParams.force === true;
    const filterType = bodyParams.type as string | undefined;
    const filterUserId = bodyParams.user_id as string | undefined;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // BRT offset (UTC-3)
    const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
    const now = new Date();
    const nowBRT = new Date(now.getTime() + BRT_OFFSET_MS);
    const currentHour = nowBRT.getUTCHours();
    const currentWeekday = nowBRT.getUTCDay();

    // BRT midnight boundaries
    const todayBRTMidnight = new Date(Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), nowBRT.getUTCDate()));
    const todayStartUTC = new Date(todayBRTMidnight.getTime() - BRT_OFFSET_MS);
    const todayEndUTC = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Format today's date in BRT for display
    const todayDD = String(nowBRT.getUTCDate()).padStart(2, '0');
    const todayMM = String(nowBRT.getUTCMonth() + 1).padStart(2, '0');
    const todayDateStr = `${todayDD}/${todayMM}`;

    const supportedTypes = ['daily_reminder', 'daily_report', 'daily_motivation', 'weekly_summary', 'task_overdue'];

    let tplQuery = supabase
      .from('whatsapp_templates')
      .select('user_id, template_type, message_template, send_time, send_time_2, excluded_column_ids')
      .eq('is_enabled', true);

    // Filter by specific type and user if provided
    if (filterType && supportedTypes.includes(filterType)) {
      tplQuery = tplQuery.eq('template_type', filterType);
    } else {
      tplQuery = tplQuery.in('template_type', supportedTypes);
    }
    if (filterUserId) {
      tplQuery = tplQuery.eq('user_id', filterUserId);
    }

    const { data: templates, error: tplErr } = await tplQuery;

    if (tplErr) throw tplErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: 'No active templates' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { user_id: string; template_type: string; sent: boolean; reason?: string }[] = [];

    for (const tpl of templates) {
      // === HOUR CHECK (skip in force mode) ===
      if (!forceMode && tpl.template_type !== 'task_overdue') {
        const sendTimeHour = tpl.send_time
          ? parseInt((tpl.send_time as string).split(':')[0], 10)
          : getDefaultHour(tpl.template_type);

        if (currentHour !== sendTimeHour) {
          results.push({ user_id: tpl.user_id, template_type: tpl.template_type, sent: false, reason: `hour mismatch: ${currentHour} vs ${sendTimeHour}` });
          continue;
        }
      }

      // === WEEKLY: DAY CHECK (skip in force mode) ===
      if (!forceMode && tpl.template_type === 'weekly_summary') {
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

      // === DEDUP CHECK (skip in force mode) ===
      if (!forceMode && tpl.template_type !== 'task_overdue') {
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
        const msgs = await buildTemplateMessages(supabase, tpl, excludedIds, now, todayStartUTC, todayEndUTC, todayDateStr);
        messages = msgs;
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

        // Small delay between messages to avoid rate limiting
        if (messages.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
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

// ============================================================
// BUILD TEMPLATE MESSAGES (returns array for multi-message support)
// ============================================================
async function buildTemplateMessages(
  supabase: any, tpl: any, excludedIds: string[],
  now: Date, todayStartUTC: Date, todayEndUTC: Date, todayDateStr: string
): Promise<{ message: string; logType: string }[]> {
  let message = tpl.message_template;
  const userId = tpl.user_id;

  // Helper: add column exclusions to query
  const applyExclusions = (q: any) => {
    for (const colId of excludedIds) q = q.neq('column_id', colId);
    return q;
  };

  // =============================================
  // DAILY MOTIVATION — random quotes only
  // =============================================
  if (tpl.template_type === 'daily_motivation') {
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    const bible = BIBLE_QUOTES[Math.floor(Math.random() * BIBLE_QUOTES.length)];

    const msg = `☀️ *Bom dia!*\n\n💡 *Frase do dia:*\n"${quote.text}"\n— ${quote.author}\n\n📖 *Palavra de Deus:*\n"${bible.text}"\n${bible.ref}\n\nTenha um ótimo dia! 🙏`;
    return [{ message: msg, logType: 'daily_motivation' }];
  }

  // =============================================
  // DAILY REMINDER — 2 blocks: today's tasks + overdue
  // =============================================
  if (tpl.template_type === 'daily_reminder') {
    const messages: { message: string; logType: string }[] = [];

    // BLOCK 1: Today's tasks (due_date within today, sorted by time ASC)
    let todayQ = supabase.from('tasks').select('title, due_date, priority')
      .eq('user_id', userId).eq('is_completed', false)
      .gte('due_date', todayStartUTC.toISOString())
      .lte('due_date', todayEndUTC.toISOString())
      .order('due_date', { ascending: true });
    todayQ = applyExclusions(todayQ);
    const { data: todayTasks } = await todayQ.limit(50);

    // Also get tasks with no due_date (show separately)
    let noDueDateQ = supabase.from('tasks').select('title, priority')
      .eq('user_id', userId).eq('is_completed', false)
      .is('due_date', null);
    noDueDateQ = applyExclusions(noDueDateQ);
    const { data: noDueDateTasks } = await noDueDateQ.limit(30);

    const todayCount = (todayTasks || []).length;
    let todayList = '';
    if (todayCount > 0) {
      todayList = (todayTasks || []).map((t: any) => {
        const time = formatTimeBRT(t.due_date);
        return `• ${t.title} | ${time}`;
      }).join('\n');
    } else {
      todayList = '✅ Nenhuma tarefa para hoje!';
    }

    // Add no-due-date tasks as a subsection if any
    let noDueDateSection = '';
    const noDueDateCount = (noDueDateTasks || []).length;
    if (noDueDateCount > 0) {
      const noDueDateList = (noDueDateTasks || []).slice(0, 10).map((t: any) => {
        return `• ${t.title}`;
      }).join('\n');
      noDueDateSection = `\n\n📝 *Sem prazo definido (${noDueDateCount}):*\n${noDueDateList}`;
      if (noDueDateCount > 10) noDueDateSection += `\n... e mais ${noDueDateCount - 10}`;
    }

    const block1 = `📋 *Tarefas de Hoje (${todayDateStr})*\n\n${todayList}${noDueDateSection}\n\nTotal: ${todayCount} tarefa(s) agendada(s)`;
    messages.push({ message: block1, logType: 'daily_reminder' });

    // BLOCK 2: Overdue tasks (due_date < today, sorted by priority)
    let overdueQ = supabase.from('tasks').select('title, due_date, priority')
      .eq('user_id', userId).eq('is_completed', false)
      .lt('due_date', todayStartUTC.toISOString())
      .not('due_date', 'is', null);
    overdueQ = applyExclusions(overdueQ);
    const { data: overdueTasks } = await overdueQ.limit(50);

    const overdueCount = (overdueTasks || []).length;
    if (overdueCount > 0) {
      // Sort by priority (high first)
      const sorted = (overdueTasks || []).sort((a: any, b: any) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority));
      const overdueList = sorted.map((t: any) => {
        const emoji = getPriorityEmoji(t.priority);
        return `${emoji} ${t.title} | Desde: ${formatDateBRT(t.due_date)}`;
      }).join('\n');

      const block2 = `⚠️ *Tarefas Atrasadas (${overdueCount})*\n\n${overdueList}\n\nCuide dessas pendências! 💪`;
      messages.push({ message: block2, logType: 'daily_reminder_overdue' });
    }

    return messages;
  }

  // =============================================
  // DAILY REPORT — productivity balance (evening)
  // =============================================
  if (tpl.template_type === 'daily_report') {
    // Completed today
    let completedQ = supabase.from('tasks').select('title')
      .eq('user_id', userId).eq('is_completed', true)
      .gte('updated_at', todayStartUTC.toISOString())
      .lte('updated_at', todayEndUTC.toISOString());
    completedQ = applyExclusions(completedQ);
    const { data: completedTasks } = await completedQ.limit(50);
    const completedToday = (completedTasks || []).length;

    // Not completed: tasks due today (not completed) + overdue tasks
    let pendingTodayOnlyQ = supabase.from('tasks').select('title, priority')
      .eq('user_id', userId).eq('is_completed', false)
      .gte('due_date', todayStartUTC.toISOString())
      .lte('due_date', todayEndUTC.toISOString());
    pendingTodayOnlyQ = applyExclusions(pendingTodayOnlyQ);
    const { data: pendingTodayTasks } = await pendingTodayOnlyQ.limit(100);

    let overdueReportQ = supabase.from('tasks').select('title, priority')
      .eq('user_id', userId).eq('is_completed', false)
      .lt('due_date', todayStartUTC.toISOString())
      .not('due_date', 'is', null);
    overdueReportQ = applyExclusions(overdueReportQ);
    const { data: overdueReportTasks } = await overdueReportQ.limit(100);

    const allPending = [...(pendingTodayTasks || []), ...(overdueReportTasks || [])];
    const pendingCount = allPending.length;

    // Total for today = completed + pending today only (not overdue)
    const pendingTodayCount = (pendingTodayTasks || []).length;
    const total = completedToday + pendingTodayCount;
    const percent = total > 0 ? Math.round((completedToday / total) * 100) : 0;
    const filled = Math.round(percent / 10);
    const progressBar = '▓'.repeat(filled) + '░'.repeat(10 - filled) + ` ${percent}%`;

    // Streak & points
    const { data: statsData } = await supabase.from('user_stats')
      .select('current_streak, total_points, tasks_completed_today').eq('user_id', userId).single();
    const streak = statsData?.current_streak || 0;
    const pointsToday = statsData?.tasks_completed_today ? statsData.tasks_completed_today * 15 : 0;

    // Completed highlights (max 5)
    let completedHighlights = '';
    if (completedToday > 0) {
      completedHighlights = (completedTasks || []).slice(0, 5).map((t: any) => `• ${t.title}`).join('\n');
      if (completedToday > 5) completedHighlights += `\n... e mais ${completedToday - 5}`;
    } else {
      completedHighlights = '• Nenhuma tarefa concluída hoje';
    }

    // Pending for tomorrow (max 5, by priority)
    let tomorrowList = '';
    if (pendingCount > 0) {
      const sorted = (allPending || []).sort((a: any, b: any) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority));
      tomorrowList = sorted.slice(0, 5).map((t: any) => `• ${t.title}`).join('\n');
      if (pendingCount > 5) tomorrowList += `\n... e mais ${pendingCount - 5}`;
    } else {
      tomorrowList = '✅ Tudo concluído!';
    }

    const msg = `📊 *Relatório do Dia - ${todayDateStr}*\n\n✅ Concluídas hoje: ${completedToday}\n❌ Não concluídas: ${pendingCount}\n📈 Taxa de conclusão: ${percent}%\n${progressBar}\n\n🏆 Streak atual: ${streak} dias\n⭐ Pontos ganhos hoje: ${pointsToday}\n\n🔥 *Destaques concluídos:*\n${completedHighlights}\n\n💤 *Ficaram para amanhã:*\n${tomorrowList}\n\nDescanse bem! 🌙`;
    return [{ message: msg, logType: 'daily_report' }];
  }

  // =============================================
  // WEEKLY SUMMARY
  // =============================================
  if (tpl.template_type === 'weekly_summary') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let weekQuery = supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_completed', true)
      .gte('updated_at', weekAgo.toISOString());
    weekQuery = applyExclusions(weekQuery);
    const { count: completedWeek } = await weekQuery;

    // Pending count
    let pendingQ = supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_completed', false);
    pendingQ = applyExclusions(pendingQ);
    const { count: pendingCount } = await pendingQ;

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

  return [{ message, logType: tpl.template_type }];
}

// ============================================================
// BUILD OVERDUE MESSAGES
// ============================================================
async function buildOverdueMessages(
  supabase: any, tpl: any, excludedIds: string[],
  now: Date, todayStartUTC: Date
): Promise<{ message: string; logType: string }[]> {
  const userId = tpl.user_id;

  let q = supabase.from('tasks').select('id, title, due_date')
    .eq('user_id', userId).eq('is_completed', false)
    .lt('due_date', now.toISOString()).not('due_date', 'is', null)
    .limit(50);
  for (const colId of excludedIds) q = q.neq('column_id', colId);
  const { data: overdueTasks } = await q;

  if (!overdueTasks || overdueTasks.length === 0) return [];

  const totalOverdue = overdueTasks.length;
  const messages: { message: string; logType: string }[] = [];

  for (const task of overdueTasks) {
    const { data: logs } = await supabase.from('whatsapp_logs')
      .select('id').eq('user_id', userId)
      .eq('template_type', `task_overdue_${task.id}`)
      .eq('status', 'sent')
      .gte('sent_at', todayStartUTC.toISOString())
      .limit(1);

    if (logs && logs.length > 0) continue;

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

  return messages.slice(0, 3);
}
