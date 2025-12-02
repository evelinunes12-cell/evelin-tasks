ALTER POLICY "Users can view own tasks or shared environment tasks" ON tasks
USING (
  auth.uid() = user_id 
  OR (
    environment_id IS NOT NULL 
    AND has_environment_permission(environment_id, auth.uid(), 'view'::environment_permission)
  )
)