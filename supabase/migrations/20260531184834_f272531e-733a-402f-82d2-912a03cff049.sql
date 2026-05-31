-- Harden study_group_members against role escalation.
-- Two PERMISSIVE UPDATE policies are combined with OR logic, which can allow
-- a member to bypass the "role unchanged" check. A RESTRICTIVE policy is
-- ANDed with all other policies, so it acts as a hard guard: a role change is
-- only permitted when the acting user is a group admin. Non-admins may still
-- update their own preferences as long as they don't change the role column.

CREATE POLICY "Only admins can change member roles"
ON public.study_group_members
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  role = (
    SELECT sgm.role
    FROM public.study_group_members sgm
    WHERE sgm.id = study_group_members.id
  )
  OR public.is_study_group_admin(group_id, auth.uid())
);