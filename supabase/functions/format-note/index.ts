import { handleCors } from '../_shared/cors.ts';
import { json, error, handleAIError } from '../_shared/response.ts';
import { parseBody, requireFields } from '../_shared/validate.ts';
import { tryGetAuthenticatedUser } from '../_shared/auth.ts';
import { createAdminClient } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('format-note');

const defaultPrompts: Record<string, string> = {
  improve: "Você é um assistente de formatação de texto. Melhore a legibilidade e formatação do texto sem alterar o conteúdo principal. Adicione títulos, listas, negrito e itálico onde apropriado. Mantenha o HTML válido para TipTap editor.",
  grammar: "Você é um revisor de texto. Corrija erros gramaticais e de ortografia mantendo o estilo original. Retorne HTML válido para TipTap editor.",
  summarize: "Você é um especialista em resumos. Crie um resumo conciso do texto mantendo os pontos principais. Retorne HTML válido para TipTap editor.",
  expand: "Você é um escritor criativo. Expanda o texto adicionando mais detalhes e explicações mantendo o tema original. Retorne HTML válido para TipTap editor.",
  professional: "Você é um editor profissional. Transforme o texto em um formato mais profissional e formal. Retorne HTML válido para TipTap editor.",
  toList: `Você é um assistente de organização de texto. Transforme o texto fornecido em uma lista organizada de tópicos.

Regras:
- Use <ul> para listas não ordenadas ou <ol> para listas numeradas
- Cada item deve ser um <li>
- Mantenha apenas informações relevantes
- Agrupe itens relacionados
- Retorne APENAS HTML válido para TipTap editor, sem explicações`,
  toTable: `Você é um especialista em estruturação de dados. Transforme o texto em uma tabela HTML organizada.

Regras:
- Use <table>, <thead>, <tbody>, <tr>, <th>, <td>
- Identifique colunas lógicas nos dados
- Use <th> para cabeçalhos
- Mantenha dados bem organizados e legíveis
- Retorne APENAS HTML válido para TipTap editor, sem explicações`,
  extractActions: `Você é um assistente de produtividade. Analise o texto e extraia todos os itens de ação/tarefas.

Regras:
- Identifique tarefas, pendências, ações a fazer
- Formate como lista de tarefas usando:
  <ul data-type="taskList">
    <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Tarefa aqui</p></div></li>
  </ul>
- Priorize clareza e objetividade
- Se não houver ações claras, crie sugestões baseadas no contexto
- Retorne APENAS HTML válido para TipTap editor, sem explicações`,
  keyPoints: `Você é um analista de conteúdo. Extraia os 5-7 pontos principais do texto.

Regras:
- Identifique os conceitos mais importantes
- Seja conciso e direto
- Formate como lista com marcadores usando <ul> e <li>
- Destaque palavras-chave em <strong>
- Retorne APENAS HTML válido para TipTap editor, sem explicações`,
  structure: `Você é um formatador de texto. Aplique formatação visual SEM alterar o conteúdo:

- Títulos em <h2> ou <h3> com negrito
- Subtítulos em <strong>
- Listas com <ul>/<ol> e <li>
- Parágrafos bem espaçados
- Destaque palavras-chave em <strong>

NÃO altere o texto, apenas a estrutura visual.
Retorne APENAS HTML válido para TipTap editor, sem explicações.`,
  generateToc: `Você é um especialista em estruturação de documentos. Sua tarefa é analisar o conteúdo e criar um índice (Table of Contents) clicável no topo.

INSTRUÇÕES:
1. Analise o documento e identifique os principais tópicos/seções
2. Para cada tópico encontrado, adicione um ID único ao heading: <h2 id="secao-exemplo">Título</h2>
3. No TOPO do documento, crie um bloco de navegação com links âncora

FORMATO DO ÍNDICE (usar exatamente esta estrutura):
<div class="toc-container">
  <p style="font-weight: 700; font-size: 15px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">📑 Índice</p>
  <ul>
    <li><a href="#secao-1">1. Título da Seção</a></li>
    <li><a href="#secao-2">2. Título da Seção 2</a></li>
  </ul>
</div>

REGRAS IMPORTANTES:
- O href DEVE começar com # seguido do ID (ex: href="#introducao")
- O ID no heading DEVE ser idêntico ao usado no href (sem o #)
- Use IDs simples em kebab-case: secao-1, introducao, conclusao
- NÃO adicione target="_blank" (os links são internos)
- NÃO adicione estilos inline nos links (o CSS do app cuida disso)
- Mantenha TODO o conteúdo original APÓS o bloco do índice
- Se não houver seções claras, crie divisões lógicas com h2

IMPORTANTE: Retorne APENAS HTML válido, sem explicações ou comentários`
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await parseBody(req);
    requireFields(body, ['content', 'action']);

    const { content, action } = body as { content: string; action: string };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return error("LOVABLE_API_KEY is not configured", 500);

    let systemPrompt = defaultPrompts[action] || defaultPrompts.improve;
    let aiModel = "google/gemini-2.5-flash";

    // Get custom prompt and AI model from user settings if authenticated
    const auth = await tryGetAuthenticatedUser(req);
    if (auth) {
      try {
        const adminClient = createAdminClient();
        const { data: settings } = await adminClient
          .from('user_settings')
          .select('settings')
          .eq('user_id', auth.userId)
          .single();

        if (settings?.settings?.ai?.model) {
          aiModel = (settings.settings as Record<string, any>).ai.model;
          log.info(`Using custom AI model: ${aiModel}`);
        }

        const promptKey = `format${action.charAt(0).toUpperCase() + action.slice(1)}`;
        if ((settings?.settings as Record<string, any>)?.aiPrompts?.[promptKey]) {
          systemPrompt = (settings.settings as Record<string, any>).aiPrompts[promptKey];
          log.info(`Using custom prompt for ${promptKey}`);
        }
      } catch (authError) {
        log.warn('Auth/settings error, using defaults:', authError);
      }
    }

    log.info(`Processing action: ${action} with model: ${aiModel}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Texto para processar:\n\n${content}` }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    const aiError = handleAIError(response);
    if (aiError) return aiError;

    if (!response.ok) {
      const errorText = await response.text();
      log.error(`AI gateway error: ${response.status} - ${errorText}`);
      return error(`AI gateway error: ${response.status}`, 500);
    }

    const data = await response.json();
    const formattedContent = data.choices[0]?.message?.content;

    if (!formattedContent) return error("No content returned from AI", 500);

    log.info(`Success - processed ${content.length} chars to ${formattedContent.length} chars`);

    return json({ formattedContent });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("Error:", err);
    return error(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
