-- Create enum for environment permissions
CREATE TYPE public.environment_permission AS ENUM ('view', 'create', 'edit', 'delete');

-- Create shared_environments table
CREATE TABLE public.shared_environments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create environment_members table
CREATE TABLE public.environment_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID NOT NULL REFERENCES public.shared_environments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  permissions environment_permission[] NOT NULL DEFAULT ARRAY['view']::environment_permission[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(environment_id, email)
);

-- Enable RLS on both tables
ALTER TABLE public.shared_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environment_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_environments
CREATE POLICY "Users can view environments they own or are members of"
  ON public.shared_environments
  FOR SELECT
  USING (
    auth.uid() = owner_id 
    OR EXISTS (
      SELECT 1 FROM public.environment_members 
      WHERE environment_id = shared_environments.id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own environments"
  ON public.shared_environments
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their environments"
  ON public.shared_environments
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their environments"
  ON public.shared_environments
  FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for environment_members
CREATE POLICY "Users can view members of environments they have access to"
  ON public.environment_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_environments 
      WHERE id = environment_members.environment_id 
      AND (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.environment_members em2
        WHERE em2.environment_id = environment_members.environment_id
        AND em2.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Environment owners can add members"
  ON public.environment_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_environments 
      WHERE id = environment_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Environment owners can update members"
  ON public.environment_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_environments 
      WHERE id = environment_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Environment owners can remove members"
  ON public.environment_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_environments 
      WHERE id = environment_id AND owner_id = auth.uid()
    )
  );

-- Add environment_id to tasks table
ALTER TABLE public.tasks ADD COLUMN environment_id UUID REFERENCES public.shared_environments(id) ON DELETE SET NULL;

-- Update RLS policy for tasks to include shared environments
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks or shared environment tasks"
  ON public.tasks
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (
      environment_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.environment_members 
        WHERE environment_id = tasks.environment_id 
        AND user_id = auth.uid()
      )
    )
  );

-- Helper function to check environment permissions
CREATE OR REPLACE FUNCTION public.has_environment_permission(
  _environment_id UUID,
  _user_id UUID,
  _permission environment_permission
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = _environment_id AND se.owner_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.environment_members em
    WHERE em.environment_id = _environment_id 
    AND em.user_id = _user_id
    AND _permission = ANY(em.permissions)
  );
$$;

-- Update task policies to respect environment permissions
DROP POLICY IF EXISTS "Users can create own tasks" ON public.tasks;
CREATE POLICY "Users can create own tasks or environment tasks with permission"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND environment_id IS NULL)
    OR (
      environment_id IS NOT NULL 
      AND public.has_environment_permission(environment_id, auth.uid(), 'create')
    )
  );

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks or environment tasks with permission"
  ON public.tasks
  FOR UPDATE
  USING (
    (auth.uid() = user_id AND environment_id IS NULL)
    OR (
      environment_id IS NOT NULL 
      AND public.has_environment_permission(environment_id, auth.uid(), 'edit')
    )
  );

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks or environment tasks with permission"
  ON public.tasks
  FOR DELETE
  USING (
    (auth.uid() = user_id AND environment_id IS NULL)
    OR (
      environment_id IS NOT NULL 
      AND public.has_environment_permission(environment_id, auth.uid(), 'delete')
    )
  );

-- Add trigger for updated_at on shared_environments
CREATE TRIGGER update_shared_environments_updated_at
  BEFORE UPDATE ON public.shared_environments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();