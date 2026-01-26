import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserStats {
  total_points: number;
  tasks_completed_today: number;
  tasks_completed_week: number;
  current_streak: number;
  best_streak: number;
  level: number;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  priority?: string;
  due_date?: string;
  column_id: string;
  created_at: string;
  tags?: string[];
  is_completed?: boolean;
  recurrence_rule?: Record<string, unknown> | null;
  subtasks?: Subtask[] | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stats, tasks, weekHistory } = await req.json();
    
    if (!stats || !tasks) {
      return new Response(
        JSON.stringify({ error: "Stats and tasks are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Default system prompt - melhorado com fórmula clara de score
    let systemPrompt = `Você é um analista de produtividade especializado em padrões de trabalho.

Analise os dados fornecidos e retorne insights acionáveis sobre produtividade.

IMPORTANTE - Métricas a analisar:
1. TAXA DE CONCLUSÃO: (completed / total) * 100 - Quantas tarefas foram realmente finalizadas (campo is_completed)
2. EFICIÊNCIA POR PRIORIDADE: Proporção de tarefas de alta prioridade concluídas vs. pendentes
3. CONSISTÊNCIA (Streak): Dias consecutivos completando tarefas
4. GESTÃO DE RECORRENTES: % de tarefas recorrentes sendo completadas regularmente
5. PROGRESSO DE SUBTAREFAS: % de subtarefas concluídas por tarefa
6. DÉBITO TÉCNICO: Tarefas atrasadas (overdue) - atenção especial se > 20% do total pendente
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
  "patterns": [
    {
      "icon": "🎯",
      "title": "Padrão identificado",
      "description": "Descrição específica com números reais dos dados",
      "type": "positive" | "warning" | "negative"
    }
  ],
  "suggestions": [
    {
      "icon": "💡",
      "title": "Ação sugerida",
      "description": "Como implementar essa sugestão de forma prática",
      "priority": "high" | "medium" | "low"
    }
  ],
  "weeklyComparison": {
    "current": 12,
    "previous": 10,
    "trend": "up" | "down" | "stable"
  }
}

IMPORTANTE: 
- Use os NÚMEROS REAIS fornecidos, não invente estatísticas
- Insights devem ser específicos ao contexto do usuário
- Máximo 4 patterns e 4 suggestions
- Tom motivacional mas realista
- Retorne apenas o JSON, sem texto adicional`;

    // Get custom prompt from user settings if authenticated
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('settings')
            .eq('user_id', user.id)
            .single();
          
          if (settings?.settings?.aiPrompts?.productivityInsights) {
            systemPrompt = settings.settings.aiPrompts.productivityInsights;
            console.log('[productivity-insights] Using custom prompt for productivityInsights');
          }
        }
      } catch (authError) {
        console.log('[productivity-insights] Auth error, using default prompt:', authError);
      }
    }

    // Calcular métricas usando is_completed (CORREÇÃO DO BUG)
    const now = new Date();
    const completedTasks = tasks.filter((t: Task) => t.is_completed === true);
    const pendingTasks = tasks.filter((t: Task) => !t.is_completed);
    const overdueTasks = pendingTasks.filter((t: Task) => 
      t.due_date && new Date(t.due_date) < now
    );
    
    // Métricas de prioridade
    const highPriorityTasks = tasks.filter((t: Task) => t.priority === "high");
    const highPriorityCompleted = highPriorityTasks.filter((t: Task) => t.is_completed === true);
    const highPriorityPending = highPriorityTasks.filter((t: Task) => !t.is_completed);

    // Métricas de recorrência
    const recurringTasks = tasks.filter((t: Task) => t.recurrence_rule);
    const recurringCompleted = recurringTasks.filter((t: Task) => t.is_completed === true);
    const recurringPending = recurringTasks.filter((t: Task) => !t.is_completed);

    // Métricas de subtarefas
    const tasksWithSubtasks = tasks.filter((t: Task) => t.subtasks && t.subtasks.length > 0);
    const totalSubtasks = tasks.reduce((acc: number, t: Task) => 
      acc + (t.subtasks?.length || 0), 0);
    const completedSubtasks = tasks.reduce((acc: number, t: Task) => 
      acc + (t.subtasks?.filter((s: Subtask) => s.completed).length || 0), 0);

    // Métricas de data
    const tasksWithDueDate = tasks.filter((t: Task) => t.due_date);
    const todayTasks = pendingTasks.filter((t: Task) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      return d.toDateString() === now.toDateString();
    });
    const thisWeekTasks = pendingTasks.filter((t: Task) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + 7);
      return d >= now && d <= weekEnd;
    });

    const statsContext = {
      stats: {
        level: stats.level,
        total_points: stats.total_points,
        current_streak: stats.current_streak,
        best_streak: stats.best_streak,
        tasks_completed_today: stats.tasks_completed_today,
        tasks_completed_week: stats.tasks_completed_week,
      },
      tasks: {
        total: tasks.length,
        // CORRIGIDO: usar is_completed ao invés de column_id
        completed: completedTasks.length,
        pending: pendingTasks.length,
        overdue: overdueTasks.length,
        // Taxa de conclusão calculada
        completion_rate: tasks.length > 0 
          ? Math.round((completedTasks.length / tasks.length) * 100) 
          : 0,
        // Análise por prioridade
        priorities: {
          high: highPriorityTasks.length,
          medium: tasks.filter((t: Task) => t.priority === "medium").length,
          low: tasks.filter((t: Task) => t.priority === "low").length,
        },
        // Análise de prioridade vs. conclusão
        completed_by_priority: {
          high: highPriorityCompleted.length,
          medium: tasks.filter((t: Task) => t.priority === "medium" && t.is_completed).length,
          low: tasks.filter((t: Task) => t.priority === "low" && t.is_completed).length,
        },
        high_priority_pending: highPriorityPending.length,
        // Métricas de recorrência
        recurring: {
          total: recurringTasks.length,
          completed: recurringCompleted.length,
          pending: recurringPending.length,
          completion_rate: recurringTasks.length > 0
            ? Math.round((recurringCompleted.length / recurringTasks.length) * 100)
            : 0,
        },
        // Métricas de subtarefas
        subtasks: {
          tasks_with_subtasks: tasksWithSubtasks.length,
          total_subtasks: totalSubtasks,
          completed_subtasks: completedSubtasks,
          progress_rate: totalSubtasks > 0
            ? Math.round((completedSubtasks / totalSubtasks) * 100)
            : 0,
        },
        // Organização
        with_tags: tasks.filter((t: Task) => t.tags && t.tags.length > 0).length,
        with_due_date: tasksWithDueDate.length,
        due_date_rate: tasks.length > 0
          ? Math.round((tasksWithDueDate.length / tasks.length) * 100)
          : 0,
        // Distribuição por vencimento
        due_distribution: {
          no_date: pendingTasks.filter((t: Task) => !t.due_date).length,
          overdue: overdueTasks.length,
          today: todayTasks.length,
          this_week: thisWeekTasks.length,
        },
        // Débito técnico (% de tarefas atrasadas sobre pendentes)
        overdue_rate: pendingTasks.length > 0
          ? Math.round((overdueTasks.length / pendingTasks.length) * 100)
          : 0,
      },
      weekHistory: weekHistory || []
    };

    console.log(`[productivity-insights] Analyzing stats - Level ${stats.level}, ${tasks.length} tasks (${completedTasks.length} completed, ${pendingTasks.length} pending, ${overdueTasks.length} overdue)`);

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
          { 
            role: "user", 
            content: `Analise estes dados de produtividade e gere insights:\n\n${JSON.stringify(statsContext, null, 2)}` 
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[productivity-insights] AI gateway error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No content returned from AI");
    }

    let parsedResponse;
    try {
      const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("[productivity-insights] Failed to parse AI response:", aiResponse);
      throw new Error("Invalid AI response format");
    }

    console.log(`[productivity-insights] Success - Score: ${parsedResponse.overallScore}/100`);

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[productivity-insights] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
