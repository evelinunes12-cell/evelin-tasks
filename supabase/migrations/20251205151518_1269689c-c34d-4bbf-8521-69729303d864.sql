-- Fix RLS policies to explicitly block unauthenticated access

-- First, let's ensure proper RLS behavior by updating policies

-- For PROFILES table: The existing policies use auth.uid() IS NOT NULL check
-- But we need to ensure there's no default public access
-- Let's verify RLS is enabled and policies are restrictive

-- For TASKS table: Add explicit authentication check to all policies
-- Drop and recreate SELECT policy to require authentication
DROP POLICY IF EXISTS "Users can view own tasks or shared environment tasks" ON public.tasks;

CREATE POLICY "Users can view own tasks or shared environment tasks"
ON public.tasks
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    (auth.uid() = user_id) OR 
    (environment_id IS NOT NULL AND has_environment_permission(environment_id, auth.uid(), 'view'::environment_permission))
  )
);

-- Update INSERT policy to require authentication explicitly
DROP POLICY IF EXISTS "Users can create own tasks or environment tasks with permission" ON public.tasks;

CREATE POLICY "Users can create own tasks or environment tasks with permission"
ON public.tasks
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    ((auth.uid() = user_id) AND (environment_id IS NULL)) OR 
    ((environment_id IS NOT NULL) AND has_environment_permission(environment_id, auth.uid(), 'create'::environment_permission))
  )
);

-- Update UPDATE policy to require authentication explicitly  
DROP POLICY IF EXISTS "Users can update own tasks or environment tasks with permission" ON public.tasks;

CREATE POLICY "Users can update own tasks or environment tasks with permission"
ON public.tasks
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    ((auth.uid() = user_id) AND (environment_id IS NULL)) OR 
    ((environment_id IS NOT NULL) AND has_environment_permission(environment_id, auth.uid(), 'edit'::environment_permission))
  )
);

-- Update DELETE policy to require authentication explicitly
DROP POLICY IF EXISTS "Users can delete own tasks or environment tasks with permission" ON public.tasks;

CREATE POLICY "Users can delete own tasks or environment tasks with permission"
ON public.tasks
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    ((auth.uid() = user_id) AND (environment_id IS NULL)) OR 
    ((environment_id IS NOT NULL) AND has_environment_permission(environment_id, auth.uid(), 'delete'::environment_permission))
  )
);