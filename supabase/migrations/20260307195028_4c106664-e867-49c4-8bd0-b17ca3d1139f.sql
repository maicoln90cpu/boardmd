ALTER TABLE public.cost_themes ADD COLUMN cc_fee_percent numeric NOT NULL DEFAULT 10;
ALTER TABLE public.cost_themes ADD COLUMN cc_iof_percent numeric NOT NULL DEFAULT 6;