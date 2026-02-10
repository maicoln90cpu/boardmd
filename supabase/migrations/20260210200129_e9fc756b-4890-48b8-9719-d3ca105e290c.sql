
-- WhatsApp Config table (one per user)
CREATE TABLE public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instance_name text NOT NULL,
  instance_id text,
  phone_number text,
  api_url text,
  api_key text,
  is_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own whatsapp config" ON public.whatsapp_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own whatsapp config" ON public.whatsapp_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own whatsapp config" ON public.whatsapp_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own whatsapp config" ON public.whatsapp_config FOR DELETE USING (auth.uid() = user_id);

-- WhatsApp Templates table
CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_type text NOT NULL,
  message_template text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own whatsapp templates" ON public.whatsapp_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own whatsapp templates" ON public.whatsapp_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own whatsapp templates" ON public.whatsapp_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own whatsapp templates" ON public.whatsapp_templates FOR DELETE USING (auth.uid() = user_id);

-- WhatsApp Logs table
CREATE TABLE public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_type text,
  phone_number text,
  message text,
  status text DEFAULT 'pending',
  error_message text,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own whatsapp logs" ON public.whatsapp_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own whatsapp logs" ON public.whatsapp_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
