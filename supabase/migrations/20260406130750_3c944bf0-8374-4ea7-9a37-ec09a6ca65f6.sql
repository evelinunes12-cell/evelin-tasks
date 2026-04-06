-- Restrict signup invite creation to admins only
DROP POLICY IF EXISTS "Environment owners can create group invites" ON public.invites;

CREATE POLICY "Users can create invites with proper authorization"
ON public.invites
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    -- Group invites: must own the environment
    (type = 'group' AND EXISTS (
      SELECT 1 FROM public.shared_environments se
      WHERE se.id = invites.environment_id AND se.owner_id = auth.uid()
    ))
    OR
    -- Signup invites: admin only
    (type = 'signup' AND public.has_role(auth.uid(), 'admin'))
  )
);