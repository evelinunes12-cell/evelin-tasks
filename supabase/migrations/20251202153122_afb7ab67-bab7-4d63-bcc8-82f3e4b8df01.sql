ALTER POLICY "Users can view members of environments they have access to" ON environment_members
USING (
  environment_members.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM shared_environments se
    WHERE se.id = environment_members.environment_id 
    AND se.owner_id = auth.uid()
  )
)