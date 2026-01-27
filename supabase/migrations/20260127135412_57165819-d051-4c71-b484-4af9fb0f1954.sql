-- Add author column to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS author text DEFAULT NULL;