CREATE POLICY "Users can update their own focus sessions"
ON public.focus_sessions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);