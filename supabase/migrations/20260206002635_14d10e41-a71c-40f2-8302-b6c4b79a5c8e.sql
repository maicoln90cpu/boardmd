-- Adicionar campo para vincular notas a cursos
ALTER TABLE notes 
ADD COLUMN linked_course_id uuid REFERENCES courses(id) ON DELETE SET NULL;