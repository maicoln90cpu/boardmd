import { handleCors } from '../_shared/cors.ts';
import { json, error, handleAIError } from '../_shared/response.ts';
import { parseBody, requireFields } from '../_shared/validate.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('suggest-tool-alternatives');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await parseBody(req);
    requireFields(body, ['toolName']);

    const { toolName } = body as { toolName: string };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return error("Serviço de IA não configurado", 500);

    const prompt = `Para a ferramenta digital "${toolName}", sugira 5 alternativas (preferencialmente gratuitas ou com planos gratuitos generosos).
Para cada alternativa: name, site_url, description (português, max 2 frases), is_free (boolean).
Responda APENAS JSON: { "alternatives": [...] }`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um especialista em ferramentas digitais. Responda sempre com JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const aiError = handleAIError(response);
    if (aiError) return aiError;

    if (!response.ok) {
      const errorText = await response.text();
      log.error("AI error:", response.status, errorText);
      return error("Erro ao gerar alternativas", 500);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    let alternatives: unknown[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) alternatives = JSON.parse(jsonMatch[0]).alternatives || [];
    } catch (parseError) {
      log.error("Parse error:", parseError);
      return error("Erro ao processar resposta da IA", 500);
    }

    return json({ alternatives });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("Error:", err);
    return error("Erro desconhecido", 500);
  }
});
