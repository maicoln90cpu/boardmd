-- Adicionar campos para notas
ALTER TABLE public.notes
ADD COLUMN is_pinned boolean NOT NULL DEFAULT false,
ADD COLUMN color text DEFAULT NULL;

-- Adicionar campo de cor para colunas
ALTER TABLE public.columns
ADD COLUMN color text DEFAULT NULL;

-- Adicionar campos para tarefas recorrentes e subtarefas
ALTER TABLE public.tasks
ADD COLUMN recurrence_rule jsonb DEFAULT NULL,
ADD COLUMN subtasks jsonb DEFAULT '[]'::jsonb;

-- Índices para melhor performance
CREATE INDEX idx_notes_is_pinned ON public.notes(is_pinned);
CREATE INDEX idx_notes_color ON public.notes(color);
CREATE INDEX idx_columns_color ON public.columns(color);