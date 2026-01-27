-- ============================================================================
-- MIGRATION: Sistema de Métricas de Tarefas + Colunas de Tracking
-- ============================================================================

-- 1. Adicionar colunas de tracking na tabela tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS track_metrics boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS metric_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS track_comments boolean DEFAULT false;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.tasks.track_metrics IS 'Se true, solicita métrica ao concluir tarefa';
COMMENT ON COLUMN public.tasks.metric_type IS 'Tipo de métrica: time_minutes, pages, weight_kg, distance_km, count, percentage, calories, money';
COMMENT ON COLUMN public.tasks.track_comments IS 'Se true, solicita comentário ao concluir tarefa';

-- 2. Criar tabela para logs de conclusão de tarefas
CREATE TABLE IF NOT EXISTS public.task_completion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metric_value NUMERIC DEFAULT NULL,
  metric_type TEXT DEFAULT NULL,
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_task_completion_logs_task_id ON public.task_completion_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_logs_user_id ON public.task_completion_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_logs_completed_at ON public.task_completion_logs(completed_at);

-- 4. Habilitar RLS
ALTER TABLE public.task_completion_logs ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
CREATE POLICY "Users can view own completion logs" 
ON public.task_completion_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completion logs" 
ON public.task_completion_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completion logs" 
ON public.task_completion_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own completion logs" 
ON public.task_completion_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Remover coluna obsoleta show_in_daily da tabela columns
ALTER TABLE public.columns DROP COLUMN IF EXISTS show_in_daily;