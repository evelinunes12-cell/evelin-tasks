-- 1) Restrict realtime.messages so users can only subscribe to topics tied to study groups they belong to
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read realtime study group topics they belong to" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime study group topics they belong to"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow only topics matching study-group:<group_id> for groups the user belongs to,
  -- or topics that don't reference a study group at all (e.g., presence channels not tied to groups).
  CASE
    WHEN realtime.topic() LIKE 'study-group:%' THEN
      public.is_study_group_member(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid()
      )
    WHEN realtime.topic() LIKE 'study_group_messages:%' THEN
      public.is_study_group_member(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid()
      )
    WHEN realtime.topic() LIKE 'study_group_members:%' THEN
      public.is_study_group_member(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid()
      )
    ELSE true
  END
);

DROP POLICY IF EXISTS "Authenticated can broadcast/presence on allowed topics" ON realtime.messages;
CREATE POLICY "Authenticated can broadcast/presence on allowed topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'study-group:%' THEN
      public.is_study_group_member(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid()
      )
    WHEN realtime.topic() LIKE 'study_group_messages:%' THEN
      public.is_study_group_member(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid()
      )
    WHEN realtime.topic() LIKE 'study_group_members:%' THEN
      public.is_study_group_member(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid()
      )
    ELSE true
  END
);

-- 2) Stop exposing raw emails through environment_members SELECT to non-owners.
-- The get_environment_members RPC already masks emails properly. We tighten the table policy
-- so direct SELECT only returns rows for the owner or the user's own membership row.
DROP POLICY IF EXISTS "Users can view own membership rows" ON public.environment_members;
CREATE POLICY "Users can view own membership rows"
ON public.environment_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_members.environment_id
      AND se.owner_id = auth.uid()
  )
);
