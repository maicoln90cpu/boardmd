-- Tornar as tabelas públicas (remover necessidade de autenticação)
-- Remover políticas existentes baseadas em auth
DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can create their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;

DROP POLICY IF EXISTS "Users can view their own columns" ON public.columns;
DROP POLICY IF EXISTS "Users can create their own columns" ON public.columns;
DROP POLICY IF EXISTS "Users can update their own columns" ON public.columns;
DROP POLICY IF EXISTS "Users can delete their own columns" ON public.columns;

DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can view their own activity" ON public.activity_log;
DROP POLICY IF EXISTS "Users can create their own activity" ON public.activity_log;

-- Tornar user_id nullable (já que não usaremos auth)
ALTER TABLE public.categories ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.columns ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.activity_log ALTER COLUMN user_id DROP NOT NULL;

-- Criar políticas públicas (permitir todas as operações sem autenticação)
CREATE POLICY "Public can view all categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public can create categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Public can delete categories" ON public.categories FOR DELETE USING (true);

CREATE POLICY "Public can view all columns" ON public.columns FOR SELECT USING (true);
CREATE POLICY "Public can create columns" ON public.columns FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update columns" ON public.columns FOR UPDATE USING (true);
CREATE POLICY "Public can delete columns" ON public.columns FOR DELETE USING (true);

CREATE POLICY "Public can view all tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Public can create tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Public can delete tasks" ON public.tasks FOR DELETE USING (true);

CREATE POLICY "Public can view all activity" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "Public can create activity" ON public.activity_log FOR INSERT WITH CHECK (true);

-- Criar categoria especial "Diário" se não existir
INSERT INTO public.categories (name, user_id)
SELECT 'Diário', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Diário');