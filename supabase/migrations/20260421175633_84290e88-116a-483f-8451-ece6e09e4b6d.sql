CREATE OR REPLACE FUNCTION public.log_user_xp(p_action_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_user_id uuid;
  v_today_total integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_points := CASE p_action_type
    WHEN 'task_completed' THEN 50
    WHEN 'pomodoro_completed' THEN 50
    WHEN 'study_block_completed' THEN 50
    WHEN 'goal_note_completed' THEN 40
    WHEN 'create_item' THEN 15
    WHEN 'create_task' THEN 15
    WHEN 'create_note' THEN 15
    WHEN 'create_goal' THEN 15
    WHEN 'create_cycle' THEN 15
    WHEN 'create_schedule' THEN 15
    WHEN 'checklist_update' THEN 5
    WHEN 'checklist_item_added' THEN 1
    WHEN 'status_change' THEN 2
    WHEN 'edit_basic' THEN 2
    WHEN 'login' THEN 1
    ELSE NULL
  END;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Invalid action type: %', p_action_type;
  END IF;

  -- Daily cap: max 20 XP/day for checklist_item_added
  IF p_action_type = 'checklist_item_added' THEN
    SELECT COALESCE(SUM(points), 0) INTO v_today_total
    FROM public.user_xp_logs
    WHERE user_id = v_user_id
      AND action_type = 'checklist_item_added'
      AND created_at >= date_trunc('day', now());

    IF v_today_total >= 20 THEN
      RETURN; -- silently skip; cap reached
    END IF;
  END IF;

  INSERT INTO public.user_xp_logs (user_id, action_type, points)
  VALUES (v_user_id, p_action_type, v_points);
END;
$$;