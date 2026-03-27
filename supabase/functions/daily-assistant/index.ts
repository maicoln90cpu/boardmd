import { handleCors } from '../_shared/cors.ts';
import { json, error, handleAIError } from '../_shared/response.ts';
import { parseBody, validateArray } from '../_shared/validate.ts';
import { tryGetAuthenticatedUser, createAdminClient } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('daily-assistant');

interface Task {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  due_date?: string;
  column_id: string;
  position: number;
  tags?: string[];
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await parseBody(req);
    const tasks = validateArray(body.tasks, 'tasks') as Task[];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return error("LOVABLE_API_KEY is not configured", 500);

    let systemPrompt = `Você é um assistente de produtividade especializado em organizar tarefas diárias.

Analise as tarefas fornecidas e retorne uma sugestão de organização inteligente considerando:
1. URGÊNCIA: Prazos próximos têm prioridade
2. PRIORIDADE: high > medium > low
3. BLOQUEIOS: Tarefas com subtasks incompletas podem bloquear outras
4. CONTEXTO: Agrupe tarefas relacionadas por tags
5. ENERGIA: Tarefas complexas no início do dia, simples no fim

Retorne um JSON no seguinte formato:
{
  "reorderedTasks": [
    { "id": "task-id", "newPosition": 0, "reason": "Prazo urgente amanhã" }
  ],
  "insights": [
    "💡 3 tarefas com prazo próximo precisam de atenção",
    "⚡ Comece por [Tarefa X] pois bloqueia outras",
    "🎯 Agrupe tarefas de [Tag Y] para manter foco"
  ],
  "summary": "Reorganizado 5 tarefas priorizando urgências e otimizando fluxo de trabalho"
}

IMPORTANTE: 
- Retorne apenas o JSON, sem texto adicional
- Inclua todos os IDs das tarefas fornecidas
- Insights devem ser concisos e acionáveis`;

    // Get custom prompt from user settings if authenticated
    const auth = await tryGetAuthenticatedUser(req);
    if (auth) {
      try {
        const adminClient = createAdminClient();
        const { data: settings } = await adminClient
          .from('user_settings')
          .select('settings')
          .eq('user_id', auth.userId)
          .single();

        if ((settings?.settings as Record<string, any>)?.aiPrompts?.dailyAssistant) {
          systemPrompt = (settings.settings as Record<string, any>).aiPrompts.dailyAssistant;
          log.info('Using custom prompt for dailyAssistant');
        }
      } catch (authError) {
        log.warn('Auth error, using default prompt:', authError);
      }
    }

    const tasksContext = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority || "medium",
      due_date: t.due_date,
      column: t.column_id,
      tags: t.tags || [],
      subtasks_total: t.subtasks?.length || 0,
      subtasks_completed: t.subtasks?.filter((s) => s.completed).length || 0,
      position: t.position
    }));

    log.info(`Processing ${tasks.length} tasks`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise e organize estas tarefas do dia:\n\n${JSON.stringify(tasksContext, null, 2)}` }
        ],
        temperature: 0.7,
        max_tokens: 2000,
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
      const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch {
      log.error("Failed to parse AI response:", aiResponse);
      return error("Invalid AI response format", 500);
    }

    log.info(`Success - ${parsedResponse.reorderedTasks?.length || 0} tasks reordered`);
    return json(parsedResponse);
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("Error:", err);
    return error(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
