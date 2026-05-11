CREATE OR REPLACE FUNCTION public.log_xp_for_task_assignees(
  p_task_id uuid,
  p_action_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_points integer;
  v_assignee record;
  v_today_total integer;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure caller can access this task (uses existing helper)
  IF NOT public.can_access_environment_task(p_task_id, v_caller) THEN
    RAISE EXCEPTION 'Access denied to task';
  END IF;

  v_points := CASE p_action_type
    WHEN 'task_completed' THEN 50
    WHEN 'checklist_update' THEN 5
    WHEN 'checklist_item_added' THEN 1
    WHEN 'status_change' THEN 2
    WHEN 'edit_basic' THEN 2
    ELSE NULL
  END;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Invalid action type for assignee XP: %', p_action_type;
  END IF;

  FOR v_assignee IN
    SELECT user_id FROM public.task_assignees
    WHERE task_id = p_task_id AND user_id <> v_caller
  LOOP
    -- Per-user daily cap for checklist_item_added (20 XP/day)
    IF p_action_type = 'checklist_item_added' THEN
      SELECT COALESCE(SUM(points), 0) INTO v_today_total
      FROM public.user_xp_logs
      WHERE user_id = v_assignee.user_id
        AND action_type = 'checklist_item_added'
        AND created_at >= date_trunc('day', now());

      IF v_today_total >= 20 THEN
        CONTINUE;
      END IF;
    END IF;

    INSERT INTO public.user_xp_logs (user_id, action_type, points)
    VALUES (v_assignee.user_id, p_action_type, v_points);
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.log_xp_for_task_assignees(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_xp_for_task_assignees(uuid, text) TO authenticated;