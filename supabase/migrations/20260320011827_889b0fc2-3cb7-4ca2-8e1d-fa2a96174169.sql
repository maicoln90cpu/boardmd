
ALTER TABLE public.quick_links 
  ADD COLUMN IF NOT EXISTS folder text DEFAULT null,
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;
