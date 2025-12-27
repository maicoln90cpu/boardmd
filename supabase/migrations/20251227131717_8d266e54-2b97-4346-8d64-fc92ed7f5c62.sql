-- Adicionar colunas para hierarquia de categorias (projetos hierárquicos)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 0;

-- Índice para performance em queries hierárquicas
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_depth ON categories(depth);