CREATE OR REPLACE FUNCTION public.check_planner_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
  v_tz text := 'America/Sao_Paulo';
  rec record;
BEGIN
  -- Goals due today/tomorrow notifications
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT g.user_id, 'Meta próxima do prazo 🎯',
    'A meta "' || g.title || '" vence ' ||
    CASE WHEN g.target_date = CURRENT_DATE THEN 'hoje' ELSE 'amanhã' END || '.',
    '/planner'
  FROM public.planner_goals g
  WHERE g.completed = false
    AND g.target_date IN (CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = g.user_id
        AND n.title = 'Meta próxima do prazo 🎯'
        AND n.message LIKE '%' || g.title || '%'
        AND n.created_at::date = CURRENT_DATE
    );

  -- Active study cycle reminder (in-app): ONE notification per user per day (Brasília time).
  -- Pick a single active cycle per user and only notify if the user has NOT already
  -- received a study cycle reminder today, regardless of read status.
  FOR rec IN
    SELECT DISTINCT ON (sc.user_id)
      sc.user_id,
      sc.name,
      '🎯 Você tem um ciclo de estudos ativo: "' || sc.name || '". Bora começar?' AS message
    FROM public.study_cycles sc
    WHERE sc.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM public.notifications n
        WHERE n.user_id = sc.user_id
          AND n.title = 'Hora de estudar 🎯'
          AND (n.created_at AT TIME ZONE v_tz)::date = (now() AT TIME ZONE v_tz)::date
      )
    ORDER BY sc.user_id, sc.created_at DESC
  LOOP
    INSERT INTO public.notifications (user_id, title, message, link)
    VALUES (rec.user_id, 'Hora de estudar 🎯', rec.message, '/estudos/ciclo');

    -- Push notification for the same cycle reminder that was just created.
    BEGIN
      SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
      SELECT decrypted_secret INTO v_service_role_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

      IF v_supabase_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
        PERFORM net.http_post(
          url := v_supabase_url || '/functions/v1/send-push',
          body := json_build_object('userId', rec.user_id, 'title', 'Hora de estudar 🎯',
            'body', rec.message, 'url', '/estudos/ciclo')::jsonb,
          headers := json_build_object('Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_role_key)::jsonb
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$$;