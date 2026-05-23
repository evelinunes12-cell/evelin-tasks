DROP POLICY IF EXISTS "Users can upload own attachments" ON storage.objects;

CREATE POLICY "Users can upload own attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id::text = (storage.foldername(name))[2]
      AND (
        (t.user_id = auth.uid() AND t.environment_id IS NULL)
        OR (t.environment_id IS NOT NULL
            AND public.has_environment_permission(t.environment_id, auth.uid(), 'edit'::environment_permission))
      )
  )
);