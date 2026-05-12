CREATE OR REPLACE FUNCTION public.get_leaderboard(period_type text)
RETURNS TABLE(user_id uuid, full_name text, username text, avatar_url text, total_xp bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  start_date timestamp with time zone;
  end_date timestamp with time zone;
BEGIN
  IF period_type = 'weekly' THEN
    start_date := date_trunc('week', now());
    end_date := now() + interval '1 second';
  ELSIF period_type = 'monthly' THEN
    start_date := date_trunc('month', now());
    end_date := now() + interval '1 second';
  ELSIF period_type = 'last_weekly' THEN
    start_date := date_trunc('week', now()) - interval '1 week';
    end_date := date_trunc('week', now());
  ELSIF period_type = 'last_monthly' THEN
    start_date := date_trunc('month', now()) - interval '1 month';
    end_date := date_trunc('month', now());
  ELSE
    start_date := date_trunc('week', now());
    end_date := now() + interval '1 second';
  END IF;

  RETURN QUERY
  SELECT
    x.user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    COALESCE(SUM(x.points), 0) AS total_xp
  FROM public.user_xp_logs x
  JOIN public.profiles p ON p.id = x.user_id
  WHERE x.created_at >= start_date AND x.created_at < end_date
  GROUP BY x.user_id, p.full_name, p.username, p.avatar_url
  ORDER BY total_xp DESC
  LIMIT 50;
END;
$function$;