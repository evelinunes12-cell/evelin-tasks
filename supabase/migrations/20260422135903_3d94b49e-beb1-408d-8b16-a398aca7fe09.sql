-- Replace the realtime.messages policies to deny unknown topics by default
DROP POLICY IF EXISTS "Authenticated can read realtime study group topics they belong to" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can broadcast/presence on allowed topics" ON realtime.messages;

CREATE POLICY "Authenticated can read realtime study group topics they belong to"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
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
    ELSE false
  END
);

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
    ELSE false
  END
);