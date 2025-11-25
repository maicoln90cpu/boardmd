-- Adicionar coluna is_completed para sincronizar estado de conclusão de tarefas
ALTER TABLE tasks ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;

-- Criar índice para melhorar performance em queries de tarefas completadas
CREATE INDEX idx_tasks_is_completed ON tasks(is_completed);

-- Comentário explicativo
COMMENT ON COLUMN tasks.is_completed IS 'Indica se a tarefa foi marcada como concluída pelo usuário (checkbox). Independente da coluna em que está.';
