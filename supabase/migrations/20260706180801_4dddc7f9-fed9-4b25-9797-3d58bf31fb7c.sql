-- Fix: prevent any authenticated user from self-joining arbitrary study groups.
-- Group creators are added via the SECURITY DEFINER trigger handle_new_study_group
-- (bypasses RLS), and members are added by admins via is_study_group_admin.
-- The previous "auth.uid() = user_id" self-insert branch allowed joining any group.

DROP POLICY IF EXISTS "Self join or admin add" ON public.study_group_members;

CREATE POLICY "Only group admins can add members"
ON public.study_group_members
FOR INSERT
TO authenticated
WITH CHECK (is_study_group_admin(group_id, auth.uid()));