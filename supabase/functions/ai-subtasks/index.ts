import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "Task title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Você é um assistente de produtividade. Dado o título de uma tarefa e opcionalmente sua descrição, sugira 3-5 subtarefas práticas e acionáveis para completá-la.

Título da tarefa: "${title}"
${description ? `Descrição: "${description}"` : ""}

Regras:
- Retorne APENAS um array JSON com as subtarefas (strings)
- Cada subtarefa deve ser curta e objetiva (máximo 50 caracteres)
- Subtarefas devem ser passos práticos para completar a tarefa principal
- Ordene da primeira ação à última
- Não inclua explicações, apenas o array JSON

Exemplo de resposta:
["Definir escopo do projeto", "Criar estrutura de pastas", "Implementar funcionalidade base", "Testar e revisar"]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Extract JSON array from response
    let subtasks: string[] = [];
    try {
      // Try to parse directly
      subtasks = JSON.parse(content);
    } catch {
      // Try to extract JSON array from text
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        subtasks = JSON.parse(match[0]);
      }
    }

    // Validate and clean subtasks
    subtasks = subtasks
      .filter((s: any) => typeof s === "string" && s.trim().length > 0)
      .map((s: string) => s.trim().slice(0, 100))
      .slice(0, 5);

    return new Response(
      JSON.stringify({ subtasks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage, subtasks: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
