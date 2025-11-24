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
    const { content, action } = await req.json();
    
    if (!content || !action) {
      return new Response(
        JSON.stringify({ error: "Content and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Default prompts
    const defaultPrompts: Record<string, string> = {
      improve: "Você é um assistente de formatação de texto. Melhore a legibilidade e formatação do texto sem alterar o conteúdo principal. Adicione títulos, listas, negrito e itálico onde apropriado. Mantenha o HTML válido para TipTap editor.",
      grammar: "Você é um revisor de texto. Corrija erros gramaticais e de ortografia mantendo o estilo original. Retorne HTML válido para TipTap editor.",
      summarize: "Você é um especialista em resumos. Crie um resumo conciso do texto mantendo os pontos principais. Retorne HTML válido para TipTap editor.",
      expand: "Você é um escritor criativo. Expanda o texto adicionando mais detalhes e explicações mantendo o tema original. Retorne HTML válido para TipTap editor.",
      professional: "Você é um editor profissional. Transforme o texto em um formato mais profissional e formal. Retorne HTML válido para TipTap editor."
    };

    let systemPrompt = defaultPrompts[action] || defaultPrompts.improve;

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
          
          const promptKey = `format${action.charAt(0).toUpperCase() + action.slice(1)}`;
          if (settings?.settings?.aiPrompts?.[promptKey]) {
            systemPrompt = settings.settings.aiPrompts[promptKey];
            console.log(`[format-note] Using custom prompt for ${promptKey}`);
          }
        }
      } catch (authError) {
        console.log('[format-note] Auth error, using default prompt:', authError);
      }
    }

    console.log(`[format-note] Processing action: ${action}`);

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
          { role: "user", content: `Texto para formatar:\n\n${content}` }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[format-note] AI gateway error: ${response.status} - ${errorText}`);
      
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
    const formattedContent = data.choices[0]?.message?.content;

    if (!formattedContent) {
      throw new Error("No content returned from AI");
    }

    console.log(`[format-note] Success - formatted ${content.length} chars to ${formattedContent.length} chars`);

    return new Response(
      JSON.stringify({ formattedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[format-note] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
