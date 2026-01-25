
-- Pacote 4: Limpeza de dados legados do sistema de espelhamento
-- Esta migração limpa mirror_task_id e tags espelho-diário

-- 1. Limpar mirror_task_id de todas as tarefas (sistema de espelhamento foi removido)
UPDATE public.tasks
SET mirror_task_id = NULL
WHERE mirror_task_id IS NOT NULL;

-- 2. Remover tag 'espelho-diário' de todas as tarefas
UPDATE public.tasks
SET tags = array_remove(tags, 'espelho-diário')
WHERE 'espelho-diário' = ANY(tags);

-- 3. Adicionar tag 'recorrente' em tarefas com recurrence_rule que não têm essa tag
UPDATE public.tasks
SET tags = array_append(COALESCE(tags, ARRAY[]::text[]), 'recorrente')
WHERE recurrence_rule IS NOT NULL
  AND NOT ('recorrente' = ANY(COALESCE(tags, ARRAY[]::text[])));
