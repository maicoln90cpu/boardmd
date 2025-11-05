-- Criar tabela de histórico de auditoria
CREATE TABLE public.task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  changes JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view own task history" 
ON public.task_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task history" 
ON public.task_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Índice para performance
CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX idx_task_history_created_at ON public.task_history(created_at DESC);