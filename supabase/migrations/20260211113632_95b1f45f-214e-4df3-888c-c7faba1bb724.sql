
-- Permitir update nos logs (para reenvio)
CREATE POLICY "Users can update own whatsapp logs"
  ON whatsapp_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- Coluna de contagem de tentativas
ALTER TABLE whatsapp_logs ADD COLUMN retry_count integer DEFAULT 0;
