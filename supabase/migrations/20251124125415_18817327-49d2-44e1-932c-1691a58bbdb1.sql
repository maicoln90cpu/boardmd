-- Adicionar colunas para controlar visibilidade por tipo de kanban
ALTER TABLE public.columns
ADD COLUMN show_in_daily boolean DEFAULT true,
ADD COLUMN show_in_projects boolean DEFAULT true;

-- Atualizar colunas existentes baseado no kanban_type
UPDATE public.columns
SET 
  show_in_daily = CASE 
    WHEN kanban_type = 'projects' THEN false
    ELSE true
  END,
  show_in_projects = CASE 
    WHEN kanban_type = 'daily' THEN false
    ELSE true
  END;