ALTER POLICY "Users can view environments they own or are members of" ON shared_environments
USING (auth.uid() = owner_id)