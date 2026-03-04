
-- Table for XP logs
CREATE TABLE public.user_xp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.user_xp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own xp logs"
  ON public.user_xp_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own xp logs"
  ON public.user_xp_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for leaderboard queries
CREATE INDEX idx_user_xp_logs_created_at ON public.user_xp_logs (created_at);
CREATE INDEX idx_user_xp_logs_user_id ON public.user_xp_logs (user_id);

-- RPC function for leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(period_type text)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, total_xp bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date timestamp with time zone;
BEGIN
  IF period_type = 'weekly' THEN
    start_date := date_trunc('week', now());
  ELSIF period_type = 'monthly' THEN
    start_date := date_trunc('month', now());
  ELSE
    start_date := date_trunc('week', now());
  END IF;

  RETURN QUERY
  SELECT
    x.user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(x.points), 0) AS total_xp
  FROM public.user_xp_logs x
  JOIN public.profiles p ON p.id = x.user_id
  WHERE x.created_at >= start_date
  GROUP BY x.user_id, p.full_name, p.avatar_url
  ORDER BY total_xp DESC
  LIMIT 50;
END;
$$;
