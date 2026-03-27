import { handleCors } from '../_shared/cors.ts';
import { json, error, handleAIError } from '../_shared/response.ts';
import { parseBody, requireFields } from '../_shared/validate.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('ai-subtasks');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await parseBody(req);
    requireFields(body, ['title']);

    const { title, description } = body as { title: string; description?: string };

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
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const aiError = handleAIError(response);
    if (aiError) return aiError;

    if (!response.ok) {
      const errorText = await response.text();
      log.error("AI API error:", errorText);
      return error(`AI API error: ${response.status}`, 500);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    let subtasks: string[] = [];
    try {
      subtasks = JSON.parse(content);
    } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (match) subtasks = JSON.parse(match[0]);
    }

    subtasks = subtasks
      .filter((s: unknown) => typeof s === "string" && (s as string).trim().length > 0)
      .map((s: string) => s.trim().slice(0, 100))
      .slice(0, 5);

    return json({ subtasks });
  } catch (err) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Error:", err);
    return error(msg, 500);
  }
});
