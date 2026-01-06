-- 1. Create a SECURITY DEFINER function to validate task attachment access
-- This checks both file ownership AND environment permissions
CREATE OR REPLACE FUNCTION public.can_access_task_attachment(file_path TEXT, requesting_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  path_parts TEXT[];
  file_user_id UUID;
  file_task_id UUID;
  task_env_id UUID;
BEGIN
  -- Parse path: userId/taskId/filename
  path_parts := string_to_array(file_path, '/');
  
  -- Need at least userId and taskId in path
  IF array_length(path_parts, 1) < 2 THEN
    RETURN FALSE;
  END IF;
  
  -- Safely cast to UUID, return false if invalid
  BEGIN
    file_user_id := path_parts[1]::UUID;
    file_task_id := path_parts[2]::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
  
  -- If user owns the file, allow access
  IF file_user_id = requesting_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if task belongs to an environment and user has view permission
  SELECT environment_id INTO task_env_id 
  FROM public.tasks 
  WHERE id = file_task_id;
  
  -- If task has environment_id and user has view permission, allow access
  IF task_env_id IS NOT NULL THEN
    RETURN public.has_environment_permission(task_env_id, requesting_user_id, 'view');
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 2. Drop existing storage policies for task-attachments
DROP POLICY IF EXISTS "Users can view own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view accessible attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload accessible attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete accessible attachments" ON storage.objects;

-- 3. Create new storage policies that use the security function
-- SELECT policy: view attachments you own OR from tasks in shared environments you're a member of
CREATE POLICY "Users can view accessible attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments' 
  AND public.can_access_task_attachment(name, auth.uid())
);

-- INSERT policy: only upload to your own folder (userId/taskId/file)
CREATE POLICY "Users can upload own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE policy: delete your own attachments OR from tasks in environments where you have delete permission
CREATE POLICY "Users can delete accessible attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = (storage.foldername(name))[2]
      AND t.environment_id IS NOT NULL
      AND public.has_environment_permission(t.environment_id, auth.uid(), 'delete')
    )
  )
);