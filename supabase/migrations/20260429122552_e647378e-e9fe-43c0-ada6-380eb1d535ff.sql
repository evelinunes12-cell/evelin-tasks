-- 1. Add privacy flag to shared_environments
ALTER TABLE public.shared_environments
ADD COLUMN IF NOT EXISTS restrict_tasks_to_assignees BOOLEAN NOT NULL DEFAULT false;

-- 2. Create task_assignees table
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- 3. Security definer helper to check task access under restriction rules
CREATE OR REPLACE FUNCTION public.can_access_environment_task(_task_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    LEFT JOIN public.shared_environments se ON se.id = t.environment_id
    WHERE t.id = _task_id
      AND (
        -- Personal task (no environment): owner only
        (t.environment_id IS NULL AND t.user_id = _user_id)
        OR
        -- Environment task: must have view permission first
        (
          t.environment_id IS NOT NULL
          AND public.has_environment_permission(t.environment_id, _user_id, 'view'::environment_permission)
          AND (
            -- Open mode: anyone with permission
            COALESCE(se.restrict_tasks_to_assignees, false) = false
            -- Restricted mode: owner, creator, or assignee
            OR se.owner_id = _user_id
            OR t.user_id = _user_id
            OR EXISTS (
              SELECT 1 FROM public.task_assignees ta
              WHERE ta.task_id = t.id AND ta.user_id = _user_id
            )
          )
        )
      )
  );
$$;

-- 4. Helper: can the user manage assignees for this task?
CREATE OR REPLACE FUNCTION public.can_manage_task_assignees(_task_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    LEFT JOIN public.shared_environments se ON se.id = t.environment_id
    WHERE t.id = _task_id
      AND t.environment_id IS NOT NULL
      AND (se.owner_id = _user_id OR t.user_id = _user_id)
  );
$$;

-- 5. RLS policies for task_assignees
DROP POLICY IF EXISTS "View assignees of accessible tasks" ON public.task_assignees;
CREATE POLICY "View assignees of accessible tasks"
ON public.task_assignees FOR SELECT
USING (public.can_access_environment_task(task_id, auth.uid()));

DROP POLICY IF EXISTS "Owners or creators can add assignees" ON public.task_assignees;
CREATE POLICY "Owners or creators can add assignees"
ON public.task_assignees FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND public.can_manage_task_assignees(task_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.environment_members em ON em.environment_id = t.environment_id
    WHERE t.id = task_assignees.task_id
      AND em.user_id = task_assignees.user_id
  )
);

DROP POLICY IF EXISTS "Owners or creators can remove assignees" ON public.task_assignees;
CREATE POLICY "Owners or creators can remove assignees"
ON public.task_assignees FOR DELETE
USING (public.can_manage_task_assignees(task_id, auth.uid()));

