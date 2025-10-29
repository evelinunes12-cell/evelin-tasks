-- Add INSERT policy to profiles table so users can create their own profile on signup
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);