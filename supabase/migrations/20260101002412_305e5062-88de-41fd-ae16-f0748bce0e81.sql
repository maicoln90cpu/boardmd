-- Permitir usuários deletarem seus perfis (conformidade LGPD/GDPR)
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- Permitir usuários deletarem seu histórico de tarefas
CREATE POLICY "Users can delete own task history" ON task_history
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Permitir usuários deletarem seus logs de atividade
CREATE POLICY "Users can delete own activity logs" ON activity_log
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Permitir usuários deletarem suas estatísticas
CREATE POLICY "Users can delete own stats" ON user_stats
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);