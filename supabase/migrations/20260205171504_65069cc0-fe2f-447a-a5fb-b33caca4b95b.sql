-- Create a function to purge old focus sessions (older than 1 year)
-- This addresses the security recommendation about data retention policies
CREATE OR REPLACE FUNCTION public.purge_old_focus_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete focus sessions older than 1 year
  DELETE FROM public.focus_sessions
  WHERE created_at < now() - interval '1 year';
END;
$$;

-- Add comment explaining the purpose
COMMENT ON FUNCTION public.purge_old_focus_sessions() IS 'Data retention policy: Automatically purges focus session data older than 1 year to minimize behavioral profiling risks from historical data accumulation.';