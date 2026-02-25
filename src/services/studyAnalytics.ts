import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

export interface FocusSessionWithDetails {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  created_at: string;
  subject_id: string | null;
  subject_name: string | null;
  subject_color: string | null;
  study_cycle_id: string | null;
  study_cycle_name: string | null;
}

export const fetchFocusSessionsWithDetails = async (
  userId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<FocusSessionWithDetails[]> => {
  if (!userId) return [];

  try {
    let query = supabase
      .from("focus_sessions")
      .select("*, subjects(name, color), study_cycles(name)")
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
      study_cycle_id: s.study_cycle_id,
      study_cycle_name: s.study_cycles?.name ?? null,
    }));
  } catch (error) {
    logError("Erro ao buscar sessões com detalhes", error);
    return [];
  }
};

// Keep backward compat export
export type FocusSessionWithSubject = FocusSessionWithDetails;
export const fetchFocusSessionsWithSubjects = fetchFocusSessionsWithDetails;
