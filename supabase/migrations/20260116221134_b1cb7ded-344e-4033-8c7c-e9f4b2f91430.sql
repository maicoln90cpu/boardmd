-- ============================================
-- FASE 1: Gerenciador de Ferramentas Digitais
-- ============================================

-- 1.1 Criar tabela de funções/tags primeiro (referenciada por assignments)
CREATE TABLE public.tool_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- 1.2 Criar tabela principal de ferramentas
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  site_url TEXT,
  api_key TEXT,
  description TEXT,
  icon TEXT DEFAULT 'wrench',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 Criar tabela de relacionamento (many-to-many)
CREATE TABLE public.tool_function_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  function_id UUID NOT NULL REFERENCES public.tool_functions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tool_id, function_id)
);

-- ============================================
-- RLS: tool_functions
-- ============================================
ALTER TABLE public.tool_functions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tool functions"
ON public.tool_functions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tool functions"
ON public.tool_functions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tool functions"
ON public.tool_functions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tool functions"
ON public.tool_functions FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- RLS: tools
-- ============================================
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tools"
ON public.tools FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tools"
ON public.tools FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tools"
ON public.tools FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tools"
ON public.tools FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- RLS: tool_function_assignments
-- ============================================
ALTER TABLE public.tool_function_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tool assignments"
ON public.tool_function_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tools 
    WHERE tools.id = tool_function_assignments.tool_id 
    AND tools.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create own tool assignments"
ON public.tool_function_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tools 
    WHERE tools.id = tool_function_assignments.tool_id 
    AND tools.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own tool assignments"
ON public.tool_function_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tools 
    WHERE tools.id = tool_function_assignments.tool_id 
    AND tools.user_id = auth.uid()
  )
);

-- ============================================
-- Trigger: Atualizar updated_at automaticamente
-- ============================================
CREATE TRIGGER update_tools_updated_at
BEFORE UPDATE ON public.tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Índices para performance
-- ============================================
CREATE INDEX idx_tools_user_id ON public.tools(user_id);
CREATE INDEX idx_tools_name ON public.tools(name);
CREATE INDEX idx_tool_functions_user_id ON public.tool_functions(user_id);
CREATE INDEX idx_tool_assignments_tool_id ON public.tool_function_assignments(tool_id);
CREATE INDEX idx_tool_assignments_function_id ON public.tool_function_assignments(function_id);