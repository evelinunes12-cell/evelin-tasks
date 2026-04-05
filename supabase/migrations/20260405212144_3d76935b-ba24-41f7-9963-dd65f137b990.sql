
-- 1. SECURITY DEFINER function for XP logging with validated points
CREATE OR REPLACE FUNCTION public.log_user_xp(p_action_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_user_id uuid;
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
    WHEN 'status_change' THEN 2
    WHEN 'edit_basic' THEN 2
    WHEN 'login' THEN 1
    ELSE NULL
  END;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Invalid action type: %', p_action_type;
  END IF;

  INSERT INTO public.user_xp_logs (user_id, action_type, points)
  VALUES (v_user_id, p_action_type, v_points);
END;
$$;

-- 2. SECURITY DEFINER function for achievement unlocking with validation
CREATE OR REPLACE FUNCTION public.unlock_user_achievement(p_achievement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_required_value integer;
  v_current_streak integer;
  v_achievement_title text;
  v_onboarding_completed boolean;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT required_value, title INTO v_required_value, v_achievement_title
  FROM public.achievements
  WHERE id = p_achievement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not found';
  END IF;

  -- Already unlocked? Silently return
  IF EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = v_user_id AND achievement_id = p_achievement_id
  ) THEN
    RETURN;
  END IF;

  -- Validate criteria
  IF v_achievement_title = 'Pioneiro' THEN
    SELECT onboarding_completed INTO v_onboarding_completed
    FROM public.profiles WHERE id = v_user_id;
    IF NOT COALESCE(v_onboarding_completed, false) THEN
      RAISE EXCEPTION 'Achievement criteria not met';
    END IF;
  ELSE
    SELECT COALESCE(current_streak, 0) INTO v_current_streak
    FROM public.profiles WHERE id = v_user_id;
    IF v_current_streak < v_required_value THEN
      RAISE EXCEPTION 'Achievement criteria not met';
    END IF;
  END IF;

  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (v_user_id, p_achievement_id);
END;
$$;

-- 3. SECURITY DEFINER function for streak reset (delete non-permanent achievements)
CREATE OR REPLACE FUNCTION public.reset_streak_achievements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.user_achievements
  WHERE user_id = v_user_id
    AND achievement_id NOT IN (
      SELECT id FROM public.achievements WHERE title = 'Pioneiro'
    );
END;
$$;

-- 4. Remove direct INSERT policy from user_xp_logs
DROP POLICY IF EXISTS "Users can insert own xp logs" ON public.user_xp_logs;

-- 5. Remove direct INSERT policy from user_achievements
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;

-- 6. Add DELETE policy for user_achievements (needed for streak-based removal via SECURITY DEFINER)
-- The reset_streak_achievements function uses SECURITY DEFINER so no direct DELETE policy needed
-- But let's also ensure the AchievementUnlockChecker removal path works via the function
