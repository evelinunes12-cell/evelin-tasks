CREATE OR REPLACE FUNCTION public.get_study_groups_member_previews(
  p_group_ids uuid[],
  p_limit_per_group int DEFAULT 4
)
RETURNS TABLE (
  group_id uuid,
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  member_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH allowed AS (
    SELECT g_id
    FROM unnest(p_group_ids) AS g_id
    WHERE public.is_study_group_member(g_id, auth.uid())
  ),
  ranked AS (
    SELECT
      sgm.group_id,
      sgm.user_id,
      p.full_name,
      p.username,
      p.avatar_url,
      ROW_NUMBER() OVER (
        PARTITION BY sgm.group_id
        ORDER BY (sgm.role = 'admin') DESC, sgm.created_at ASC
      ) AS rn,
      COUNT(*) OVER (PARTITION BY sgm.group_id) AS member_count
    FROM public.study_group_members sgm
    JOIN allowed a ON a.g_id = sgm.group_id
    LEFT JOIN public.profiles p ON p.id = sgm.user_id
  )
  SELECT group_id, user_id, full_name, username, avatar_url, member_count
  FROM ranked
  WHERE rn <= GREATEST(1, p_limit_per_group);
$$;

GRANT EXECUTE ON FUNCTION public.get_study_groups_member_previews(uuid[], int) TO authenticated;