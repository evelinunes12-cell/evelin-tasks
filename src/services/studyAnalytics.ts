import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

export interface FocusSessionWithSubject {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  created_at: string;
  subject_id: string | null;
  subject_name: string | null;
  subject_color: string | null;
}

export const fetchFocusSessionsWithSubjects = async (
  userId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<FocusSessionWithSubject[]> => {
  if (!userId) return [];

  try {
    let query = supabase
      .from("focus_sessions")
      .select("*, subjects(name, color)")
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

    return (data || []).map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      started_at: s.started_at,
      ended_at: s.ended_at,
      duration_minutes: s.duration_minutes,
      created_at: s.created_at,
      subject_id: s.subject_id,
      subject_name: s.subjects?.name ?? null,
      subject_color: s.subjects?.color ?? null,
    }));
  } catch (error) {
    logError("Erro ao buscar sessões com disciplinas", error);
    return [];
  }
};
