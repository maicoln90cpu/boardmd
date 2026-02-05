-- Adicionar campo na tabela tasks para vincular a curso
ALTER TABLE tasks 
ADD COLUMN linked_course_id uuid REFERENCES courses(id) ON DELETE SET NULL;

-- Adicionar campo na tabela courses para vincular a tarefa
ALTER TABLE courses 
ADD COLUMN linked_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;