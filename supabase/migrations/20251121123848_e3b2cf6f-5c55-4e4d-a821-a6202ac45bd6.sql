-- Add position column to categories table
ALTER TABLE public.categories ADD COLUMN position integer NOT NULL DEFAULT 0;

-- Update existing categories with sequential positions
WITH ranked_categories AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 as new_position
  FROM public.categories
)
UPDATE public.categories
SET position = ranked_categories.new_position
FROM ranked_categories
WHERE categories.id = ranked_categories.id;