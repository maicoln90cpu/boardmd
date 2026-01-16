-- Add monthly_cost field to tools table
ALTER TABLE public.tools 
ADD COLUMN monthly_cost DECIMAL(10, 2) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tools.monthly_cost IS 'Monthly cost of the tool in user currency';