-- Adicionar coluna para vincular nota a tarefa
ALTER TABLE notes ADD COLUMN linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX idx_notes_linked_task_id ON notes(linked_task_id);

-- Adicionar coluna reversa na tarefa para saber quais notas estão vinculadas
ALTER TABLE tasks ADD COLUMN linked_note_id UUID REFERENCES notes(id) ON DELETE SET NULL;

-- Índice para busca reversa
CREATE INDEX idx_tasks_linked_note_id ON tasks(linked_note_id);