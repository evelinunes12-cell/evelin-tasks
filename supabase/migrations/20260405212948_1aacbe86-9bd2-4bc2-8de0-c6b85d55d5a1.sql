
-- Tighten environment_members SELECT policy to prevent email exposure
-- Non-owners should only see their own membership row via direct table access
-- The get_environment_members RPC (with email masking) handles member listing

DROP POLICY IF EXISTS "Users can view members of environments they have access to" ON public.environment_members;

-- Users can only see their own membership row directly
CREATE POLICY "Users can view own membership rows"
ON public.environment_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_members.environment_id
    AND se.owner_id = auth.uid()
  )
);
