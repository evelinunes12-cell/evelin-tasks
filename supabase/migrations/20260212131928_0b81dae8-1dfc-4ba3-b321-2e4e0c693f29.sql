
-- Fix the email masking function
CREATE OR REPLACE FUNCTION public.get_environment_members(p_environment_id uuid)
RETURNS TABLE (
  id uuid,
  environment_id uuid,
  user_id uuid,
  email text,
  permissions text[],
  created_at timestamptz
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
  current_uid uuid;
  current_email text;
BEGIN
  current_uid := auth.uid();
  
  IF current_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT (se.owner_id = current_uid) INTO is_owner
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
    END,
    em.permissions::text[],
    em.created_at
  FROM public.environment_members em
  WHERE em.environment_id = p_environment_id;
END;
$$;
