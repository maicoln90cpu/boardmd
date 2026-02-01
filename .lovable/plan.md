
# Plano de Implementação - 3 Funcionalidades

## Resumo das Alterações

### 1. Remover Campo API Key das Ferramentas

**Impacto:** Baixo | **Complexidade:** 2/10

#### Arquivos a Modificar:
| Arquivo | Alteração |
|---------|-----------|
| `src/components/tools/ToolModal.tsx` | Remover campo `SecureApiKeyField` e estado `apiKey` |
| `src/components/tools/ToolCard.tsx` | Remover seção de exibição de API Key expandida |
| `src/components/tools/ToolsList.tsx` | Remover referências a `api_key` na interface |
| `src/hooks/useTools.ts` | Manter campo no banco (não remover coluna), apenas não usar |

---

### 2. Nova Aba "API Keys" em Ferramentas

**Impacto:** Alto | **Complexidade:** 6/10

#### Nova Tabela no Banco de Dados:
```sql
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,           -- Ex: "OpenAI", "Google", "Stripe"
  name text NOT NULL,             -- Ex: "Produção", "Desenvolvimento"
  key_value text NOT NULL,        -- A chave em si
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api_keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own api_keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);
```

#### Novos Arquivos:
| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useApiKeys.ts` | Hook para CRUD de API Keys |
| `src/components/tools/ApiKeysList.tsx` | Componente de lista de API Keys |
| `src/components/tools/ApiKeyModal.tsx` | Modal para adicionar/editar API Key |
| `src/components/tools/ApiKeyCard.tsx` | Card individual de API Key |

#### Arquivos a Modificar:
| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Tools.tsx` | Adicionar sistema de abas (Tabs): "Ferramentas" e "API Keys" |

#### Estrutura da Interface:

```typescript
// src/hooks/useApiKeys.ts
interface ApiKey {
  id: string;
  user_id: string;
  source: string;      // "OpenAI", "Google Cloud", etc.
  name: string;        // "Produção", "Teste", "GPT-4 Key"
  key_value: string;   // A chave mascarada
  created_at: string;
  updated_at: string;
}
```

#### Layout da Nova Aba:
```
┌──────────────────────────────────────────────┐
│ [Ferramentas]  [API Keys]  ← Tabs            │
├──────────────────────────────────────────────┤
│ + Adicionar API Key                          │
├──────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐   │
│ │ 🔑 OpenAI                              │   │
│ │    Produção • sk-...xxxx               │   │
│ │    [Editar] [Excluir]                  │   │
│ └────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────┐   │
│ │ 🔑 Google Cloud                        │   │
│ │    Vision API • AIza...xxxx            │   │
│ │    [Editar] [Excluir]                  │   │
│ └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

---

### 3. Upload de Print com IA para Gerar Checklist de Módulos (Cursos)

**Impacto:** Alto | **Complexidade:** 8/10

#### Nova Edge Function:
| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/parse-course-modules/index.ts` | Recebe imagem base64, envia para Gemini Vision, retorna checklist de módulos |

#### Edge Function - Lógica:
```typescript
// Recebe: { image: string (base64) }
// Retorna: { modules: [{ id: string, title: string, completed: boolean }] }

// Usa Gemini 2.5 Pro (multimodal) para analisar a imagem
// Prompt: "Analise esta imagem de um curso e extraia todos os módulos/aulas listados..."
```

#### Modificações no Schema de Cursos:
```sql
-- Adicionar campo de módulos estruturados na tabela courses
ALTER TABLE courses 
ADD COLUMN modules_checklist jsonb DEFAULT '[]'::jsonb;

-- Estrutura do JSON:
-- [{ "id": "uuid", "title": "Módulo 1: Introdução", "completed": false }]
```

#### Novos Arquivos:
| Arquivo | Descrição |
|---------|-----------|
| `src/components/courses/CourseModulesUploader.tsx` | Componente de upload de imagem com preview |
| `src/components/courses/CourseModulesChecklist.tsx` | Checklist interativo dos módulos |

#### Arquivos a Modificar:
| Arquivo | Alteração |
|---------|-----------|
| `src/components/courses/CourseModal.tsx` | Adicionar seção de upload de imagem e checklist |
| `src/hooks/useCourses.ts` | Adicionar função `updateModulesChecklist` |
| `src/types/index.ts` | Adicionar interface `CourseModule` |

#### Layout do Modal de Curso Atualizado:

```
┌──────────────────────────────────────────────┐
│ Adicionar Curso                              │
├──────────────────────────────────────────────┤
│ Nome: [                    ]                 │
│ Autor: [                   ]                 │
│ ...campos existentes...                      │
├──────────────────────────────────────────────┤
│ 📸 Módulos do Curso                          │
│ ┌────────────────────────────────────────┐   │
│ │  [Clique para enviar print]            │   │
│ │   ou arraste a imagem aqui             │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ [✨ Gerar checklist com IA]                  │
│                                              │
│ Checklist gerado:                            │
│ ☐ Módulo 1: Introdução                      │
│ ☐ Módulo 2: Fundamentos                     │
│ ☑ Módulo 3: Prática                         │
│ ☐ Módulo 4: Projeto Final                   │
└──────────────────────────────────────────────┘
```

#### Fluxo de Uso:
1. Usuário abre modal de criação/edição de curso
2. Na seção "Módulos do Curso", clica para enviar print
3. Seleciona imagem da tela do curso mostrando os módulos
4. Clica em "Gerar checklist com IA"
5. IA analisa a imagem e extrai os nomes dos módulos
6. Checklist é exibido com opção de marcar cada módulo como concluído
7. Ao salvar o curso, o checklist é persistido no banco

---

## Resumo de Alterações

| # | Feature | Arquivos Novos | Arquivos Modificados | Complexidade |
|---|---------|----------------|----------------------|--------------|
| 1 | Remover API Key | 0 | 4 | 2/10 |
| 2 | Aba API Keys | 4 + migração | 1 | 6/10 |
| 3 | Upload IA Cursos | 3 + migração + edge function | 3 | 8/10 |

**Pontuação Total de Risco: 16/25** - Dentro do limite seguro.

---

## Checklist de Testes Manuais

### API Keys:
- [ ] Acessar página Ferramentas e ver aba "API Keys"
- [ ] Adicionar nova API Key com fonte, nome e chave
- [ ] Verificar que a chave é mascarada na listagem
- [ ] Editar API Key existente
- [ ] Excluir API Key

### Ferramentas sem API Key:
- [ ] Criar nova ferramenta e confirmar que não há campo de API Key
- [ ] Editar ferramenta existente e confirmar ausência do campo
- [ ] Verificar que card expandido não mostra seção de API Key

### Cursos com Upload de Módulos:
- [ ] Criar novo curso e ver opção de upload de imagem
- [ ] Fazer upload de print dos módulos
- [ ] Clicar em "Gerar checklist com IA" e aguardar resposta
- [ ] Verificar checklist gerado com módulos extraídos
- [ ] Marcar alguns módulos como concluídos
- [ ] Salvar curso e reabrir para confirmar persistência
- [ ] Editar curso existente e adicionar módulos via IA
