-- RPC: get profiles of users related to an environment (owner + members), accessible to any environment member
CREATE OR REPLACE FUNCTION public.get_environment_user_profiles(_environment_id uuid)
RETURNS TABLE(id uuid, email text, full_name text, username text, avatar_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_uid uuid;
  is_owner boolean;
BEGIN
  current_uid := auth.uid();
  IF current_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT (se.owner_id = current_uid) INTO is_owner
  FROM public.shared_environments se WHERE se.id = _environment_id;

  IF is_owner IS NULL THEN
    RETURN;
  END IF;

  IF NOT is_owner AND NOT public.is_environment_member(_environment_id, current_uid) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.username, p.avatar_url
  FROM public.profiles p
  WHERE p.id IN (
    SELECT se.owner_id FROM public.shared_environments se WHERE se.id = _environment_id
    UNION
    SELECT em.user_id FROM public.environment_members em
      WHERE em.environment_id = _environment_id AND em.user_id IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_environment_user_profiles(uuid) TO authenticated;