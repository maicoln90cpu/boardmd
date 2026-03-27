
-- RPC 1: batch_update_positions
CREATE OR REPLACE FUNCTION public.batch_update_positions(
  p_table_name text,
  p_updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item jsonb;
  allowed_tables text[] := ARRAY['categories','columns','quick_links','tasks'];
BEGIN
  IF NOT (p_table_name = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'Table not allowed: %', p_table_name;
  END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    EXECUTE format('UPDATE %I SET position = $1 WHERE id = $2', p_table_name)
    USING (item->>'position')::int, (item->>'id')::uuid;
  END LOOP;
END;
$$;

-- RPC 2: get_tools_with_functions
CREATE OR REPLACE FUNCTION public.get_tools_with_functions(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  site_url text,
  api_key text,
  description text,
  icon text,
  is_favorite boolean,
  monthly_cost numeric,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  function_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    t.id, t.name, t.site_url, t.api_key, t.description, t.icon,
    t.is_favorite, t.monthly_cost, t.user_id, t.created_at, t.updated_at,
    COALESCE(array_agg(tfa.function_id) FILTER (WHERE tfa.function_id IS NOT NULL), '{}')
  FROM tools t
  LEFT JOIN tool_function_assignments tfa ON tfa.tool_id = t.id
  WHERE t.user_id = p_user_id
  GROUP BY t.id
  ORDER BY t.name;
$$;

-- RPC 3: get_habits_with_checkins
CREATE OR REPLACE FUNCTION public.get_habits_with_checkins(
  p_user_id uuid,
  p_since date DEFAULT CURRENT_DATE - INTERVAL '90 days'
)
RETURNS TABLE(
  habit_id uuid,
  habit_name text,
  frequency text,
  color text,
  icon text,
  is_archived boolean,
  habit_created_at timestamptz,
  habit_updated_at timestamptz,
  checkin_id uuid,
  checked_date date,
  checkin_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    h.id, h.name, h.frequency, h.color, h.icon, h.is_archived,
    h.created_at, h.updated_at,
    hc.id, hc.checked_date, hc.created_at
  FROM habits h
  LEFT JOIN habit_checkins hc ON hc.habit_id = h.id AND hc.checked_date >= p_since
  WHERE h.user_id = p_user_id
  ORDER BY h.created_at ASC, hc.checked_date DESC;
$$;

-- RPC 4: get_task_counts_by_category
CREATE OR REPLACE FUNCTION public.get_task_counts_by_category(p_user_id uuid)
RETURNS TABLE(category_id uuid, task_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT category_id, COUNT(*) as task_count
  FROM tasks
  WHERE user_id = p_user_id
  GROUP BY category_id;
$$;
