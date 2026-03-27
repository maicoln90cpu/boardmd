import { handleCors } from '../_shared/cors.ts';
import { json, error, handleAIError } from '../_shared/response.ts';
import { parseBody, requireFields } from '../_shared/validate.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('generate-tool-description');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await parseBody(req);
    requireFields(body, ['name']);

    const { name, siteUrl } = body as { name: string; siteUrl?: string };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return error("Serviço de IA não configurado", 500);

    const prompt = siteUrl
      ? `Gere uma descrição curta e profissional (máximo 2 frases) em português para a ferramenta digital "${name}" que está disponível em ${siteUrl}. Foque no propósito principal e benefícios da ferramenta. Não inclua emojis.`
      : `Gere uma descrição curta e profissional (máximo 2 frases) em português para a ferramenta digital "${name}". Foque no propósito principal e benefícios da ferramenta. Não inclua emojis.`;

    log.info("Generating description for:", name, siteUrl);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um especialista em ferramentas digitais e produtividade. Responda apenas com a descrição solicitada, sem introduções ou explicações adicionais." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const aiError = handleAIError(response);
    if (aiError) return aiError;

    if (!response.ok) {
      const errorText = await response.text();
      log.error("AI gateway error:", response.status, errorText);
      return error("Erro ao gerar descrição", 500);
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim() || "";

    log.info("Generated description:", description);
    return json({ description });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("Error:", err);
    return error(err instanceof Error ? err.message : "Erro desconhecido", 500);
  }
});
