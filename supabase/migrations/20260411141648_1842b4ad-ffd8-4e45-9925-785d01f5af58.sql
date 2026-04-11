
-- check_overdue_tasks: respect tasks_system preference
CREATE OR REPLACE FUNCTION public.check_overdue_tasks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
END;
$function$;

-- check_upcoming_tasks: respect tasks_system preference
CREATE OR REPLACE FUNCTION public.check_upcoming_tasks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
END;
$function$;

-- check_planner_notifications: respect goals_system and notes_system preferences
CREATE OR REPLACE FUNCTION public.check_planner_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
