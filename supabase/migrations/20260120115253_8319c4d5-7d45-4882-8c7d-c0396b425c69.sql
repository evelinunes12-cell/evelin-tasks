-- Add PERMISSIVE SELECT policy for notifications to prevent future RLS bypass
-- Current RESTRICTIVE policies work but could be bypassed if any PERMISSIVE policy is added later

CREATE POLICY "Users can view own notifications permissive"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);