-- Função RPC para obter estatísticas do dashboard de forma otimizada
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE is_completed = true),
    'pending', COUNT(*) FILTER (WHERE is_completed = false OR is_completed IS NULL),
    'overdue', COUNT(*) FILTER (WHERE due_date < NOW() AND (is_completed = false OR is_completed IS NULL)),
    'due_today', COUNT(*) FILTER (WHERE DATE(due_date) = CURRENT_DATE AND (is_completed = false OR is_completed IS NULL)),
    'due_this_week', COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + INTERVAL '7 days' AND (is_completed = false OR is_completed IS NULL)),
    'completed_today', COUNT(*) FILTER (WHERE DATE(updated_at) = CURRENT_DATE AND is_completed = true),
    'completed_this_week', COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '7 days' AND is_completed = true),
    'high_priority', COUNT(*) FILTER (WHERE priority = 'high' AND (is_completed = false OR is_completed IS NULL)),
    'favorites', COUNT(*) FILTER (WHERE is_favorite = true)
  )
  FROM tasks 
  WHERE user_id = p_user_id;
$$;

-- Função RPC para obter produtividade dos últimos 7 dias
CREATE OR REPLACE FUNCTION get_productivity_7_days(p_user_id UUID)
RETURNS TABLE(day DATE, day_name TEXT, completed_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '6 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    )::DATE as day
  ),
  completed_tasks AS (
    SELECT 
      DATE(updated_at) as completion_day,
      COUNT(*) as count
    FROM tasks 
    WHERE user_id = p_user_id 
      AND is_completed = true
      AND updated_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(updated_at)
  )
  SELECT 
    ds.day,
    TO_CHAR(ds.day, 'Dy') as day_name,
    COALESCE(ct.count, 0) as completed_count
  FROM date_series ds
  LEFT JOIN completed_tasks ct ON ds.day = ct.completion_day
  ORDER BY ds.day;
$$;

-- Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_productivity_7_days(UUID) TO authenticated;