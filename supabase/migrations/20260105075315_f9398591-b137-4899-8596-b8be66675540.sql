-- Adicionar policy de UPDATE na tabela push_logs
CREATE POLICY "Users can update their own push logs"
ON public.push_logs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);