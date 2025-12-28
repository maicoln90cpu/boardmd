-- FASE 1: Correção de Segurança - RLS Policies
-- Alterar policies públicas para restringir acesso por user_id

-- =====================================================
-- TASKS TABLE - Corrigir RLS
-- =====================================================

-- Remover policies públicas existentes
DROP POLICY IF EXISTS "Public can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Public can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Public can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Public can delete tasks" ON public.tasks;

-- Criar policies seguras
CREATE POLICY "Users can view own tasks" 
ON public.tasks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" 
ON public.tasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================================
-- COLUMNS TABLE - Corrigir RLS
-- =====================================================

-- Remover policies públicas existentes
DROP POLICY IF EXISTS "Public can view all columns" ON public.columns;
DROP POLICY IF EXISTS "Public can create columns" ON public.columns;
DROP POLICY IF EXISTS "Public can update columns" ON public.columns;
DROP POLICY IF EXISTS "Public can delete columns" ON public.columns;

-- Criar policies seguras
CREATE POLICY "Users can view own columns" 
ON public.columns 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own columns" 
ON public.columns 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own columns" 
ON public.columns 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own columns" 
ON public.columns 
FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================================
-- CATEGORIES TABLE - Corrigir RLS
-- =====================================================

-- Remover policies públicas existentes
DROP POLICY IF EXISTS "Public can view all categories" ON public.categories;
DROP POLICY IF EXISTS "Public can create categories" ON public.categories;
DROP POLICY IF EXISTS "Public can update categories" ON public.categories;
DROP POLICY IF EXISTS "Public can delete categories" ON public.categories;

-- Criar policies seguras
CREATE POLICY "Users can view own categories" 
ON public.categories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================================
-- ACTIVITY_LOG TABLE - Também precisa correção
-- =====================================================

-- Remover policies públicas existentes
DROP POLICY IF EXISTS "Public can view all activity" ON public.activity_log;
DROP POLICY IF EXISTS "Public can create activity" ON public.activity_log;

-- Criar policies seguras
CREATE POLICY "Users can view own activity" 
ON public.activity_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activity" 
ON public.activity_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);