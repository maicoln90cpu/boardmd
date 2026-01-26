-- Adicionar colunas de módulos aos cursos
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS current_module integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_modules integer DEFAULT 1;

-- Comentários para documentação
COMMENT ON COLUMN public.courses.current_episode IS 'Aula/Episódio atual dentro do módulo';
COMMENT ON COLUMN public.courses.total_episodes IS 'Total de aulas/episódios';
COMMENT ON COLUMN public.courses.current_module IS 'Módulo atual';
COMMENT ON COLUMN public.courses.total_modules IS 'Total de módulos';