
CREATE OR REPLACE FUNCTION public.check_upcoming_tasks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- System notifications (existing logic)
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT 
    t.user_id,
    'Tarefa Vence Amanhã 📅',
    'A tarefa "' || t.subject_name || '" vence amanhã!',
    '/task/' || t.id
  FROM public.tasks t
  WHERE 
    t.due_date = current_date + 1
    AND t.status NOT ILIKE '%conclu%'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n 
      WHERE n.link = '/task/' || t.id 
      AND n.title = 'Tarefa Vence Amanhã 📅'
      AND n.created_at > now() - interval '24 hours'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = t.user_id AND np.tasks_system = false
    );

  -- Push notifications
  SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO v_service_role_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
    FOR rec IN
      SELECT t.user_id, t.subject_name, t.id AS task_id
      FROM public.tasks t
      WHERE t.due_date = current_date + 1
        AND t.status NOT ILIKE '%conclu%'
        AND NOT EXISTS (
          SELECT 1 FROM public.notifications n 
          WHERE n.link = '/task/' || t.id 
          AND n.title = 'Tarefa Vence Amanhã 📅'
          AND n.created_at > now() - interval '1 minute'
        )
        AND EXISTS (SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id = t.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np
          WHERE np.user_id = t.user_id AND np.tasks_push = false
        )
    LOOP
      PERFORM extensions.http_post(
        url := v_supabase_url || '/functions/v1/send-push',
        body := json_build_object('userId', rec.user_id, 'title', 'Tarefa Vence Amanhã 📅',
          'body', 'A tarefa "' || rec.subject_name || '" vence amanhã!', 'url', '/task/' || rec.task_id)::jsonb,
        headers := json_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key)::jsonb
      );
    END LOOP;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_overdue_tasks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- System notifications (existing logic)
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT 
    t.user_id,
    'Tarefa Atrasada ⚠️',
    'A tarefa "' || t.subject_name || '" venceu em ' || to_char(t.due_date::date, 'DD/MM'),
    '/task/' || t.id
  FROM public.tasks t
  WHERE 
    t.due_date < current_date
    AND t.status NOT ILIKE '%conclu%'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n 
      WHERE n.link = '/task/' || t.id 
      AND n.created_at > now() - interval '24 hours'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = t.user_id AND np.tasks_system = false
    );

  -- Push notifications
  SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO v_service_role_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
    FOR rec IN
      SELECT t.user_id, t.subject_name, t.id AS task_id, to_char(t.due_date::date, 'DD/MM') AS due_fmt
      FROM public.tasks t
      WHERE t.due_date < current_date
        AND t.status NOT ILIKE '%conclu%'
        AND NOT EXISTS (
          SELECT 1 FROM public.notifications n 
          WHERE n.link = '/task/' || t.id 
          AND n.created_at > now() - interval '1 minute'
        )
        AND EXISTS (SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id = t.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np
          WHERE np.user_id = t.user_id AND np.tasks_push = false
        )
    LOOP
      PERFORM extensions.http_post(
        url := v_supabase_url || '/functions/v1/send-push',
        body := json_build_object('userId', rec.user_id, 'title', 'Tarefa Atrasada ⚠️',
          'body', 'A tarefa "' || rec.subject_name || '" venceu em ' || rec.due_fmt, 'url', '/task/' || rec.task_id)::jsonb,
        headers := json_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key)::jsonb
      );
    END LOOP;
  END IF;
END;
$function$;
