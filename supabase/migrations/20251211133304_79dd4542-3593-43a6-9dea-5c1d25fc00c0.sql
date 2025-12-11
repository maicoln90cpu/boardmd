-- Adicionar coluna tags JSONB na tabela notebooks
-- Estrutura: [{ "id": "uuid", "name": "string", "color": "string" }]
ALTER TABLE public.notebooks 
ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;

-- Adicionar índice GIN para buscas eficientes em tags
CREATE INDEX idx_notebooks_tags ON public.notebooks USING GIN(tags);