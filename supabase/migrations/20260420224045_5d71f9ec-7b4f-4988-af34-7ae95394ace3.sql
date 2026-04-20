-- Recreate INSERT policy on study_groups scoped to authenticated role
DROP POLICY IF EXISTS "Authenticated can create groups" ON public.study_groups;
CREATE POLICY "Authenticated can create groups"
ON public.study_groups
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Also ensure members insert policy is scoped to authenticated
DROP POLICY IF EXISTS "Self join or admin add" ON public.study_group_members;
CREATE POLICY "Self join or admin add"
ON public.study_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.is_study_group_admin(group_id, auth.uid())
);