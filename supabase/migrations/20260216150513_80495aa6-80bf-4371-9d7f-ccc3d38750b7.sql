
-- 1. Create notification_type enum
DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('info', 'warning', 'success');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create send_broadcast_notification RPC
CREATE OR REPLACE FUNCTION public.send_broadcast_notification(
  p_title text,
  p_message text,
  p_type notification_type DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Validate inputs
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title cannot be empty';
  END IF;

  IF length(p_title) > 255 THEN
    RAISE EXCEPTION 'Title exceeds maximum length of 255 characters';
  END IF;

  IF p_message IS NOT NULL AND length(p_message) > 1000 THEN
    RAISE EXCEPTION 'Message exceeds maximum length of 1000 characters';
  END IF;

  -- Insert a notification for every active user except the calling admin
  INSERT INTO public.notifications (user_id, title, message)
  SELECT p.id, p_title, p_message
  FROM public.profiles p
  WHERE p.is_active = true
    AND p.id != auth.uid();
END;
$$;

-- 3. Create send_individual_notification RPC
CREATE OR REPLACE FUNCTION public.send_individual_notification(
  p_user_id uuid,
  p_title text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title cannot be empty';
  END IF;

  INSERT INTO public.notifications (user_id, title, message)
  VALUES (p_user_id, p_title, p_message);
END;
$$;

-- 4. Update get_admin_stats with date filter support
CREATE OR REPLACE FUNCTION public.get_admin_stats(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  v_total_users integer;
  v_total_completed_tasks integer;
  v_active_users_today integer;
  v_new_users_chart jsonb;
  v_start date;
  v_end date;
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

  -- Active users today (always today, not filtered)
  SELECT count(DISTINCT uid) INTO v_active_users_today
  FROM (
    SELECT user_id AS uid FROM public.tasks WHERE updated_at::date = CURRENT_DATE
    UNION
    SELECT user_id AS uid FROM public.focus_sessions WHERE created_at::date = CURRENT_DATE
  ) AS active;

  -- New users chart respecting the date range
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

  result := jsonb_build_object(
    'total_users', v_total_users,
    'total_completed_tasks', v_total_completed_tasks,
    'active_users_today', v_active_users_today,
    'new_users_chart', v_new_users_chart
  );

  RETURN result;
END;
$$;

-- 5. Helper: count active users (for broadcast confirmation)
CREATE OR REPLACE FUNCTION public.get_active_users_count()
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.profiles
  WHERE is_active = true AND id != auth.uid();

  RETURN v_count;
END;
$$;
