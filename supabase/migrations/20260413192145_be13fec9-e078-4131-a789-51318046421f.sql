
DROP FUNCTION IF EXISTS public.get_environment_members(uuid);

CREATE OR REPLACE FUNCTION public.get_environment_members(p_environment_id uuid)
RETURNS TABLE(
  id uuid,
  environment_id uuid,
  user_id uuid,
  email text,
  permissions text[],
  created_at timestamptz,
  username text,
  full_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
  current_uid uuid;
  current_email text;
  env_owner_id uuid;
BEGIN
  current_uid := auth.uid();
  
  IF current_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT se.owner_id, (se.owner_id = current_uid) INTO env_owner_id, is_owner
  FROM shared_environments se WHERE se.id = p_environment_id;

  IF is_owner IS NULL THEN
    RETURN;
  END IF;

  -- Check access
  IF NOT is_owner AND NOT public.is_environment_member(p_environment_id, current_uid) THEN
    RETURN;
  END IF;

  SELECT p.email INTO current_email FROM profiles p WHERE p.id = current_uid;

  RETURN QUERY
  SELECT
    em.id,
    em.environment_id,
    em.user_id,
    CASE
      WHEN is_owner THEN em.email
      WHEN em.user_id = current_uid THEN em.email
      WHEN em.email = current_email THEN em.email
      ELSE CONCAT('*', SUBSTRING(em.email FROM POSITION('@' IN em.email)))
    END AS email,
    em.permissions::text[],
    em.created_at,
    p.username,
    p.full_name,
    p.avatar_url
  FROM public.environment_members em
  LEFT JOIN public.profiles p ON p.id = em.user_id
  WHERE em.environment_id = p_environment_id
    AND em.user_id IS DISTINCT FROM env_owner_id;
END;
$$;
