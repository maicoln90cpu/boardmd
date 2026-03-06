ALTER TABLE cost_items ADD COLUMN category text NOT NULL DEFAULT 'outros';
ALTER TABLE cost_items ADD COLUMN payment_method text NOT NULL DEFAULT 'papel_moeda';