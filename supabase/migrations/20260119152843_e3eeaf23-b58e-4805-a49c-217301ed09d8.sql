
-- Drop existing policies and recreate with authenticated role only
-- This ensures anonymous users cannot access these tables at all

-- =====================
-- PROFILES TABLE
-- =====================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Recreate with authenticated role restriction
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (auth.uid() = id);

-- =====================
-- ENVIRONMENT_MEMBERS TABLE
-- =====================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view members of environments they have access to" ON public.environment_members;
DROP POLICY IF EXISTS "Environment owners can add members" ON public.environment_members;
DROP POLICY IF EXISTS "Environment owners can update members" ON public.environment_members;
DROP POLICY IF EXISTS "Environment owners can remove members" ON public.environment_members;

-- Recreate with authenticated role restriction
CREATE POLICY "Users can view members of environments they have access to" 
ON public.environment_members 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM shared_environments se
    WHERE se.id = environment_members.environment_id 
    AND (se.owner_id = auth.uid() OR public.is_environment_member(se.id, auth.uid()))
  )
);

CREATE POLICY "Environment owners can add members" 
ON public.environment_members 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shared_environments
    WHERE id = environment_members.environment_id 
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Environment owners can update members" 
ON public.environment_members 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shared_environments
    WHERE id = environment_members.environment_id 
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Environment owners can remove members" 
ON public.environment_members 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shared_environments
    WHERE id = environment_members.environment_id 
    AND owner_id = auth.uid()
  )
);
