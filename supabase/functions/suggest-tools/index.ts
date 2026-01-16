import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { functions, existingTools } = await req.json();

    if (!functions || !Array.isArray(functions) || functions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Informe pelo menos uma função para gerar sugestões" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de IA não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const functionNames = functions.map((f: { name: string }) => f.name).join(", ");
    const existingToolNames = existingTools?.map((t: { name: string }) => t.name).join(", ") || "";

    const prompt = `Baseado nas seguintes categorias de funções que o usuário usa: ${functionNames}

${existingToolNames ? `Ferramentas que o usuário já possui: ${existingToolNames}` : ""}

Sugira 5 ferramentas digitais populares e úteis que o usuário ainda NÃO possui e que seriam úteis para essas funções.

Para cada ferramenta, forneça:
- name: nome da ferramenta
- site_url: URL oficial do site
- description: descrição curta em português (máximo 2 frases)
- icon: um ícone sugerido (wrench, zap, palette, video, music, code, file-text, image, globe, brain, bot, sparkles, cog, terminal, database)
- functions: array com as funções que esta ferramenta atende (use os nomes exatos fornecidos)

Responda APENAS com um JSON válido no formato:
{
  "suggestions": [
    {
      "name": "Nome",
      "site_url": "https://...",
      "description": "Descrição",
      "icon": "icone",
      "functions": ["função1", "função2"]
    }
  ]
}`;

    console.log("Generating tool suggestions for functions:", functionNames);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em ferramentas digitais e produtividade. Sempre responda com JSON válido.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar sugestões" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    console.log("AI response:", content);

    // Parse JSON from response
    let suggestions = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.suggestions || [];
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return new Response(
        JSON.stringify({ error: "Erro ao processar sugestões da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
