
CREATE OR REPLACE FUNCTION public.check_planner_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- === SCHEDULES: starting within the next 15 minutes (only if schedules_system enabled) ===
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT
    s.user_id,
    'Horário em breve ⏰',
    '⏰ ' || s.title || ' começa às ' || to_char(s.start_time, 'HH24:MI'),
    '/planner'
  FROM public.study_schedules s
  WHERE s.day_of_week = extract(dow FROM now())::int
    AND s.start_time BETWEEN (now()::time) AND (now()::time + interval '15 minutes')
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = s.user_id
        AND n.title = 'Horário em breve ⏰'
        AND n.message = '⏰ ' || s.title || ' começa às ' || to_char(s.start_time, 'HH24:MI')
        AND n.created_at::date = CURRENT_DATE
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = s.user_id AND np.schedules_system = false
    );

  -- === GOALS: due today (only if goals_system enabled) ===
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT
    g.user_id,
    'Meta para Hoje 📅',
    '📅 Meta para hoje: ' || g.title || '. Vamos cumprir?',
    '/planner'
  FROM public.planner_goals g
  WHERE g.target_date = CURRENT_DATE
    AND g.completed = false
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = g.user_id
        AND n.title = 'Meta para Hoje 📅'
        AND n.message = '📅 Meta para hoje: ' || g.title || '. Vamos cumprir?'
        AND n.created_at::date = CURRENT_DATE
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = g.user_id AND np.goals_system = false
    );

  -- === GOALS: overdue (yesterday) ===
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT
    g.user_id,
    'Meta Atrasada ⚠️',
    '⚠️ A meta "' || g.title || '" venceu ontem. Não esqueça de atualizar!',
    '/planner'
  FROM public.planner_goals g
  WHERE g.target_date = CURRENT_DATE - 1
    AND g.completed = false
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = g.user_id
        AND n.title = 'Meta Atrasada ⚠️'
        AND n.message = '⚠️ A meta "' || g.title || '" venceu ontem. Não esqueça de atualizar!'
        AND n.created_at::date = CURRENT_DATE
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = g.user_id AND np.goals_system = false
    );

  -- === NOTES: planned for today (only if notes_system enabled) ===
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT
    n2.user_id,
    'Anotação para Hoje 📝',
    '📝 Anotação para hoje: ' || n2.title || '. Vamos cumprir?',
    '/planner'
  FROM public.planner_notes n2
  WHERE n2.planned_date = CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = n2.user_id
        AND n.title = 'Anotação para Hoje 📝'
        AND n.message = '📝 Anotação para hoje: ' || n2.title || '. Vamos cumprir?'
        AND n.created_at::date = CURRENT_DATE
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = n2.user_id AND np.notes_system = false
    );

  -- === NOTES: overdue (yesterday) ===
  INSERT INTO public.notifications (user_id, title, message, link)
  SELECT
    n2.user_id,
    'Anotação Atrasada ⚠️',
    '⚠️ A anotação "' || n2.title || '" venceu ontem. Não esqueça de atualizar!',
    '/planner'
  FROM public.planner_notes n2
  WHERE n2.planned_date = CURRENT_DATE - 1
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = n2.user_id
        AND n.title = 'Anotação Atrasada ⚠️'
        AND n.message = '⚠️ A anotação "' || n2.title || '" venceu ontem. Não esqueça de atualizar!'
        AND n.created_at::date = CURRENT_DATE
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = n2.user_id AND np.notes_system = false
    );
END;
$function$;
