
-- Create cost_themes table
CREATE TABLE public.cost_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  currencies jsonb NOT NULL DEFAULT '[{"code":"BRL","name":"Real"},{"code":"USD","name":"Dólar"}]'::jsonb,
  exchange_rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  base_currency text NOT NULL DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create cost_items table
CREATE TABLE public.cost_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES public.cost_themes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  cost_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cost_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for cost_themes
CREATE POLICY "Users can view own cost themes" ON public.cost_themes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own cost themes" ON public.cost_themes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cost themes" ON public.cost_themes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cost themes" ON public.cost_themes FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for cost_items
CREATE POLICY "Users can view own cost items" ON public.cost_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own cost items" ON public.cost_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cost items" ON public.cost_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cost items" ON public.cost_items FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger for cost_themes
CREATE TRIGGER update_cost_themes_updated_at BEFORE UPDATE ON public.cost_themes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
