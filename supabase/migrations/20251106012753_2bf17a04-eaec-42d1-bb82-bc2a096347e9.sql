-- Adicionar coluna is_favorite na tabela tasks
ALTER TABLE public.tasks 
ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;

-- Criar índice para melhorar performance de queries de favoritos
CREATE INDEX idx_tasks_is_favorite ON public.tasks(is_favorite) WHERE is_favorite = true;