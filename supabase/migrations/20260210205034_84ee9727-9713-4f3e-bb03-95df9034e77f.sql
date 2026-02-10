
ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS send_time_2 time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS due_date_hours_before integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS excluded_column_ids uuid[] DEFAULT '{}';
