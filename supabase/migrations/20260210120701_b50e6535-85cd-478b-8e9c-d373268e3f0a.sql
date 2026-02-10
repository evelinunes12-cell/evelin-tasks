
-- Function to check planner notifications (goals and notes)
CREATE OR REPLACE FUNCTION public.check_planner_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- === GOALS: due today ===
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
    );

  -- === NOTES: planned for today ===
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
    );
END;
$$;
