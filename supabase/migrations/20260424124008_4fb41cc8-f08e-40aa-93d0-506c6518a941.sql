
-- 1. Add missing UPDATE policy for task-attachments bucket
CREATE POLICY "Users can update attachments of accessible tasks"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND public.can_access_task_attachment(name, auth.uid())
)
WITH CHECK (
  bucket_id = 'task-attachments'
  AND public.can_access_task_attachment(name, auth.uid())
);

-- 2. Restrict listing on public buckets (avatars, banners)
-- Drop overly broad SELECT policies and replace with scoped ones.
-- Public file URLs continue to work because they bypass storage.objects RLS.

-- Avatars: drop existing public SELECT policies (try common names)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'Avatar images are publicly accessible',
        'Public avatars are viewable',
        'Anyone can view avatars',
        'Avatars are publicly viewable'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Banners: drop existing public SELECT policies
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'Anyone can view banners',
        'Public banners are viewable',
        'Banners are publicly viewable'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Recreate scoped SELECT policies (no broad listing)
-- Avatars: only owner can list their own files via SDK; public URLs still resolve directly.
CREATE POLICY "Users can list their own avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Banners: only admins can list via SDK; public URLs still resolve.
CREATE POLICY "Admins can list banners"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'banners'
  AND public.has_role(auth.uid(), 'admin')
);
