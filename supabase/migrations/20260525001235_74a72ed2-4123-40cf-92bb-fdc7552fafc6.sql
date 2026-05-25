-- Fix 1: Prevent study_group_members from self-promoting to admin
DROP POLICY IF EXISTS "Members can update own preferences" ON public.study_group_members;
DROP POLICY IF EXISTS "Members can update their own row" ON public.study_group_members;
DROP POLICY IF EXISTS "Users can update their own member row" ON public.study_group_members;

CREATE POLICY "Members can update their own preferences only"
ON public.study_group_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT role FROM public.study_group_members sgm WHERE sgm.id = study_group_members.id)
);

-- Allow group admins to change roles
CREATE POLICY "Group admins can update member roles"
ON public.study_group_members
FOR UPDATE
USING (public.is_study_group_admin(group_id, auth.uid()))
WITH CHECK (public.is_study_group_admin(group_id, auth.uid()));

-- Fix 2: Remove app_version from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.app_version;

-- Fix 3: Restrict get_leaderboard to authenticated users
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
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text) TO authenticated;