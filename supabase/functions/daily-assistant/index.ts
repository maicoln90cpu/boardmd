import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tasks } = await req.json();
    
    if (!tasks || !Array.isArray(tasks)) {
      return new Response(
        JSON.stringify({ error: "Tasks array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Default system prompt
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
          
          if (settings?.settings?.aiPrompts?.dailyAssistant) {
            systemPrompt = settings.settings.aiPrompts.dailyAssistant;
            console.log('[daily-assistant] Using custom prompt for dailyAssistant');
          }
        }
      } catch (authError) {
        console.log('[daily-assistant] Auth error, using default prompt:', authError);
      }
    }

    const tasksContext = tasks.map((t: Task) => ({
      id: t.id,
      title: t.title,
      priority: t.priority || "medium",
      due_date: t.due_date,
      column: t.column_id,
      tags: t.tags || [],
      subtasks_total: t.subtasks?.length || 0,
      subtasks_completed: t.subtasks?.filter((s: any) => s.completed).length || 0,
      position: t.position
    }));

    console.log(`[daily-assistant] Processing ${tasks.length} tasks`);

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
            content: `Analise e organize estas tarefas do dia:\n\n${JSON.stringify(tasksContext, null, 2)}` 
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[daily-assistant] AI gateway error: ${response.status} - ${errorText}`);
      
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

    // Parse AI response (remove markdown code blocks if present)
    let parsedResponse;
    try {
      const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("[daily-assistant] Failed to parse AI response:", aiResponse);
      throw new Error("Invalid AI response format");
    }

    console.log(`[daily-assistant] Success - ${parsedResponse.reorderedTasks?.length || 0} tasks reordered`);

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[daily-assistant] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
