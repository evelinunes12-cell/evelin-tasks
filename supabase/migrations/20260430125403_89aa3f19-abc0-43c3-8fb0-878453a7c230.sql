-- Fix RLS WITH CHECK on task_assignees: allow assigning the environment owner,
-- not only environment_members rows.
DROP POLICY IF EXISTS "Owners or creators can add assignees" ON public.task_assignees;

CREATE POLICY "Owners or creators can add assignees"
ON public.task_assignees
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.can_manage_task_assignees(task_id, auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.shared_environments se ON se.id = t.environment_id
    WHERE t.id = task_assignees.task_id
      AND (
        -- assignee is the environment owner
        se.owner_id = task_assignees.user_id
        OR
        -- assignee is a linked member of the environment
        EXISTS (
          SELECT 1 FROM public.environment_members em
          WHERE em.environment_id = t.environment_id
            AND em.user_id = task_assignees.user_id
        )
      )
  )
);