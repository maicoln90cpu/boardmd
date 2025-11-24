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

interface Task {
  id: string;
  title: string;
  priority?: string;
  due_date?: string;
  column_id: string;
  created_at: string;
  tags?: string[];
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

    // Default system prompt
    let systemPrompt = `Você é um analista de produtividade especializado em padrões de trabalho.

Analise os dados fornecidos e retorne insights acionáveis sobre produtividade.

Considere:
1. CONSISTÊNCIA: Streak atual vs. melhor streak, padrão de conclusão diária
2. EFICIÊNCIA: Taxa de conclusão, tempo médio de tarefas pendentes
3. PRIORIZAÇÃO: Distribuição de prioridades (high/medium/low)
4. ORGANIZAÇÃO: Uso de tags, categorização, tarefas com prazo
5. TENDÊNCIAS: Evolução semanal, dias mais/menos produtivos
6. BLOQUEIOS: Tarefas antigas não concluídas, acúmulo de backlog

Retorne um JSON no seguinte formato:
{
  "overallScore": 85,
  "scoreLabel": "Muito Bom",
  "mainInsight": "Sua produtividade está acima da média, mas há espaço para melhorias na consistência.",
  "patterns": [
    {
      "icon": "🎯",
      "title": "Padrão identificado",
      "description": "Descrição detalhada do padrão observado",
      "type": "positive" | "warning" | "negative"
    }
  ],
  "suggestions": [
    {
      "icon": "💡",
      "title": "Sugestão acionável",
      "description": "Como implementar essa sugestão",
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
- Retorne apenas o JSON, sem texto adicional
- Insights devem ser específicos e acionáveis
- Tom motivacional mas realista
- Máximo 4 patterns e 4 suggestions`;

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
        completed: tasks.filter((t: Task) => t.column_id.includes("done")).length,
        pending: tasks.filter((t: Task) => !t.column_id.includes("done")).length,
        overdue: tasks.filter((t: Task) => 
          t.due_date && new Date(t.due_date) < new Date() && !t.column_id.includes("done")
        ).length,
        priorities: {
          high: tasks.filter((t: Task) => t.priority === "high").length,
          medium: tasks.filter((t: Task) => t.priority === "medium").length,
          low: tasks.filter((t: Task) => t.priority === "low").length,
        },
        with_tags: tasks.filter((t: Task) => t.tags && t.tags.length > 0).length,
        with_due_date: tasks.filter((t: Task) => t.due_date).length,
      },
      weekHistory: weekHistory || []
    };

    console.log(`[productivity-insights] Analyzing stats for user - Level ${stats.level}, ${tasks.length} tasks`);

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
