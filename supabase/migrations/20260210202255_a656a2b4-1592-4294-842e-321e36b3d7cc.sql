
-- Add send_time column to whatsapp_templates for scheduling
ALTER TABLE public.whatsapp_templates 
ADD COLUMN send_time time DEFAULT '08:00:00';
