ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_supporter boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.get_leaderboard(text);

CREATE OR REPLACE FUNCTION public.get_leaderboard(period_type text)
 RETURNS TABLE(user_id uuid, full_name text, username text, avatar_url text, total_xp bigint, is_supporter boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  start_date timestamp with time zone;
  end_date timestamp with time zone;
  tz constant text := 'America/Sao_Paulo';
  local_now timestamp := now() AT TIME ZONE tz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF period_type = 'weekly' THEN
    start_date := date_trunc('week', local_now) AT TIME ZONE tz;
    end_date := now() + interval '1 second';
  ELSIF period_type = 'monthly' THEN
    start_date := date_trunc('month', local_now) AT TIME ZONE tz;
    end_date := now() + interval '1 second';
  ELSIF period_type = 'last_weekly' THEN
    start_date := (date_trunc('week', local_now) - interval '1 week') AT TIME ZONE tz;
    end_date := date_trunc('week', local_now) AT TIME ZONE tz;
  ELSIF period_type = 'last_monthly' THEN
    start_date := (date_trunc('month', local_now) - interval '1 month') AT TIME ZONE tz;
    end_date := date_trunc('month', local_now) AT TIME ZONE tz;
  ELSE
    start_date := date_trunc('week', local_now) AT TIME ZONE tz;
    end_date := now() + interval '1 second';
  END IF;

  RETURN QUERY
  SELECT
    x.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    COALESCE(SUM(x.points), 0) AS total_xp,
    COALESCE(p.is_supporter, false) AS is_supporter
  FROM public.user_xp_logs x
  JOIN public.profiles p ON p.id = x.user_id
  WHERE x.created_at >= start_date AND x.created_at < end_date
  GROUP BY x.user_id, p.full_name, p.username, p.avatar_url, p.is_supporter
  ORDER BY total_xp DESC
  LIMIT 50;
END;
$function$;