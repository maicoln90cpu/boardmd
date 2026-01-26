-- Create table for course categories
CREATE TABLE public.course_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own course categories"
  ON public.course_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own course categories"
  ON public.course_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own course categories"
  ON public.course_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own course categories"
  ON public.course_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_course_categories_updated_at
  BEFORE UPDATE ON public.course_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();