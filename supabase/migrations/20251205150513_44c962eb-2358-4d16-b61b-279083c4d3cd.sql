
-- Drop existing policies for task_steps
DROP POLICY IF EXISTS "Users can view steps of own tasks" ON public.task_steps;
DROP POLICY IF EXISTS "Users can create steps for own tasks" ON public.task_steps;
DROP POLICY IF EXISTS "Users can update steps of own tasks" ON public.task_steps;
DROP POLICY IF EXISTS "Users can delete steps of own tasks" ON public.task_steps;

-- Create new policies for task_steps that inherit from tasks (including environment permissions)
CREATE POLICY "Users can view steps of accessible tasks"
ON public.task_steps
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_steps.task_id
    AND (
      (tasks.user_id = auth.uid() AND tasks.environment_id IS NULL)
      OR (tasks.environment_id IS NOT NULL AND has_environment_permission(tasks.environment_id, auth.uid(), 'view'))
    )
  )
);

CREATE POLICY "Users can create steps for accessible tasks"
ON public.task_steps
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_steps.task_id
    AND (
      (tasks.user_id = auth.uid() AND tasks.environment_id IS NULL)
      OR (tasks.environment_id IS NOT NULL AND has_environment_permission(tasks.environment_id, auth.uid(), 'edit'))
    )
  )
);

CREATE POLICY "Users can update steps of accessible tasks"
ON public.task_steps
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_steps.task_id
    AND (
      (tasks.user_id = auth.uid() AND tasks.environment_id IS NULL)
      OR (tasks.environment_id IS NOT NULL AND has_environment_permission(tasks.environment_id, auth.uid(), 'edit'))
    )
  )
);

CREATE POLICY "Users can delete steps of accessible tasks"
ON public.task_steps
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_steps.task_id
    AND (
      (tasks.user_id = auth.uid() AND tasks.environment_id IS NULL)
      OR (tasks.environment_id IS NOT NULL AND has_environment_permission(tasks.environment_id, auth.uid(), 'delete'))
    )
  )
);

-- Drop existing policies for task_attachments
DROP POLICY IF EXISTS "Users can view attachments of own tasks" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can create attachments for own tasks" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can delete attachments of own tasks" ON public.task_attachments;

-- Create new policies for task_attachments that inherit from tasks
CREATE POLICY "Users can view attachments of accessible tasks"
ON public.task_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_attachments.task_id
    AND (
      (tasks.user_id = auth.uid() AND tasks.environment_id IS NULL)
      OR (tasks.environment_id IS NOT NULL AND has_environment_permission(tasks.environment_id, auth.uid(), 'view'))
    )
  )
);

CREATE POLICY "Users can create attachments for accessible tasks"
ON public.task_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_attachments.task_id
    AND (
      (tasks.user_id = auth.uid() AND tasks.environment_id IS NULL)
      OR (tasks.environment_id IS NOT NULL AND has_environment_permission(tasks.environment_id, auth.uid(), 'edit'))
    )
  )
);

CREATE POLICY "Users can delete attachments of accessible tasks"
ON public.task_attachments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tasks
    WHERE tasks.id = task_attachments.task_id
    AND (
      (tasks.user_id = auth.uid() AND tasks.environment_id IS NULL)
      OR (tasks.environment_id IS NOT NULL AND has_environment_permission(tasks.environment_id, auth.uid(), 'delete'))
    )
  )
);

-- Drop existing policies for task_step_attachments
DROP POLICY IF EXISTS "Users can view attachments of own task steps" ON public.task_step_attachments;
DROP POLICY IF EXISTS "Users can create attachments for own task steps" ON public.task_step_attachments;
DROP POLICY IF EXISTS "Users can delete attachments of own task steps" ON public.task_step_attachments;

-- Create new policies for task_step_attachments that inherit from tasks via task_steps
CREATE POLICY "Users can view attachments of accessible task steps"
ON public.task_step_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM task_steps
    JOIN tasks ON tasks.id = task_steps.task_id
    WHERE task_steps.id = task_step_attachments.task_step_id
    AND (
      (tasks.user_id = auth.uid() AND tasks.environment_id IS NULL)
      OR (tasks.environment_id IS NOT NULL AND has_environment_permission(tasks.environment_id, auth.uid(), 'view'))
    )
  )
);

CREATE POLICY "Users can create attachments for accessible task steps"
ON public.task_step_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM task_steps
    JOIN tasks ON tasks.id = task_steps.task_id
    WHERE task_steps.id = task_step_attachments.task_step_id
    AND (
      (tasks.user_id = auth.uid() AND tasks.environment_id IS NULL)
      OR (tasks.environment_id IS NOT NULL AND has_environment_permission(tasks.environment_id, auth.uid(), 'edit'))
    )
  )
);

CREATE POLICY "Users can delete attachments of accessible task steps"
ON public.task_step_attachments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM task_steps
    JOIN tasks ON tasks.id = task_steps.task_id
    WHERE task_steps.id = task_step_attachments.task_step_id
    AND (
      (tasks.user_id = auth.uid() AND tasks.environment_id IS NULL)
      OR (tasks.environment_id IS NOT NULL AND has_environment_permission(tasks.environment_id, auth.uid(), 'delete'))
    )
  )
);
