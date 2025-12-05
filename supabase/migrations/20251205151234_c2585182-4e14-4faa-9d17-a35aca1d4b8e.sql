-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create more restrictive RLS policies that require authentication
-- Policy for viewing profiles - only authenticated users can view their own profile
CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Policy for updating profiles - only authenticated users can update their own profile
CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Policy for inserting profiles - handled by trigger, but allow authenticated users
CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);