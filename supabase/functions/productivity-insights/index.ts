import { handleCors } from '../_shared/cors.ts';
import { json, error, handleAIError } from '../_shared/response.ts';
import { parseBody, requireFields } from '../_shared/validate.ts';
import { tryGetAuthenticatedUser, createAdminClient } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('productivity-insights');

interface Subtask { id: string; title: string; completed: boolean; }
interface Task {
  id: string; title: string; priority?: string; due_date?: string;
  column_id: string; created_at: string; tags?: string[];
  is_completed?: boolean; recurrence_rule?: Record<string, unknown> | null;
  subtasks?: Subtask[] | null;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await parseBody(req);
    requireFields(body, ['stats', 'tasks']);

    const { stats, tasks, weekHistory } = body as { stats: any; tasks: Task[]; weekHistory?: any[] };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return error("LOVABLE_API_KEY is not configured", 500);

    let systemPrompt = `Você é um analista de produtividade especializado em padrões de trabalho.

Analise os dados fornecidos e retorne insights acionáveis sobre produtividade.

IMPORTANTE - Métricas a analisar:
1. TAXA DE CONCLUSÃO: (completed / total) * 100
2. EFICIÊNCIA POR PRIORIDADE: Proporção de tarefas de alta prioridade concluídas vs. pendentes
3. CONSISTÊNCIA (Streak): Dias consecutivos completando tarefas
4. GESTÃO DE RECORRENTES: % de tarefas recorrentes sendo completadas regularmente
5. PROGRESSO DE SUBTAREFAS: % de subtarefas concluídas por tarefa
6. DÉBITO TÉCNICO: Tarefas atrasadas (overdue)
7. ORGANIZAÇÃO: Uso de tags, datas de vencimento, distribuição de prioridades

FÓRMULA DE SCORE (use como base):
- Base: 50 pontos
- +20 se taxa de conclusão > 60%
- +15 se streak >= 3 dias
- +10 se 80%+ das tarefas têm data de vencimento
- +10 se overdue < 10% do total pendente
- -15 se overdue > 30% do total pendente
- -10 se tarefas de alta prioridade pendentes > 50%
- +5 se progresso de subtarefas > 70%

Retorne um JSON no seguinte formato:
{
  "overallScore": 85,
  "scoreLabel": "Muito Bom",
  "mainInsight": "Insight principal baseado na análise REAL dos números fornecidos",
  "patterns": [{ "icon": "🎯", "title": "Padrão", "description": "Descrição", "type": "positive" }],
  "suggestions": [{ "icon": "💡", "title": "Ação", "description": "Como implementar", "priority": "high" }],
  "weeklyComparison": { "current": 12, "previous": 10, "trend": "up" }
}

IMPORTANTE: Use os NÚMEROS REAIS fornecidos. Máximo 4 patterns e 4 suggestions. Retorne apenas o JSON.`;

    // Get custom prompt
    const auth = await tryGetAuthenticatedUser(req);
    if (auth) {
      try {
        const adminClient = createAdminClient();
        const { data: settings } = await adminClient
          .from('user_settings').select('settings').eq('user_id', auth.userId).single();
        if ((settings?.settings as Record<string, any>)?.aiPrompts?.productivityInsights) {
          systemPrompt = (settings.settings as Record<string, any>).aiPrompts.productivityInsights;
          log.info('Using custom prompt');
        }
      } catch { /* use default */ }
    }

    // Calculate metrics
    const now = new Date();
    const completedTasks = tasks.filter(t => t.is_completed === true);
    const pendingTasks = tasks.filter(t => !t.is_completed);
    const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < now);
    const highPriorityTasks = tasks.filter(t => t.priority === "high");
    const recurringTasks = tasks.filter(t => t.recurrence_rule);
    const totalSubtasks = tasks.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0);
    const completedSubtasks = tasks.reduce((acc, t) => acc + (t.subtasks?.filter(s => s.completed).length || 0), 0);
    const tasksWithDueDate = tasks.filter(t => t.due_date);

    const statsContext = {
      stats: { level: stats.level, total_points: stats.total_points, current_streak: stats.current_streak, best_streak: stats.best_streak, tasks_completed_today: stats.tasks_completed_today, tasks_completed_week: stats.tasks_completed_week },
      tasks: {
        total: tasks.length, completed: completedTasks.length, pending: pendingTasks.length, overdue: overdueTasks.length,
        completion_rate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
        priorities: { high: highPriorityTasks.length, medium: tasks.filter(t => t.priority === "medium").length, low: tasks.filter(t => t.priority === "low").length },
        completed_by_priority: { high: highPriorityTasks.filter(t => t.is_completed).length, medium: tasks.filter(t => t.priority === "medium" && t.is_completed).length, low: tasks.filter(t => t.priority === "low" && t.is_completed).length },
        high_priority_pending: highPriorityTasks.filter(t => !t.is_completed).length,
        recurring: { total: recurringTasks.length, completed: recurringTasks.filter(t => t.is_completed).length, pending: recurringTasks.filter(t => !t.is_completed).length },
        subtasks: { total_subtasks: totalSubtasks, completed_subtasks: completedSubtasks, progress_rate: totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0 },
        with_due_date: tasksWithDueDate.length,
        due_date_rate: tasks.length > 0 ? Math.round((tasksWithDueDate.length / tasks.length) * 100) : 0,
        overdue_rate: pendingTasks.length > 0 ? Math.round((overdueTasks.length / pendingTasks.length) * 100) : 0,
      },
      weekHistory: weekHistory || []
    };

    log.info(`Analyzing - Level ${stats.level}, ${tasks.length} tasks (${completedTasks.length} completed, ${overdueTasks.length} overdue)`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise estes dados de produtividade e gere insights:\n\n${JSON.stringify(statsContext, null, 2)}` }
        ],
        temperature: 0.7, max_tokens: 2000,
      }),
    });

    const aiError = handleAIError(response);
    if (aiError) return aiError;

    if (!response.ok) {
      const errorText = await response.text();
      log.error(`AI gateway error: ${response.status} - ${errorText}`);
      return error(`AI gateway error: ${response.status}`, 500);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    if (!aiResponse) return error("No content returned from AI", 500);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
      log.error("Failed to parse AI response:", aiResponse);
      return error("Invalid AI response format", 500);
    }

    log.info(`Success - Score: ${parsedResponse.overallScore}/100`);
    return json(parsedResponse);
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("Error:", err);
    return error(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
