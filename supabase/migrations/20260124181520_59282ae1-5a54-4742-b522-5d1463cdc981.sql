-- Add is_archived column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Create index for better query performance on archived filter
CREATE INDEX idx_tasks_is_archived ON public.tasks(is_archived);

-- Create function to auto-archive completed tasks older than 7 days
CREATE OR REPLACE FUNCTION public.auto_archive_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  archived_task RECORD;
BEGIN
  -- Find and archive tasks that are completed for more than 7 days
  FOR archived_task IN
    SELECT id, user_id, subject_name
    FROM public.tasks
    WHERE status ILIKE '%conclu%'
      AND is_archived = false
      AND updated_at < now() - interval '7 days'
  LOOP
    -- Update task to archived
    UPDATE public.tasks
    SET is_archived = true, updated_at = now()
    WHERE id = archived_task.id;

    -- Create notification for the user
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
      archived_task.user_id,
      'Tarefa Arquivada 📦',
      'Sua tarefa "' || archived_task.subject_name || '" foi arquivada automaticamente após 7 dias concluída.',
      '/archived'
    );
  END LOOP;
END;
$$;