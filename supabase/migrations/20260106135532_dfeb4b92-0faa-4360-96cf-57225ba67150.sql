-- Fix 1: Block direct client inserts to notifications table
-- All notifications are system-generated via SECURITY DEFINER triggers
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Only system can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (false);

-- Fix 2: Drop the unused get_user_id_by_email function that allows user enumeration
DROP FUNCTION IF EXISTS public.get_user_id_by_email(TEXT);

-- Fix 3: Add URL protocol constraints to prevent XSS via javascript: or data: URLs
-- First, sanitize existing data that might have dangerous protocols
UPDATE public.tasks SET google_docs_link = NULL
WHERE google_docs_link IS NOT NULL 
  AND google_docs_link != ''
  AND google_docs_link !~* '^https?://';

UPDATE public.tasks SET canva_link = NULL
WHERE canva_link IS NOT NULL 
  AND canva_link != ''
  AND canva_link !~* '^https?://';

UPDATE public.task_steps SET google_docs_link = NULL
WHERE google_docs_link IS NOT NULL 
  AND google_docs_link != ''
  AND google_docs_link !~* '^https?://';

UPDATE public.task_steps SET canva_link = NULL
WHERE canva_link IS NOT NULL 
  AND canva_link != ''
  AND canva_link !~* '^https?://';

-- Add CHECK constraints for URL protocols on tasks table
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_google_docs_link_protocol_check
CHECK (
  google_docs_link IS NULL 
  OR google_docs_link = '' 
  OR google_docs_link ~* '^https?://'
);

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_canva_link_protocol_check
CHECK (
  canva_link IS NULL 
  OR canva_link = '' 
  OR canva_link ~* '^https?://'
);

-- Add CHECK constraints for URL protocols on task_steps table
ALTER TABLE public.task_steps
ADD CONSTRAINT task_steps_google_docs_link_protocol_check
CHECK (
  google_docs_link IS NULL 
  OR google_docs_link = '' 
  OR google_docs_link ~* '^https?://'
);

ALTER TABLE public.task_steps
ADD CONSTRAINT task_steps_canva_link_protocol_check
CHECK (
  canva_link IS NULL 
  OR canva_link = '' 
  OR canva_link ~* '^https?://'
);

-- Fix 4: Restrict email exposure - update policy to only allow viewing own profile
-- First drop the existing policy that exposes emails to group members
DROP POLICY IF EXISTS "Users can view profiles of group members" ON public.profiles;

-- Create a more restrictive policy - only allow viewing public info (not email) for group members
-- The original policy will be replaced with application-level filtering
-- Users can still see their own full profile via "Users can view own profile" policy