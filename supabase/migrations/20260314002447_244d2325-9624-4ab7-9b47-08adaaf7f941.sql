
CREATE TABLE public.quick_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🔗',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quick links" ON public.quick_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own quick links" ON public.quick_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quick links" ON public.quick_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quick links" ON public.quick_links FOR DELETE USING (auth.uid() = user_id);
