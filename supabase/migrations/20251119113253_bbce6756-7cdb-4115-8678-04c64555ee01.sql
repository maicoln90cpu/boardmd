-- Adicionar campo kanban_type na tabela columns para permitir colunas específicas por tipo de Kanban
ALTER TABLE columns 
ADD COLUMN kanban_type TEXT DEFAULT 'shared' 
CHECK (kanban_type IN ('daily', 'projects', 'shared'));

-- Criar índice para melhorar performance nas queries filtradas por tipo
CREATE INDEX IF NOT EXISTS idx_columns_kanban_type ON columns(kanban_type);

-- Comentário explicativo
COMMENT ON COLUMN columns.kanban_type IS 'Tipo de Kanban: daily (Diário), projects (Projetos), shared (Compartilhado em ambos)';