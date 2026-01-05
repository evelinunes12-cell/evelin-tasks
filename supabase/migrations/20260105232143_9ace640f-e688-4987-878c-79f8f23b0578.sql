CREATE OR REPLACE FUNCTION public.has_environment_permission(
  _environment_id uuid,
  _user_id uuid,
  _permission public.environment_permission
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shared_environments se
    WHERE se.id = _environment_id
      AND se.owner_id = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.environment_members em
    WHERE em.environment_id = _environment_id
      AND _permission = ANY(em.permissions)
      AND (
        em.user_id = _user_id
        OR em.email = (SELECT p.email FROM public.profiles p WHERE p.id = _user_id)
      )
  );
$$;