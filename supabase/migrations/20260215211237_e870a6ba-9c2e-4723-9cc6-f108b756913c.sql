
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_total_users integer;
  v_total_completed_tasks integer;
  v_active_users_today integer;
  v_new_users_chart jsonb;
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Total users
  SELECT count(*) INTO v_total_users FROM public.profiles;

  -- Total completed tasks (status contains 'conclu' case-insensitive or equals 'done')
  SELECT count(*) INTO v_total_completed_tasks
  FROM public.tasks
  WHERE status ILIKE '%conclu%' OR status ILIKE '%done%' OR status ILIKE '%feito%';

  -- Active users today: users who updated tasks or created focus sessions today
  SELECT count(DISTINCT uid) INTO v_active_users_today
  FROM (
    SELECT user_id AS uid FROM public.tasks WHERE updated_at::date = CURRENT_DATE
    UNION
    SELECT user_id AS uid FROM public.focus_sessions WHERE created_at::date = CURRENT_DATE
  ) AS active;

  -- New users chart: last 7 days
  SELECT coalesce(jsonb_agg(row_to_json(d)::jsonb ORDER BY d.date), '[]'::jsonb)
  INTO v_new_users_chart
  FROM (
    SELECT
      ds.date::text AS date,
      count(p.id) AS count
    FROM generate_series(CURRENT_DATE - interval '6 days', CURRENT_DATE, '1 day') AS ds(date)
    LEFT JOIN public.profiles p ON p.created_at::date = ds.date
    GROUP BY ds.date
    ORDER BY ds.date
  ) d;

  result := jsonb_build_object(
    'total_users', v_total_users,
    'total_completed_tasks', v_total_completed_tasks,
    'active_users_today', v_active_users_today,
    'new_users_chart', v_new_users_chart
  );

  RETURN result;
END;
$$;
