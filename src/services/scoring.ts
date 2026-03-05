import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

/**
 * Logs XP points for a user action asynchronously.
 * Fire-and-forget: does not block UI.
 */
export const logXP = (userId: string, actionType: string, points: number) => {
  if (!userId || points <= 0) return;

  // Fire-and-forget async insert
  supabase
    .from("user_xp_logs" as any)
    .insert({ user_id: userId, action_type: actionType, points } as any)
    .then(({ error }) => {
      if (error) logError("Erro ao registrar XP", error);
    });
};

// XP Constants
export const XP = {
  TASK_COMPLETED: 50,
  POMODORO_COMPLETED: 50,
  STUDY_BLOCK_COMPLETED: 50,
  GOAL_NOTE_COMPLETED: 40,
  CREATE_ITEM: 15,
  CHECKLIST_UPDATE: 5,
  STATUS_CHANGE: 2,
  EDIT_BASIC: 2,
  LOGIN: 1,
} as const;
