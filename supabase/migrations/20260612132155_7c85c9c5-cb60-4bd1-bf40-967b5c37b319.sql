CREATE OR REPLACE FUNCTION public.auto_archive_tasks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  archived_task RECORD;
BEGIN
  -- Personal tasks (no environment): archive 7 days after completion
  FOR archived_task IN
    SELECT id, user_id, subject_name
    FROM public.tasks
    WHERE status ILIKE '%conclu%'
      AND is_archived = false
      AND environment_id IS NULL
      AND updated_at < now() - interval '7 days'
  LOOP
    UPDATE public.tasks
    SET is_archived = true, updated_at = now()
    WHERE id = archived_task.id;

    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
      archived_task.user_id,
      'Tarefa Arquivada 📦',
      'Sua tarefa "' || archived_task.subject_name || '" foi arquivada automaticamente após 7 dias concluída.',
      '/archived'
    );
  END LOOP;

  -- Group (environment) tasks: archive 10 days after completion
  FOR archived_task IN
    SELECT id, user_id, subject_name, environment_id
    FROM public.tasks
    WHERE status ILIKE '%conclu%'
      AND is_archived = false
      AND environment_id IS NOT NULL
      AND updated_at < now() - interval '10 days'
  LOOP
    UPDATE public.tasks
    SET is_archived = true, updated_at = now()
    WHERE id = archived_task.id;

    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (
      archived_task.user_id,
      'Tarefa do Grupo Arquivada 📦',
      'A tarefa "' || archived_task.subject_name || '" foi arquivada automaticamente após 10 dias concluída.',
      '/environment/' || archived_task.environment_id
    );
  END LOOP;
END;
$function$;