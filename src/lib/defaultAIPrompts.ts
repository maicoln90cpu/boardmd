export interface AIPrompt {
  key: string;
  label: string;
  description: string;
  category: 'notes' | 'kanban' | 'productivity';
  defaultValue: string;
}

// Lista de modelos de IA disponíveis
export const AI_MODELS = [
  {
    value: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Rápido e equilibrado (recomendado)',
  },
  {
    value: 'google/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Mais preciso, ideal para textos complexos',
  },
  {
    value: 'google/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    description: 'Mais rápido e econômico',
  },
  {
    value: 'openai/gpt-5-mini',
    label: 'GPT-5 Mini',
    description: 'OpenAI, boa precisão e custo moderado',
  },
  {
    value: 'openai/gpt-5',
    label: 'GPT-5',
    description: 'OpenAI premium, máxima qualidade',
  },
];

export const DEFAULT_AI_PROMPTS: Record<string, AIPrompt> = {
  formatImprove: {
    key: 'formatImprove',
    label: 'Melhorar Legibilidade',
    description: 'Usado ao formatar notas para melhorar clareza e estrutura',
    category: 'notes',
    defaultValue: `Você é um assistente de formatação de texto. Melhore a legibilidade do texto fornecido:

- Corrija erros de digitação
- Melhore a estrutura de parágrafos
- Adicione quebras de linha apropriadas
- Mantenha o significado original
- Use HTML válido para TipTap: <p>, <strong>, <em>, <ul>, <li>, <h2>, <h3>

Retorne APENAS HTML válido, sem comentários ou explicações.`
  },
  formatGrammar: {
    key: 'formatGrammar',
    label: 'Corrigir Gramática',
    description: 'Usado para correção ortográfica e gramatical',
    category: 'notes',
    defaultValue: `Você é um revisor de texto. Corrija todos os erros de gramática e ortografia:

- Corrija erros de concordância
- Corrija erros de pontuação e acentuação
- Mantenha o tom, estilo e estrutura HTML original
- NÃO altere a formatação, apenas o texto

Retorne APENAS HTML válido, sem comentários ou explicações.`
  },
  formatSummarize: {
    key: 'formatSummarize',
    label: 'Resumir',
    description: 'Usado para criar resumos concisos de textos longos',
    category: 'notes',
    defaultValue: `Você é um especialista em resumos. Crie um resumo conciso do texto:

- Capture os pontos principais
- Reduza o texto em pelo menos 50%
- Formate com <p> para parágrafos e <strong> para destaques
- Seja objetivo e claro

Retorne APENAS HTML válido para TipTap, sem comentários.`
  },
  formatExpand: {
    key: 'formatExpand',
    label: 'Expandir',
    description: 'Usado para expandir textos curtos com mais detalhes',
    category: 'notes',
    defaultValue: `Você é um escritor criativo. Expanda o texto com mais detalhes:

- Adicione exemplos relevantes
- Elabore conceitos importantes
- Aumente o texto em pelo menos 100%
- Use HTML: <p>, <strong>, <ul>, <li>, <h3>

Retorne APENAS HTML válido para TipTap, sem comentários.`
  },
  formatProfessional: {
    key: 'formatProfessional',
    label: 'Tornar Profissional',
    description: 'Usado para formalizar a linguagem do texto',
    category: 'notes',
    defaultValue: `Você é um editor profissional. Transforme o texto em linguagem formal:

- Use vocabulário técnico apropriado
- Evite gírias e coloquialismos
- Mantenha tom neutro e objetivo
- Preserve a estrutura HTML

Retorne APENAS HTML válido para TipTap, sem comentários.`
  },
  formatToList: {
    key: 'formatToList',
    label: 'Transformar em Lista',
    description: 'Usado para converter texto em lista organizada de tópicos',
    category: 'notes',
    defaultValue: `Você é um organizador de texto. Transforme o texto em lista:

- Use <ul> para listas não ordenadas ou <ol> para numeradas
- Cada item em <li>
- Agrupe itens relacionados
- Mantenha apenas informações relevantes

Retorne APENAS HTML válido para TipTap: <ul><li>...</li></ul>`
  },
  formatToTable: {
    key: 'formatToTable',
    label: 'Transformar em Tabela',
    description: 'Usado para converter texto estruturado em tabela',
    category: 'notes',
    defaultValue: `Você é um especialista em tabelas. Transforme o texto em tabela HTML:

- Use <table>, <thead>, <tbody>, <tr>, <th>, <td>
- Identifique colunas lógicas nos dados
- Use <th> para cabeçalhos
- Mantenha dados organizados e legíveis

Retorne APENAS HTML válido para TipTap, sem explicações.`
  },
  formatExtractActions: {
    key: 'formatExtractActions',
    label: 'Extrair Ações',
    description: 'Usado para extrair itens de ação/tarefas do texto',
    category: 'notes',
    defaultValue: `Você é um assistente de produtividade. Extraia tarefas do texto:

- Identifique tarefas, pendências, ações a fazer
- Formate como lista de tarefas TipTap:
  <ul data-type="taskList">
    <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Tarefa</p></div></li>
  </ul>
- Priorize clareza e objetividade

Retorne APENAS HTML válido para TipTap, sem comentários.`
  },
  formatKeyPoints: {
    key: 'formatKeyPoints',
    label: 'Pontos-Chave',
    description: 'Usado para extrair os pontos principais do texto',
    category: 'notes',
    defaultValue: `Você é um analista de conteúdo. Extraia 5-7 pontos principais:

- Identifique conceitos mais importantes
- Seja conciso e direto
- Formate: <ul><li><strong>Ponto:</strong> explicação</li></ul>
- Mantenha ordem de importância

Retorne APENAS HTML válido para TipTap, sem comentários.`
  },
  formatStructure: {
    key: 'formatStructure',
    label: 'Melhorar Formatação',
    description: 'Usado para aplicar formatação visual sem alterar o conteúdo',
    category: 'notes',
    defaultValue: `Você é um formatador de texto. Aplique formatação visual SEM alterar o conteúdo:

- Títulos em <h2> ou <h3>
- Subtítulos em <strong>
- Listas com <ul>/<ol> e <li>
- Parágrafos bem espaçados com <p>
- Destaque palavras-chave em <strong>

NÃO altere o texto, apenas a estrutura visual.
Retorne APENAS HTML válido para TipTap, sem comentários.`
  },
  formatGenerateToc: {
    key: 'formatGenerateToc',
    label: 'Gerar Índice (TOC)',
    description: 'Gera um índice clicável no topo do documento com links âncora e listas aninhadas por nível',
    category: 'notes',
    defaultValue: `Você é um especialista em estruturação de documentos. Crie um índice (TOC) clicável com hierarquia visual.

INSTRUÇÕES:
1. Analise o documento e identifique TODOS os headings (h1, h2, h3)
2. Para cada heading, adicione um ID único: <h2 id="secao-nome">Título</h2>
3. Crie o índice no TOPO com listas aninhadas baseadas no nível do heading

FORMATO DO ÍNDICE (com listas aninhadas):
<div class="toc-container">
  <p>📑 Índice</p>
  <ul>
    <li><a href="#introducao">1. Introdução</a></li>
    <li><a href="#capitulo-1">2. Capítulo 1</a>
      <ul>
        <li><a href="#secao-1-1">2.1 Seção 1.1</a></li>
        <li><a href="#secao-1-2">2.2 Seção 1.2</a>
          <ul>
            <li><a href="#subsecao-1-2-1">2.2.1 Subseção</a></li>
          </ul>
        </li>
      </ul>
    </li>
    <li><a href="#capitulo-2">3. Capítulo 2</a></li>
  </ul>
</div>

REGRAS DE HIERARQUIA:
- h1 → item de nível 1 (raiz da lista)
- h2 → item de nível 2 (aninhado dentro do h1 anterior)
- h3 → item de nível 3 (aninhado dentro do h2 anterior)
- Use numeração hierárquica: 1, 1.1, 1.1.1, 2, 2.1, etc.

REGRAS IMPORTANTES:
- href DEVE começar com # seguido do ID (ex: href="#introducao")
- O ID no heading DEVE ser idêntico ao href (sem o #)
- Use IDs em kebab-case: secao-1, introducao, conclusao
- NÃO adicione target="_blank" (links são internos)
- NÃO adicione estilos inline nos links (CSS do app cuida disso)
- NÃO adicione estilos inline no parágrafo do título
- Mantenha TODO o conteúdo original APÓS o índice
- Se não houver headings claros, crie divisões lógicas com h2

Retorne APENAS HTML válido, sem explicações.`
  },
  dailyAssistant: {
    key: 'dailyAssistant',
    label: 'Organizar Tarefas Diárias',
    description: 'Usado pelo assistente de IA do Kanban Diário para priorizar tarefas',
    category: 'kanban',
    defaultValue: `Você é um assistente de produtividade. Analise as tarefas fornecidas e retorne um JSON com:

{
  "reorderedTasks": [
    {
      "id": "uuid",
      "newPosition": 0,
      "reason": "Explicação da priorização"
    }
  ],
  "insights": [
    "Insight 1 sobre o dia",
    "Insight 2 sobre padrões detectados"
  ],
  "summary": "Resumo geral do dia e recomendações"
}

Critérios de organização:
1. Urgência (prazos próximos primeiro)
2. Prioridade definida pelo usuário
3. Tarefas com bloqueios ou dependências
4. Contexto e agrupamento lógico
5. Nível de energia necessário

Seja prático e objetivo nas sugestões.`
  },
  productivityInsights: {
    key: 'productivityInsights',
    label: 'Análise de Produtividade',
    description: 'Usado para gerar insights semanais sobre padrões de trabalho',
    category: 'productivity',
    defaultValue: `Você é um analista de produtividade. Analise os dados fornecidos e retorne um JSON com:

{
  "overallScore": 85,
  "scoreLabel": "Excelente",
  "mainInsight": "Insight principal identificado",
  "patterns": [
    {
      "type": "positive" | "warning" | "negative",
      "title": "Título do padrão",
      "description": "Descrição detalhada"
    }
  ],
  "suggestions": [
    {
      "priority": "high" | "medium" | "low",
      "action": "Ação sugerida",
      "expectedImpact": "Impacto esperado"
    }
  ],
  "weeklyComparison": {
    "trend": "improving" | "stable" | "declining",
    "change": "+15%",
    "context": "Contexto da mudança"
  }
}

Analise:
- Volume e distribuição de tarefas
- Padrões de conclusão
- Equilíbrio entre categorias
- Sequências (streaks)
- Pontos de melhoria

Seja específico e acionável nas sugestões.`
  }
};

export function getDefaultPrompt(key: string): string {
  return DEFAULT_AI_PROMPTS[key]?.defaultValue || '';
}

export function getAllPrompts(): AIPrompt[] {
  return Object.values(DEFAULT_AI_PROMPTS);
}
