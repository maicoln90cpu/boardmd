-- Create pomodoro_templates table for custom timer configurations
CREATE TABLE public.pomodoro_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  work_duration INTEGER NOT NULL DEFAULT 25,
  short_break INTEGER NOT NULL DEFAULT 5,
  long_break INTEGER NOT NULL DEFAULT 15,
  sessions_until_long INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pomodoro_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own templates" ON public.pomodoro_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own templates" ON public.pomodoro_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON public.pomodoro_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON public.pomodoro_templates FOR DELETE USING (auth.uid() = user_id);

-- Add task_id to pomodoro_sessions for task association
ALTER TABLE public.pomodoro_sessions ADD COLUMN task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_pomodoro_templates_updated_at
BEFORE UPDATE ON public.pomodoro_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();