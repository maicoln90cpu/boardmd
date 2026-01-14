-- Adicionar campo auto_increment para integração com tarefas
ALTER TABLE public.goals 
ADD COLUMN auto_increment BOOLEAN NOT NULL DEFAULT true;