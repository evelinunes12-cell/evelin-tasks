CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start date;
  v_end date;
  v_is_admin boolean;
  v_result jsonb;
BEGIN
  -- Only trust server-side role data so admin revocations take effect immediately.
  v_is_admin := public.has_role(auth.uid(), 'admin');

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  v_start := COALESCE((p_start_date AT TIME ZONE 'UTC')::date, CURRENT_DATE - 30);
  v_end := COALESCE((p_end_date AT TIME ZONE 'UTC')::date, CURRENT_DATE);

  IF v_start > v_end THEN
    RAISE EXCEPTION 'Invalid date range: start_date (%) is after end_date (%)', v_start, v_end;
  END IF;

  WITH activity_events AS (
    SELECT t.user_id, COALESCE(t.updated_at, t.created_at) AS activity_at
    FROM public.tasks t
    WHERE COALESCE(t.updated_at, t.created_at) IS NOT NULL

    UNION ALL

    SELECT fs.user_id, COALESCE(fs.started_at, fs.created_at) AS activity_at
    FROM public.focus_sessions fs
    WHERE COALESCE(fs.started_at, fs.created_at) IS NOT NULL
  ),
  user_last_activity AS (
    SELECT
      p.id AS user_id,
      p.email,
      p.full_name,
      p.created_at,
      COALESCE(
        MAX(a.activity_at),
        p.last_activity_date::timestamp with time zone,
        p.created_at
      ) AS last_seen
    FROM public.profiles p
    LEFT JOIN activity_events a ON a.user_id = p.id
    GROUP BY p.id, p.email, p.full_name, p.created_at, p.last_activity_date
  ),
  period_users AS (
    SELECT p.id, p.created_at
    FROM public.profiles p
    WHERE p.created_at::date BETWEEN v_start AND v_end
  ),
  period_tasks AS (
    SELECT *
    FROM public.tasks t
    WHERE t.created_at::date BETWEEN v_start AND v_end
  ),
  period_completed_tasks AS (
    SELECT *
    FROM public.tasks t
    WHERE (t.status ILIKE '%conclu%' OR t.status ILIKE '%done%' OR t.status ILIKE '%feito%')
      AND COALESCE(t.updated_at, t.created_at)::date BETWEEN v_start AND v_end
  ),
  period_focus_sessions AS (
    SELECT *
    FROM public.focus_sessions fs
    WHERE COALESCE(fs.started_at, fs.created_at)::date BETWEEN v_start AND v_end
  ),
  period_activity AS (
    SELECT user_id, COALESCE(updated_at, created_at) AS activity_at
    FROM public.tasks
    WHERE COALESCE(updated_at, created_at)::date BETWEEN v_start AND v_end

    UNION ALL

    SELECT user_id, COALESCE(started_at, created_at) AS activity_at
    FROM public.focus_sessions
    WHERE COALESCE(started_at, created_at)::date BETWEEN v_start AND v_end
  ),
  ranking AS (
    SELECT
      p.full_name,
      p.email,
      COALESCE(t.task_count, 0) AS tasks_created,
      COALESCE(tc.completed_count, 0) AS tasks_completed,
      COALESCE(f.focus_count, 0) AS focus_sessions,
      (COALESCE(t.task_count, 0) + COALESCE(tc.completed_count, 0) * 2 + COALESCE(f.focus_count, 0))::integer AS score
    FROM public.profiles p
    LEFT JOIN (
      SELECT user_id, count(*) AS task_count
      FROM period_tasks
      GROUP BY user_id
    ) t ON t.user_id = p.id
    LEFT JOIN (
      SELECT user_id, count(*) AS completed_count
      FROM period_completed_tasks
      GROUP BY user_id
    ) tc ON tc.user_id = p.id
    LEFT JOIN (
      SELECT user_id, count(*) AS focus_count
      FROM period_focus_sessions
      GROUP BY user_id
    ) f ON f.user_id = p.id
    WHERE (COALESCE(t.task_count, 0) + COALESCE(tc.completed_count, 0) + COALESCE(f.focus_count, 0)) > 0
    ORDER BY score DESC
    LIMIT 10
  ),
  cohort AS (
    SELECT
      date_trunc('week', pu.created_at)::date AS cohort_week,
      count(*)::integer AS cohort_size,
      ROUND(100 * avg(CASE WHEN ula.last_seen::date >= pu.created_at::date + 1 THEN 1 ELSE 0 END)::numeric, 1) AS retention_d1,
      ROUND(100 * avg(CASE WHEN ula.last_seen::date >= pu.created_at::date + 7 THEN 1 ELSE 0 END)::numeric, 1) AS retention_d7,
      ROUND(100 * avg(CASE WHEN ula.last_seen::date >= pu.created_at::date + 30 THEN 1 ELSE 0 END)::numeric, 1) AS retention_d30
    FROM period_users pu
    LEFT JOIN user_last_activity ula ON ula.user_id = pu.id
    GROUP BY 1
    ORDER BY 1
  ),
  churn AS (
    SELECT
      ws.week_date::date AS week_date,
      (
        SELECT count(*)
        FROM user_last_activity ula
        WHERE ula.created_at::date <= ws.week_date
          AND (ula.last_seen IS NULL OR ula.last_seen::date < ws.week_date - 7)
      )::integer AS inactive_7d,
      (
        SELECT count(*)
        FROM user_last_activity ula
        WHERE ula.created_at::date <= ws.week_date
          AND (ula.last_seen IS NULL OR ula.last_seen::date < ws.week_date - 14)
      )::integer AS inactive_14d,
      (
        SELECT count(*)
        FROM user_last_activity ula
        WHERE ula.created_at::date <= ws.week_date
          AND (ula.last_seen IS NULL OR ula.last_seen::date < ws.week_date - 30)
      )::integer AS inactive_30d
    FROM generate_series(date_trunc('week', v_start::timestamp)::date, v_end, '1 week') AS ws(week_date)
    ORDER BY ws.week_date
  )
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*)::integer FROM public.profiles),
    'total_tasks_created', (SELECT count(*)::integer FROM period_tasks),
    'total_completed_tasks', (SELECT count(*)::integer FROM period_completed_tasks),
    'completion_rate', (
      CASE
        WHEN (SELECT count(*) FROM period_tasks) = 0 THEN 0
        ELSE ROUND(((SELECT count(*)::numeric FROM period_completed_tasks) / (SELECT count(*)::numeric FROM period_tasks)) * 100, 1)
      END
    ),
    'active_users_today', (
      SELECT count(DISTINCT user_id)::integer
      FROM activity_events
      WHERE activity_at::date = CURRENT_DATE
    ),
    'inactive_users', (
      SELECT count(*)::integer
      FROM user_last_activity
      WHERE created_at::date <= CURRENT_DATE
        AND (last_seen IS NULL OR last_seen::date < CURRENT_DATE - 7)
    ),
    'new_users_chart', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object('date', ds.day::text, 'count', COALESCE(nu.total, 0))
          ORDER BY ds.day
        ),
        '[]'::jsonb
      )
      FROM generate_series(v_start, v_end, '1 day') AS ds(day)
      LEFT JOIN (
        SELECT created_at::date AS day, count(*)::integer AS total
        FROM public.profiles
        WHERE created_at::date BETWEEN v_start AND v_end
        GROUP BY created_at::date
      ) nu ON nu.day = ds.day
    ),
    'tasks_created_chart', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object('date', ds.day::text, 'count', COALESCE(tc.total, 0))
          ORDER BY ds.day
        ),
        '[]'::jsonb
      )
      FROM generate_series(v_start, v_end, '1 day') AS ds(day)
      LEFT JOIN (
        SELECT created_at::date AS day, count(*)::integer AS total
        FROM public.tasks
        WHERE created_at::date BETWEEN v_start AND v_end
        GROUP BY created_at::date
      ) tc ON tc.day = ds.day
    ),
    'cohort_retention', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'cohort_week', c.cohort_week::text,
            'cohort_size', c.cohort_size,
            'retention_d1', COALESCE(c.retention_d1, 0),
            'retention_d7', COALESCE(c.retention_d7, 0),
            'retention_d30', COALESCE(c.retention_d30, 0)
          )
          ORDER BY c.cohort_week
        ),
        '[]'::jsonb
      )
      FROM cohort c
    ),
    'usage_heatmap', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'day_of_week', h.day_of_week,
            'hour', h.hour,
            'activity_count', h.activity_count
          )
          ORDER BY h.day_of_week, h.hour
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          extract(dow FROM pa.activity_at)::integer AS day_of_week,
          extract(hour FROM pa.activity_at)::integer AS hour,
          count(*)::integer AS activity_count
        FROM period_activity pa
        GROUP BY 1, 2
      ) h
    ),
    'churn_rate', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'week_date', c.week_date::text,
            'inactive_7d', c.inactive_7d,
            'inactive_14d', c.inactive_14d,
            'inactive_30d', c.inactive_30d
          )
          ORDER BY c.week_date
        ),
        '[]'::jsonb
      )
      FROM churn c
    ),
    'active_users_list', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'email', ula.email,
            'full_name', ula.full_name,
            'last_seen', ula.last_seen::date::text
          )
          ORDER BY ula.last_seen DESC
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT email, full_name, last_seen
        FROM user_last_activity
        WHERE last_seen::date >= CURRENT_DATE - 7
        ORDER BY last_seen DESC
        LIMIT 50
      ) ula
    ),
    'usage_ranking', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'full_name', r.full_name,
            'email', r.email,
            'tasks_created', r.tasks_created,
            'tasks_completed', r.tasks_completed,
            'focus_sessions', r.focus_sessions,
            'score', r.score
          )
          ORDER BY r.score DESC
        ),
        '[]'::jsonb
      )
      FROM ranking r
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_stats(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.get_admin_dashboard_metrics(p_start_date, p_end_date);
$function$;
