-- Criar tabela para sessões de Pomodoro
CREATE TABLE public.pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  session_type TEXT NOT NULL DEFAULT 'work' CHECK (session_type IN ('work', 'short_break', 'long_break')),
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own pomodoro sessions" 
  ON public.pomodoro_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pomodoro sessions" 
  ON public.pomodoro_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pomodoro sessions" 
  ON public.pomodoro_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pomodoro sessions" 
  ON public.pomodoro_sessions FOR DELETE 
  USING (auth.uid() = user_id);