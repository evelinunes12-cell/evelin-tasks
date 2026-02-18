
-- Create environment activity log table
CREATE TABLE public.environment_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID NOT NULL REFERENCES public.shared_environments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast queries by environment
CREATE INDEX idx_env_activity_log_env_id ON public.environment_activity_log(environment_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.environment_activity_log ENABLE ROW LEVEL SECURITY;

-- Members and owners can view activity of their environments
CREATE POLICY "Members can view environment activity"
ON public.environment_activity_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_activity_log.environment_id
    AND (se.owner_id = auth.uid() OR public.is_environment_member(se.id, auth.uid()))
  )
);

-- Members with edit+ permission or owners can insert activity
CREATE POLICY "Members can insert environment activity"
ON public.environment_activity_log
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.shared_environments se
      WHERE se.id = environment_activity_log.environment_id
      AND se.owner_id = auth.uid()
    )
    OR public.has_environment_permission(environment_id, auth.uid(), 'view'::environment_permission)
  )
);

-- Only owners can delete activity log entries
CREATE POLICY "Owners can delete environment activity"
ON public.environment_activity_log
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.shared_environments se
    WHERE se.id = environment_activity_log.environment_id
    AND se.owner_id = auth.uid()
  )
);

-- Trigger function for automatic task tracking in environments
CREATE OR REPLACE FUNCTION public.log_environment_task_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_name TEXT;
BEGIN
  -- Only track tasks that belong to an environment
  IF TG_OP = 'DELETE' THEN
    IF OLD.environment_id IS NULL THEN RETURN OLD; END IF;
  ELSE
    IF NEW.environment_id IS NULL THEN RETURN NEW; END IF;
  END IF;

  -- Get actor name
  SELECT COALESCE(full_name, email) INTO actor_name
  FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
    VALUES (NEW.environment_id, auth.uid(), 'created', 'task', NEW.id, NEW.subject_name, NULL);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Track status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
      VALUES (NEW.environment_id, auth.uid(), 'status_changed', 'task', NEW.id, NEW.subject_name, 
              'De "' || OLD.status || '" para "' || NEW.status || '"');
    END IF;
    -- Track archive
    IF OLD.is_archived IS DISTINCT FROM NEW.is_archived AND NEW.is_archived = true THEN
      INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
      VALUES (NEW.environment_id, auth.uid(), 'archived', 'task', NEW.id, NEW.subject_name, NULL);
    END IF;
    -- Track general updates (only if not already logged above)
    IF OLD.status IS NOT DISTINCT FROM NEW.status AND OLD.is_archived IS NOT DISTINCT FROM NEW.is_archived THEN
      INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
      VALUES (NEW.environment_id, auth.uid(), 'updated', 'task', NEW.id, NEW.subject_name, NULL);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
    VALUES (OLD.environment_id, auth.uid(), 'deleted', 'task', OLD.id, OLD.subject_name, NULL);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_log_environment_task_change
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.log_environment_task_change();

-- Trigger for member changes
CREATE OR REPLACE FUNCTION public.log_environment_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
    VALUES (NEW.environment_id, auth.uid(), 'member_added', 'member', NEW.id, NEW.email, NULL);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
    VALUES (OLD.environment_id, auth.uid(), 'member_removed', 'member', OLD.id, OLD.email, NULL);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.permissions IS DISTINCT FROM NEW.permissions THEN
      INSERT INTO public.environment_activity_log (environment_id, user_id, action, entity_type, entity_id, entity_name, details)
      VALUES (NEW.environment_id, auth.uid(), 'permissions_changed', 'member', NEW.id, NEW.email,
              'Permissões atualizadas');
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_log_environment_member_change
AFTER INSERT OR UPDATE OR DELETE ON public.environment_members
FOR EACH ROW
EXECUTE FUNCTION public.log_environment_member_change();
