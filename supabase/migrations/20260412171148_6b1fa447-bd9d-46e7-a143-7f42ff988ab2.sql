
DROP POLICY "Members can leave group" ON public.environment_members;

CREATE POLICY "Members can leave group"
  ON public.environment_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
    )
  );
