-- Índices para tabela goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals (user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_completed ON public.goals (user_id, is_completed);

-- Índices para tabela pomodoro_sessions
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON public.pomodoro_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_started ON public.pomodoro_sessions (user_id, started_at DESC);

-- Índices para tabela task_history
CREATE INDEX IF NOT EXISTS idx_task_history_user_id ON public.task_history (user_id);

-- Índices para tabela whatsapp_logs
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_user_id ON public.whatsapp_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_user_sent ON public.whatsapp_logs (user_id, sent_at DESC);

-- Índice para tabela activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON public.activity_log (user_id, created_at DESC);

-- Índices compostos para tabela tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON public.tasks (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_position ON public.tasks (user_id, position);

-- Índice para tabela tags
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags (user_id);

-- Índice para tabela tools
CREATE INDEX IF NOT EXISTS idx_tools_user_id ON public.tools (user_id);