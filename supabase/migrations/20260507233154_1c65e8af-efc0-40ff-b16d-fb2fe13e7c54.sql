DROP POLICY IF EXISTS "Authenticated can read realtime allowed topics" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can broadcast/presence on allowed topics" ON realtime.messages;

CREATE POLICY "Authenticated can read realtime allowed topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'study-group:%'
      OR realtime.topic() LIKE 'study_group_messages:%'
      OR realtime.topic() LIKE 'study_group_members:%' THEN
      public.is_study_group_member(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid()
      )
    WHEN realtime.topic() LIKE 'environment-messages:%'
      OR realtime.topic() LIKE 'environment-typing:%' THEN
      public.has_environment_permission(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid(),
        'view'::environment_permission
      )
    WHEN realtime.topic() LIKE 'env-thread:%' THEN
      EXISTS (
        SELECT 1 FROM public.environment_threads et
        WHERE et.id = NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
          AND public.has_environment_permission(et.environment_id, auth.uid(), 'view'::environment_permission)
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
    WHEN realtime.topic() LIKE 'study-group:%'
      OR realtime.topic() LIKE 'study_group_messages:%'
      OR realtime.topic() LIKE 'study_group_members:%' THEN
      public.is_study_group_member(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid()
      )
    WHEN realtime.topic() LIKE 'environment-messages:%'
      OR realtime.topic() LIKE 'environment-typing:%' THEN
      public.has_environment_permission(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid,
        auth.uid(),
        'view'::environment_permission
      )
    WHEN realtime.topic() LIKE 'env-thread:%' THEN
      EXISTS (
        SELECT 1 FROM public.environment_threads et
        WHERE et.id = NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
          AND public.has_environment_permission(et.environment_id, auth.uid(), 'view'::environment_permission)
      )
    ELSE false
  END
);