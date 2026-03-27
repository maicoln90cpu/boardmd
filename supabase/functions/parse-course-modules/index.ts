import { handleCors } from '../_shared/cors.ts';
import { json, error, handleAIError } from '../_shared/response.ts';
import { parseBody, requireFields } from '../_shared/validate.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('parse-course-modules');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await parseBody(req);
    requireFields(body, ['image']);

    const { image } = body as { image: string };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return error("LOVABLE_API_KEY não configurada", 500);

    const systemPrompt = `Você é um assistente especializado em analisar imagens de cursos online.
Sua tarefa é extrair todos os módulos/aulas/seções listados na imagem.
Retorne APENAS um array JSON com os módulos encontrados, no formato:
[{"title": "Nome do módulo 1"}, {"title": "Nome do módulo 2"}, ...]

Regras:
- Extraia TODOS os módulos/aulas visíveis na imagem
- Mantenha a ordem em que aparecem
- Se houver numeração, inclua no título (ex: "1. Introdução")
- Se não conseguir identificar módulos, retorne um array vazio []
- Não inclua explicações, apenas o JSON`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analise esta imagem de um curso e extraia todos os módulos/aulas listados:" },
              { type: "image_url", image_url: { url: `data:image/png;base64,${image}` } },
            ],
          },
        ],
      }),
    });

    const aiError = handleAIError(response);
    if (aiError) return aiError;

    if (!response.ok) {
      const errorText = await response.text();
      log.error("AI gateway error:", response.status, errorText);
      return error("Erro ao processar imagem", 500);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    let modules: { title: string }[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) modules = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      log.error("Error parsing modules:", parseError);
    }

    const modulesWithIds = modules.map((m, index) => ({
      id: crypto.randomUUID(),
      title: m.title || `Módulo ${index + 1}`,
      completed: false,
    }));

    return json({ modules: modulesWithIds });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("Error:", err);
    return error("Erro interno do servidor", 500);
  }
});
