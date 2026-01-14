-- Índices para melhorar performance das queries de tasks

-- Índice para queries por usuário (usado em TODAS as queries devido ao RLS)
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Índice para filtros por coluna (Kanban)
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);

-- Índice para filtros por categoria
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);

-- Índice para ordenação/filtros por data de vencimento
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Índice para queries de produtividade (dashboard)
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

-- Índice para busca por status de conclusão
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);

-- Índices compostos para queries mais frequentes
CREATE INDEX IF NOT EXISTS idx_tasks_user_column ON tasks(user_id, column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, is_completed);