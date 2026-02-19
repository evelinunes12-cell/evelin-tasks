
-- Drop the overloaded version with parameters first, then recreate both
DROP FUNCTION IF EXISTS public.get_admin_stats(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_admin_stats();

-- Recreate the parameterized version with new metrics
CREATE OR REPLACE FUNCTION public.get_admin_stats(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  v_total_users integer;
  v_total_completed_tasks integer;
  v_active_users_today integer;
  v_new_users_chart jsonb;
  v_start date;
  v_end date;
  v_total_tasks_created integer;
  v_completion_rate numeric;
  v_inactive_users integer;
  v_active_users_list jsonb;
  v_usage_ranking jsonb;
  v_tasks_created_chart jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  v_start := COALESCE(p_start_date::date, '1970-01-01'::date);
  v_end := COALESCE(p_end_date::date, CURRENT_DATE);

  -- Total users created in range
  SELECT count(*) INTO v_total_users
  FROM public.profiles
  WHERE created_at::date BETWEEN v_start AND v_end;

  -- Total completed tasks in range
  SELECT count(*) INTO v_total_completed_tasks
  FROM public.tasks
  WHERE (status ILIKE '%conclu%' OR status ILIKE '%done%' OR status ILIKE '%feito%')
    AND updated_at::date BETWEEN v_start AND v_end;

  -- Total tasks created in range
  SELECT count(*) INTO v_total_tasks_created
  FROM public.tasks
  WHERE created_at::date BETWEEN v_start AND v_end;

  -- Completion rate
  IF v_total_tasks_created > 0 THEN
    v_completion_rate := ROUND((v_total_completed_tasks::numeric / v_total_tasks_created::numeric) * 100, 1);
  ELSE
    v_completion_rate := 0;
  END IF;

  -- Active users today
  SELECT count(DISTINCT uid) INTO v_active_users_today
  FROM (
    SELECT user_id AS uid FROM public.tasks WHERE updated_at::date = CURRENT_DATE
    UNION
    SELECT user_id AS uid FROM public.focus_sessions WHERE created_at::date = CURRENT_DATE
  ) AS active;

  -- Inactive users (no activity in last 7 days)
  SELECT count(*) INTO v_inactive_users
  FROM public.profiles p
  WHERE p.is_active = true
    AND (p.last_activity_date IS NULL OR p.last_activity_date < CURRENT_DATE - 7);

  -- Active users list (accessed in date range based on last_activity_date or tasks/focus)
  SELECT coalesce(jsonb_agg(row_to_json(u)::jsonb ORDER BY u.last_seen DESC), '[]'::jsonb)
  INTO v_active_users_list
  FROM (
    SELECT DISTINCT ON (p.id)
      p.email,
      p.full_name,
      COALESCE(p.last_activity_date::text, p.created_at::date::text) AS last_seen
    FROM public.profiles p
    WHERE p.is_active = true
      AND p.last_activity_date IS NOT NULL
      AND p.last_activity_date >= CURRENT_DATE - 7
    ORDER BY p.id, p.last_activity_date DESC
    LIMIT 50
  ) u;

  -- Usage ranking (top 10 users by tasks + focus sessions in range)
  SELECT coalesce(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.score DESC), '[]'::jsonb)
  INTO v_usage_ranking
  FROM (
    SELECT
      p.full_name,
      p.email,
      COALESCE(t.task_count, 0) AS tasks_created,
      COALESCE(tc.completed_count, 0) AS tasks_completed,
      COALESCE(f.focus_count, 0) AS focus_sessions,
      (COALESCE(t.task_count, 0) + COALESCE(tc.completed_count, 0) * 2 + COALESCE(f.focus_count, 0)) AS score
    FROM public.profiles p
    LEFT JOIN (
      SELECT user_id, count(*) AS task_count
      FROM public.tasks
      WHERE created_at::date BETWEEN v_start AND v_end
      GROUP BY user_id
    ) t ON t.user_id = p.id
    LEFT JOIN (
      SELECT user_id, count(*) AS completed_count
      FROM public.tasks
      WHERE (status ILIKE '%conclu%' OR status ILIKE '%done%' OR status ILIKE '%feito%')
        AND updated_at::date BETWEEN v_start AND v_end
      GROUP BY user_id
    ) tc ON tc.user_id = p.id
    LEFT JOIN (
      SELECT user_id, count(*) AS focus_count
      FROM public.focus_sessions
      WHERE created_at::date BETWEEN v_start AND v_end
      GROUP BY user_id
    ) f ON f.user_id = p.id
    WHERE (COALESCE(t.task_count, 0) + COALESCE(tc.completed_count, 0) + COALESCE(f.focus_count, 0)) > 0
    ORDER BY score DESC
    LIMIT 10
  ) r;

  -- New users chart
  SELECT coalesce(jsonb_agg(row_to_json(d)::jsonb ORDER BY d.date), '[]'::jsonb)
  INTO v_new_users_chart
  FROM (
    SELECT
      ds.date::text AS date,
      count(p.id) AS count
    FROM generate_series(v_start::timestamp, v_end::timestamp, '1 day') AS ds(date)
    LEFT JOIN public.profiles p ON p.created_at::date = ds.date
    GROUP BY ds.date
    ORDER BY ds.date
  ) d;

  -- Tasks created per day chart
  SELECT coalesce(jsonb_agg(row_to_json(d)::jsonb ORDER BY d.date), '[]'::jsonb)
  INTO v_tasks_created_chart
  FROM (
    SELECT
      ds.date::text AS date,
      count(t.id) AS count
    FROM generate_series(v_start::timestamp, v_end::timestamp, '1 day') AS ds(date)
    LEFT JOIN public.tasks t ON t.created_at::date = ds.date
    GROUP BY ds.date
    ORDER BY ds.date
  ) d;

  result := jsonb_build_object(
    'total_users', v_total_users,
    'total_completed_tasks', v_total_completed_tasks,
    'active_users_today', v_active_users_today,
    'new_users_chart', v_new_users_chart,
    'total_tasks_created', v_total_tasks_created,
    'completion_rate', v_completion_rate,
    'inactive_users', v_inactive_users,
    'active_users_list', v_active_users_list,
    'usage_ranking', v_usage_ranking,
    'tasks_created_chart', v_tasks_created_chart
  );

  RETURN result;
END;
$function$;

-- Recreate the no-param version that delegates to the parameterized one
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.get_admin_stats(NULL::timestamp with time zone, NULL::timestamp with time zone);
END;
$function$;
