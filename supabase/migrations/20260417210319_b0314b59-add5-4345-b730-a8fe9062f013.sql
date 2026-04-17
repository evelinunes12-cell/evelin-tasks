-- Update check_planner_notifications to include study cycle reminders
CREATE OR REPLACE FUNCTION public.check_planner_notifications()
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
  SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO v_service_role_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  -- === SCHEDULES: system notifications (15 min before start) ===
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT s.user_id, 'Horário em breve ⏰',
    '⏰ ' || s.title || ' começa às ' || to_char(s.start_time, 'HH24:MI'), '/planner'
  FROM public.study_schedules s
  WHERE s.day_of_week = extract(dow FROM now())::int
    AND s.start_time BETWEEN (now()::time) AND (now()::time + interval '15 minutes')
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = s.user_id AND n.title = 'Horário em breve ⏰'
        AND n.message = '⏰ ' || s.title || ' começa às ' || to_char(s.start_time, 'HH24:MI')
        AND n.created_at::date = CURRENT_DATE
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = s.user_id AND np.schedules_system = false
    );

  -- === SCHEDULES: push ===
  IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
    FOR rec IN
      SELECT s.user_id, s.title, to_char(s.start_time, 'HH24:MI') AS start_fmt
      FROM public.study_schedules s
      WHERE s.day_of_week = extract(dow FROM now())::int
        AND s.start_time BETWEEN (now()::time) AND (now()::time + interval '15 minutes')
        AND NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.user_id = s.user_id AND n.title = 'Horário em breve ⏰'
            AND n.message = '⏰ ' || s.title || ' começa às ' || to_char(s.start_time, 'HH24:MI')
            AND n.created_at::date = CURRENT_DATE
        )
        AND EXISTS (SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id = s.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np
          WHERE np.user_id = s.user_id AND np.schedules_push = false
        )
    LOOP
      PERFORM extensions.http_post(
        url := v_supabase_url || '/functions/v1/send-push',
        body := json_build_object('userId', rec.user_id, 'title', 'Horário em breve ⏰',
          'body', '⏰ ' || rec.title || ' começa às ' || rec.start_fmt, 'url', '/planner')::jsonb,
        headers := json_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key)::jsonb
      );
    END LOOP;
  END IF;

  -- === GOALS: due today (system) ===
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT g.user_id, 'Meta para Hoje 📅',
    '📅 Meta para hoje: ' || g.title || '. Vamos cumprir?', '/planner'
  FROM public.planner_goals g
  WHERE g.target_date = CURRENT_DATE AND g.completed = false
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = g.user_id AND n.title = 'Meta para Hoje 📅'
        AND n.message = '📅 Meta para hoje: ' || g.title || '. Vamos cumprir?'
        AND n.created_at::date = CURRENT_DATE
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = g.user_id AND np.goals_system = false
    );

  -- === GOALS: due today (push) ===
  IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
    FOR rec IN
      SELECT g.user_id, g.title
      FROM public.planner_goals g
      WHERE g.target_date = CURRENT_DATE AND g.completed = false
        AND NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.user_id = g.user_id AND n.title = 'Meta para Hoje 📅'
            AND n.message = '📅 Meta para hoje: ' || g.title || '. Vamos cumprir?'
            AND n.created_at::date = CURRENT_DATE AND n.created_at > now() - interval '1 minute'
        )
        AND EXISTS (SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id = g.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np
          WHERE np.user_id = g.user_id AND np.goals_push = false
        )
    LOOP
      PERFORM extensions.http_post(
        url := v_supabase_url || '/functions/v1/send-push',
        body := json_build_object('userId', rec.user_id, 'title', 'Meta para Hoje 📅',
          'body', '📅 Meta para hoje: ' || rec.title || '. Vamos cumprir?', 'url', '/planner')::jsonb,
        headers := json_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key)::jsonb
      );
    END LOOP;
  END IF;

  -- === GOALS: overdue (system) ===
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT g.user_id, 'Meta Atrasada ⚠️',
    '⚠️ A meta "' || g.title || '" venceu ontem. Não esqueça de atualizar!', '/planner'
  FROM public.planner_goals g
  WHERE g.target_date = CURRENT_DATE - 1 AND g.completed = false
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = g.user_id AND n.title = 'Meta Atrasada ⚠️'
        AND n.message = '⚠️ A meta "' || g.title || '" venceu ontem. Não esqueça de atualizar!'
        AND n.created_at::date = CURRENT_DATE
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = g.user_id AND np.goals_system = false
    );

  -- === GOALS: overdue (push) ===
  IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
    FOR rec IN
      SELECT g.user_id, g.title
      FROM public.planner_goals g
      WHERE g.target_date = CURRENT_DATE - 1 AND g.completed = false
        AND NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.user_id = g.user_id AND n.title = 'Meta Atrasada ⚠️'
            AND n.message = '⚠️ A meta "' || g.title || '" venceu ontem. Não esqueça de atualizar!'
            AND n.created_at::date = CURRENT_DATE AND n.created_at > now() - interval '1 minute'
        )
        AND EXISTS (SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id = g.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np
          WHERE np.user_id = g.user_id AND np.goals_push = false
        )
    LOOP
      PERFORM extensions.http_post(
        url := v_supabase_url || '/functions/v1/send-push',
        body := json_build_object('userId', rec.user_id, 'title', 'Meta Atrasada ⚠️',
          'body', '⚠️ A meta "' || rec.title || '" venceu ontem. Não esqueça de atualizar!', 'url', '/planner')::jsonb,
        headers := json_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key)::jsonb
      );
    END LOOP;
  END IF;

  -- === NOTES: planned for today (system) ===
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT n2.user_id, 'Anotação para Hoje 📝',
    '📝 Anotação para hoje: ' || n2.title || '. Vamos cumprir?', '/planner'
  FROM public.planner_notes n2
  WHERE n2.planned_date = CURRENT_DATE AND n2.completed = false
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = n2.user_id AND n.title = 'Anotação para Hoje 📝'
        AND n.message = '📝 Anotação para hoje: ' || n2.title || '. Vamos cumprir?'
        AND n.created_at::date = CURRENT_DATE
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = n2.user_id AND np.notes_system = false
    );

  -- === NOTES: planned for today (push) ===
  IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
    FOR rec IN
      SELECT n2.user_id, n2.title
      FROM public.planner_notes n2
      WHERE n2.planned_date = CURRENT_DATE AND n2.completed = false
        AND NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.user_id = n2.user_id AND n.title = 'Anotação para Hoje 📝'
            AND n.message = '📝 Anotação para hoje: ' || n2.title || '. Vamos cumprir?'
            AND n.created_at::date = CURRENT_DATE AND n.created_at > now() - interval '1 minute'
        )
        AND EXISTS (SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id = n2.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np
          WHERE np.user_id = n2.user_id AND np.notes_push = false
        )
    LOOP
      PERFORM extensions.http_post(
        url := v_supabase_url || '/functions/v1/send-push',
        body := json_build_object('userId', rec.user_id, 'title', 'Anotação para Hoje 📝',
          'body', '📝 Anotação para hoje: ' || rec.title || '. Vamos cumprir?', 'url', '/planner')::jsonb,
        headers := json_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key)::jsonb
      );
    END LOOP;
  END IF;

  -- === NOTES: overdue (system) ===
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT n2.user_id, 'Anotação Atrasada ⚠️',
    '⚠️ A anotação "' || n2.title || '" venceu ontem. Não esqueça de atualizar!', '/planner'
  FROM public.planner_notes n2
  WHERE n2.planned_date = CURRENT_DATE - 1 AND n2.completed = false
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = n2.user_id AND n.title = 'Anotação Atrasada ⚠️'
        AND n.message = '⚠️ A anotação "' || n2.title || '" venceu ontem. Não esqueça de atualizar!'
        AND n.created_at::date = CURRENT_DATE
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = n2.user_id AND np.notes_system = false
    );

  -- === NOTES: overdue (push) ===
  IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
    FOR rec IN
      SELECT n2.user_id, n2.title
      FROM public.planner_notes n2
      WHERE n2.planned_date = CURRENT_DATE - 1 AND n2.completed = false
        AND NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.user_id = n2.user_id AND n.title = 'Anotação Atrasada ⚠️'
            AND n.message = '⚠️ A anotação "' || n2.title || '" venceu ontem. Não esqueça de atualizar!'
            AND n.created_at::date = CURRENT_DATE AND n.created_at > now() - interval '1 minute'
        )
        AND EXISTS (SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id = n2.user_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np
          WHERE np.user_id = n2.user_id AND np.notes_push = false
        )
    LOOP
      PERFORM extensions.http_post(
        url := v_supabase_url || '/functions/v1/send-push',
        body := json_build_object('userId', rec.user_id, 'title', 'Anotação Atrasada ⚠️',
          'body', '⚠️ A anotação "' || rec.title || '" venceu ontem. Não esqueça de atualizar!', 'url', '/planner')::jsonb,
        headers := json_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key)::jsonb
      );
    END LOOP;
  END IF;

  -- === STUDY CYCLE: daily reminder for users with active cycle (once per day, ~08:00 local server) ===
  -- Sent only between 08:00 and 08:10 server time so it fires once daily when cron runs every minute
  IF extract(hour FROM now())::int = 8 AND extract(minute FROM now())::int < 10 THEN
    INSERT INTO public.notifications (user_id, title, message, link)
    SELECT DISTINCT sc.user_id, 'Hora de estudar 🎯',
      '🎯 Você tem um ciclo de estudos ativo: "' || sc.name || '". Bora começar?', '/study-cycle'
    FROM public.study_cycles sc
    WHERE sc.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = sc.user_id AND n.title = 'Hora de estudar 🎯'
          AND n.created_at::date = CURRENT_DATE
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_preferences np
        WHERE np.user_id = sc.user_id AND np.study_cycle_system = false
      );

    -- STUDY CYCLE: push
    IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
      FOR rec IN
        SELECT DISTINCT sc.user_id, sc.name
        FROM public.study_cycles sc
        WHERE sc.is_active = true
          AND EXISTS (SELECT 1 FROM public.push_subscriptions ps WHERE ps.user_id = sc.user_id)
          AND NOT EXISTS (
            SELECT 1 FROM public.notification_preferences np
            WHERE np.user_id = sc.user_id AND np.study_cycle_push = false
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.user_id = sc.user_id AND n.title = 'Hora de estudar 🎯'
              AND n.created_at::date = CURRENT_DATE AND n.created_at > now() - interval '5 minutes'
          )
      LOOP
        PERFORM extensions.http_post(
          url := v_supabase_url || '/functions/v1/send-push',
          body := json_build_object('userId', rec.user_id, 'title', 'Hora de estudar 🎯',
            'body', '🎯 Você tem um ciclo de estudos ativo: "' || rec.name || '". Bora começar?', 'url', '/study-cycle')::jsonb,
          headers := json_build_object('Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_role_key)::jsonb
        );
      END LOOP;
    END IF;
  END IF;
END;
$function$;

-- Reschedule cron jobs: planner notifications must run every minute (for schedules' 15-min window)
DO $$
DECLARE
  v_url TEXT;
  v_key TEXT;
  v_jobid BIGINT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1;

  -- Unschedule any existing planner notification jobs
  FOR v_jobid IN SELECT jobid FROM cron.job WHERE jobname IN ('check-planner-notifications', 'check_planner_notifications', 'planner-notifications-hourly', 'planner-notifications-daily') LOOP
    PERFORM cron.unschedule(v_jobid);
  END LOOP;

  -- Schedule to run every minute
  PERFORM cron.schedule(
    'check-planner-notifications',
    '* * * * *',
    $cron$ SELECT public.check_planner_notifications(); $cron$
  );
END $$;