-- 6. Update tasks RLS policies to enforce restriction
DROP POLICY IF EXISTS "Users can view own tasks or shared environment tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks or shared environment tasks"
ON public.tasks FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    (auth.uid() = user_id AND environment_id IS NULL)
    OR (
      environment_id IS NOT NULL
      AND has_environment_permission(environment_id, auth.uid(), 'view'::environment_permission)
      AND (
        NOT COALESCE((SELECT restrict_tasks_to_assignees FROM public.shared_environments WHERE id = tasks.environment_id), false)
        OR (SELECT owner_id FROM public.shared_environments WHERE id = tasks.environment_id) = auth.uid()
        OR tasks.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.task_assignees ta
          WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can update own tasks or environment tasks with permission" ON public.tasks;
CREATE POLICY "Users can update own tasks or environment tasks with permission"
ON public.tasks FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    (auth.uid() = user_id AND environment_id IS NULL)
    OR (
      environment_id IS NOT NULL
      AND has_environment_permission(environment_id, auth.uid(), 'edit'::environment_permission)
      AND (
        NOT COALESCE((SELECT restrict_tasks_to_assignees FROM public.shared_environments WHERE id = tasks.environment_id), false)
        OR (SELECT owner_id FROM public.shared_environments WHERE id = tasks.environment_id) = auth.uid()
        OR tasks.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.task_assignees ta
          WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can delete own tasks or environment tasks with permission" ON public.tasks;
CREATE POLICY "Users can delete own tasks or environment tasks with permission"
ON public.tasks FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND (
    (auth.uid() = user_id AND environment_id IS NULL)
    OR (
      environment_id IS NOT NULL
      AND has_environment_permission(environment_id, auth.uid(), 'delete'::environment_permission)
      AND (
        NOT COALESCE((SELECT restrict_tasks_to_assignees FROM public.shared_environments WHERE id = tasks.environment_id), false)
        OR (SELECT owner_id FROM public.shared_environments WHERE id = tasks.environment_id) = auth.uid()
        OR tasks.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.task_assignees ta
          WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
        )
      )
    )
  )
);

-- 7. Update task_steps policies to use new helper
DROP POLICY IF EXISTS "Users can view steps of accessible tasks" ON public.task_steps;
CREATE POLICY "Users can view steps of accessible tasks"
ON public.task_steps FOR SELECT
USING (public.can_access_environment_task(task_id, auth.uid()));

DROP POLICY IF EXISTS "Users can create steps for accessible tasks" ON public.task_steps;
CREATE POLICY "Users can create steps for accessible tasks"
ON public.task_steps FOR INSERT
WITH CHECK (
  public.can_access_environment_task(task_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_steps.task_id
      AND (
        (t.user_id = auth.uid() AND t.environment_id IS NULL)
        OR (t.environment_id IS NOT NULL AND has_environment_permission(t.environment_id, auth.uid(), 'edit'::environment_permission))
      )
  )
);

DROP POLICY IF EXISTS "Users can update steps of accessible tasks" ON public.task_steps;
CREATE POLICY "Users can update steps of accessible tasks"
ON public.task_steps FOR UPDATE
USING (
  public.can_access_environment_task(task_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_steps.task_id
      AND (
        (t.user_id = auth.uid() AND t.environment_id IS NULL)
        OR (t.environment_id IS NOT NULL AND has_environment_permission(t.environment_id, auth.uid(), 'edit'::environment_permission))
      )
  )
);

DROP POLICY IF EXISTS "Users can delete steps of accessible tasks" ON public.task_steps;
CREATE POLICY "Users can delete steps of accessible tasks"
ON public.task_steps FOR DELETE
USING (
  public.can_access_environment_task(task_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_steps.task_id
      AND (
        (t.user_id = auth.uid() AND t.environment_id IS NULL)
        OR (t.environment_id IS NOT NULL AND has_environment_permission(t.environment_id, auth.uid(), 'delete'::environment_permission))
      )
  )
);

-- 8. Update task_attachments policies
DROP POLICY IF EXISTS "Users can view attachments of accessible tasks" ON public.task_attachments;
CREATE POLICY "Users can view attachments of accessible tasks"
ON public.task_attachments FOR SELECT
USING (public.can_access_environment_task(task_id, auth.uid()));

DROP POLICY IF EXISTS "Users can create attachments for accessible tasks" ON public.task_attachments;
CREATE POLICY "Users can create attachments for accessible tasks"
ON public.task_attachments FOR INSERT
WITH CHECK (
  public.can_access_environment_task(task_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id
      AND (
        (t.user_id = auth.uid() AND t.environment_id IS NULL)
        OR (t.environment_id IS NOT NULL AND has_environment_permission(t.environment_id, auth.uid(), 'edit'::environment_permission))
      )
  )
);

DROP POLICY IF EXISTS "Users can delete attachments of accessible tasks" ON public.task_attachments;
CREATE POLICY "Users can delete attachments of accessible tasks"
ON public.task_attachments FOR DELETE
USING (
  public.can_access_environment_task(task_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id
      AND (
        (t.user_id = auth.uid() AND t.environment_id IS NULL)
        OR (t.environment_id IS NOT NULL AND has_environment_permission(t.environment_id, auth.uid(), 'delete'::environment_permission))
      )
  )
);

-- 9. Update task_step_attachments policies
DROP POLICY IF EXISTS "Users can view attachments of accessible task steps" ON public.task_step_attachments;
CREATE POLICY "Users can view attachments of accessible task steps"
ON public.task_step_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.task_steps ts
    WHERE ts.id = task_step_attachments.task_step_id
      AND public.can_access_environment_task(ts.task_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can create attachments for accessible task steps" ON public.task_step_attachments;
CREATE POLICY "Users can create attachments for accessible task steps"
ON public.task_step_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.task_steps ts
    JOIN public.tasks t ON t.id = ts.task_id
    WHERE ts.id = task_step_attachments.task_step_id
      AND public.can_access_environment_task(ts.task_id, auth.uid())
      AND (
        (t.user_id = auth.uid() AND t.environment_id IS NULL)
        OR (t.environment_id IS NOT NULL AND has_environment_permission(t.environment_id, auth.uid(), 'edit'::environment_permission))
      )
  )
);

DROP POLICY IF EXISTS "Users can delete attachments of accessible task steps" ON public.task_step_attachments;
CREATE POLICY "Users can delete attachments of accessible task steps"
ON public.task_step_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.task_steps ts
    JOIN public.tasks t ON t.id = ts.task_id
    WHERE ts.id = task_step_attachments.task_step_id
      AND public.can_access_environment_task(ts.task_id, auth.uid())
      AND (
        (t.user_id = auth.uid() AND t.environment_id IS NULL)
        OR (t.environment_id IS NOT NULL AND has_environment_permission(t.environment_id, auth.uid(), 'delete'::environment_permission))
      )
  )
);

-- 10. RPC to fetch assignees with profile info (for UI display)
CREATE OR REPLACE FUNCTION public.get_task_assignees(_task_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ta.id,
    ta.user_id,
    p.email,
    p.full_name,
    p.username,
    p.avatar_url,
    ta.created_at
  FROM public.task_assignees ta
  LEFT JOIN public.profiles p ON p.id = ta.user_id
  WHERE ta.task_id = _task_id
    AND public.can_access_environment_task(_task_id, auth.uid());
$$;

-- 11. RPC to list environment members eligible to be assigned (with profile info)
CREATE OR REPLACE FUNCTION public.get_environment_assignable_members(_environment_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Owner
  SELECT
    se.owner_id AS user_id,
    p.email,
    p.full_name,
    p.username,
    p.avatar_url
  FROM public.shared_environments se
  LEFT JOIN public.profiles p ON p.id = se.owner_id
  WHERE se.id = _environment_id
    AND (se.owner_id = auth.uid() OR public.is_environment_member(se.id, auth.uid()))
  UNION
  -- Members with linked user_id
  SELECT
    em.user_id,
    p.email,
    p.full_name,
    p.username,
    p.avatar_url
  FROM public.environment_members em
  LEFT JOIN public.profiles p ON p.id = em.user_id
  WHERE em.environment_id = _environment_id
    AND em.user_id IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.shared_environments s WHERE s.id = _environment_id AND s.owner_id = auth.uid())
      OR public.is_environment_member(_environment_id, auth.uid())
    );
$$;