
-- Índice 1: habit_checkins por habit_id + checked_date (usado em toggleCheckin e getStreak)
CREATE INDEX IF NOT EXISTS idx_habit_checkins_habit_date ON habit_checkins(habit_id, checked_date);

-- Índice 2: task_completion_logs por task_id + completed_at (usado em useTaskCompletionLogs)
CREATE INDEX IF NOT EXISTS idx_task_completion_logs_task ON task_completion_logs(task_id, completed_at DESC);

-- Índice 3: notes por notebook_id (usado ao abrir cadernos)
CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook_id) WHERE notebook_id IS NOT NULL;

-- Índice 4: tasks por column_id (usado em todo o Kanban)
CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);

-- Índice 5: tasks por user_id + is_completed parcial (usado em Dashboard, filtros, RPCs)
CREATE INDEX IF NOT EXISTS idx_tasks_user_pending ON tasks(user_id, is_completed) WHERE is_completed = false;
