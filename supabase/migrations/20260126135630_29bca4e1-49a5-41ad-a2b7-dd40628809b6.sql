-- Remove the duplicate SELECT policy on notifications table
-- Keep "Users can view their own notifications" and drop "Users can view own notifications permissive"
DROP POLICY IF EXISTS "Users can view own notifications permissive" ON public.notifications;