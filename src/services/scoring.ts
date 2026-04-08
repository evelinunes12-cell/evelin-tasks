import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

/**
 * Logs XP points for a user action via secure server-side function.
 * Points are validated and assigned server-side to prevent manipulation.
 * Fire-and-forget: does not block UI.
 */
export const logXP = (userId: string, actionType: string, _points?: number) => {
  if (!userId) return;

  // Call the SECURITY DEFINER function that validates action type and assigns correct points
  supabase.rpc("log_user_xp", { p_action_type: actionType }).then(({ error }) => {
    if (error) logError("Erro ao registrar XP", error);
  });
};

// XP Constants (kept for reference/display purposes only - actual values enforced server-side)
export const XP = {
  TASK_COMPLETED: 50,
  POMODORO_COMPLETED: 50,
  STUDY_BLOCK_COMPLETED: 50,
  GOAL_NOTE_COMPLETED: 30,
  CREATE_ITEM: 15,
  CHECKLIST_UPDATE: 5,
  STATUS_CHANGE: 3,
  EDIT_BASIC: 3,
  LOGIN: 1,
} as const;
