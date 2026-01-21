import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

export interface FocusSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  created_at: string;
}

export const createFocusSession = async (
  userId: string,
  startedAt: Date,
  durationMinutes: number
): Promise<FocusSession | null> => {
  if (!userId) return null;

  try {
    const endedAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from("focus_sessions")
      .insert({
        user_id: userId,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logError("Erro ao criar sessão de foco", error);
    return null;
  }
};

export const fetchFocusSessions = async (
  userId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<FocusSession[]> => {
  if (!userId) return [];

  try {
    let query = supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    if (fromDate) {
      query = query.gte("started_at", fromDate.toISOString());
    }
    if (toDate) {
      query = query.lte("started_at", toDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    logError("Erro ao buscar sessões de foco", error);
    return [];
  }
};

export const getTotalFocusMinutes = async (
  userId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<number> => {
  const sessions = await fetchFocusSessions(userId, fromDate, toDate);
  return sessions.reduce((acc, session) => acc + session.duration_minutes, 0);
};
