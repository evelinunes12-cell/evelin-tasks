
-- Drop the existing INSERT policy on task-attachments storage
DROP POLICY IF EXISTS "Users can upload own attachments" ON storage.objects;

-- Create a stricter INSERT policy that verifies task access
CREATE POLICY "Users can upload own attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.can_access_task_attachment(name, auth.uid())
);
