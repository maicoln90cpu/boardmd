ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS due_date_hours_before_2 integer DEFAULT NULL;