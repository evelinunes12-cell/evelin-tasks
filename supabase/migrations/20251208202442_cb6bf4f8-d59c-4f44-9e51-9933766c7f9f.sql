-- Create environment_subjects table
CREATE TABLE public.environment_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID NOT NULL REFERENCES public.shared_environments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(environment_id, name)
);

-- Enable RLS
ALTER TABLE public.environment_subjects ENABLE ROW LEVEL SECURITY;

-- RLS policies for environment_subjects
CREATE POLICY "Users can view subjects of environments they have access to"
ON public.environment_subjects
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_subjects.environment_id
    AND (se.owner_id = auth.uid() OR is_environment_member(se.id, auth.uid()))
  )
);

CREATE POLICY "Environment owners can create subjects"
ON public.environment_subjects
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_subjects.environment_id AND se.owner_id = auth.uid()
  )
);

CREATE POLICY "Environment owners can update subjects"
ON public.environment_subjects
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_subjects.environment_id AND se.owner_id = auth.uid()
  )
);

CREATE POLICY "Environment owners can delete subjects"
ON public.environment_subjects
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_subjects.environment_id AND se.owner_id = auth.uid()
  )
);

-- Create environment_statuses table
CREATE TABLE public.environment_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID NOT NULL REFERENCES public.shared_environments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(environment_id, name)
);

-- Enable RLS
ALTER TABLE public.environment_statuses ENABLE ROW LEVEL SECURITY;

-- RLS policies for environment_statuses
CREATE POLICY "Users can view statuses of environments they have access to"
ON public.environment_statuses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_statuses.environment_id
    AND (se.owner_id = auth.uid() OR is_environment_member(se.id, auth.uid()))
  )
);

CREATE POLICY "Environment owners can create statuses"
ON public.environment_statuses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_statuses.environment_id AND se.owner_id = auth.uid()
  )
);

CREATE POLICY "Environment owners can update statuses"
ON public.environment_statuses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_statuses.environment_id AND se.owner_id = auth.uid()
  )
);

CREATE POLICY "Environment owners can delete statuses"
ON public.environment_statuses
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_statuses.environment_id AND se.owner_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_environment_subjects_updated_at
  BEFORE UPDATE ON public.environment_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_environment_statuses_updated_at
  BEFORE UPDATE ON public.environment_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();