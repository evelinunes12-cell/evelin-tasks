CREATE OR REPLACE FUNCTION public.get_task_assignees_bulk(_task_ids uuid[])
RETURNS TABLE(
  id uuid,
  task_id uuid,
  user_id uuid,
  email text,
  full_name text,
  username text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ta.id, ta.task_id, ta.user_id, p.email, p.full_name, p.username, p.avatar_url, ta.created_at
  FROM public.task_assignees ta
  LEFT JOIN public.profiles p ON p.id = ta.user_id
  WHERE ta.task_id = ANY(_task_ids)
    AND public.can_access_environment_task(ta.task_id, auth.uid());
$$;