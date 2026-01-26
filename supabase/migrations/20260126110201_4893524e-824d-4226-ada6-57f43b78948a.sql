-- Criar tabela de cursos
CREATE TABLE public.courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  url text,
  price numeric DEFAULT 0,
  current_episode integer DEFAULT 0,
  total_episodes integer DEFAULT 1,
  priority text DEFAULT 'medium',
  status text DEFAULT 'not_started',
  category text,
  platform text,
  notes text,
  started_at date,
  completed_at date,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own courses" 
  ON public.courses FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own courses" 
  ON public.courses FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses" 
  ON public.courses FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own courses" 
  ON public.courses FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger para updated_at automático
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_courses_user_id ON public.courses(user_id);
CREATE INDEX idx_courses_status ON public.courses(user_id, status);
CREATE INDEX idx_courses_category ON public.courses(user_id, category);
CREATE INDEX idx_courses_priority ON public.courses(user_id, priority);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;