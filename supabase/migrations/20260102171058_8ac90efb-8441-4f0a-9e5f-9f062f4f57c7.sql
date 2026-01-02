-- Criar tabela audit_logs para eventos de segurança
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para consultas eficientes
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - usuários só podem ver seus próprios logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Permitir inserção via service role (edge functions) ou próprio usuário
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Adicionar comentário na tabela
COMMENT ON TABLE public.audit_logs IS 'Logs de auditoria para eventos de segurança (LGPD/GDPR compliance)';
COMMENT ON COLUMN public.audit_logs.event_type IS 'Tipos: login, logout, delete_account, password_change, data_export, failed_login';