import { handleCors } from '../_shared/cors.ts';
import { json, error, handleAIError } from '../_shared/response.ts';
import { parseBody, validateArray } from '../_shared/validate.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('suggest-tools');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await parseBody(req);
    const functions = validateArray(body.functions, 'functions') as { name: string }[];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return error("Serviço de IA não configurado", 500);

    const functionNames = functions.map(f => f.name).join(", ");
    const existingToolNames = (body.existingTools as any[])?.map((t: any) => t.name).join(", ") || "";

    const prompt = `Baseado nas seguintes categorias de funções que o usuário usa: ${functionNames}
${existingToolNames ? `Ferramentas que o usuário já possui: ${existingToolNames}` : ""}
Sugira 5 ferramentas digitais populares e úteis que o usuário ainda NÃO possui.
Para cada ferramenta: name, site_url, description (português, max 2 frases), icon (wrench/zap/palette/video/music/code/file-text/image/globe/brain/bot/sparkles/cog/terminal/database), functions (nomes exatos).
Responda APENAS JSON: { "suggestions": [...] }`;

    log.info("Generating suggestions for:", functionNames);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um especialista em ferramentas digitais e produtividade. Sempre responda com JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const aiError = handleAIError(response);
    if (aiError) return aiError;

    if (!response.ok) {
      const errorText = await response.text();
      log.error("AI gateway error:", response.status, errorText);
      return error("Erro ao gerar sugestões", 500);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    let suggestions: unknown[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) suggestions = JSON.parse(jsonMatch[0]).suggestions || [];
    } catch (parseError) {
      log.error("Error parsing AI response:", parseError);
      return error("Erro ao processar sugestões da IA", 500);
    }

    return json({ suggestions });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("Error:", err);
    return error(err instanceof Error ? err.message : "Erro desconhecido", 500);
  }
});
