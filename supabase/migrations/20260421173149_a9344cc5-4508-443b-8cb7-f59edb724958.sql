CREATE OR REPLACE FUNCTION public.get_study_group_members(p_group_id uuid)
RETURNS TABLE (
  id uuid,
  group_id uuid,
  user_id uuid,
  role public.study_group_role,
  share_status boolean,
  share_metrics boolean,
  created_at timestamptz,
  full_name text,
  username text,
  avatar_url text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sgm.id,
    sgm.group_id,
    sgm.user_id,
    sgm.role,
    sgm.share_status,
    sgm.share_metrics,
    sgm.created_at,
    p.full_name,
    p.username,
    p.avatar_url,
    p.email
  FROM public.study_group_members sgm
  LEFT JOIN public.profiles p ON p.id = sgm.user_id
  WHERE sgm.group_id = p_group_id
    AND public.is_study_group_member(p_group_id, auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.get_study_group_members(uuid) TO authenticated;