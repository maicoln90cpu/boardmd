-- Remover policy antiga que permite qualquer usuário inserir logs
DROP POLICY IF EXISTS "Service can insert logs" ON push_logs;

-- Criar nova policy que valida user_id = auth.uid()
CREATE POLICY "Users can insert own logs" ON push_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);