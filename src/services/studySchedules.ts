import { supabase } from "@/integrations/supabase/client";

export interface StudySchedule {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  title: string;
  type: "fixed" | "variable";
  color: string | null;
  created_at: string;
}

export const fetchStudySchedules = async (userId: string) => {
  const { data, error } = await supabase
    .from("study_schedules" as any)
    .select("*")
    .eq("user_id", userId)
    .order("day_of_week")
    .order("start_time");

  if (error) throw error;
  return (data || []) as unknown as StudySchedule[];
};

export const createStudySchedule = async (
  schedule: Omit<StudySchedule, "id" | "created_at">
) => {
  const { data, error } = await supabase
    .from("study_schedules" as any)
    .insert(schedule as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as StudySchedule;
};

export const createMultipleStudySchedules = async (
  schedules: Omit<StudySchedule, "id" | "created_at">[]
) => {
  const { data, error } = await supabase
    .from("study_schedules" as any)
    .insert(schedules as any)
    .select();

  if (error) throw error;
  return (data || []) as unknown as StudySchedule[];
};

export const updateStudySchedule = async (
  id: string,
  updates: Partial<Omit<StudySchedule, "id" | "user_id" | "created_at">>
) => {
  const { data, error } = await supabase
    .from("study_schedules" as any)
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as StudySchedule;
};

export const deleteStudySchedule = async (id: string) => {
  const { error } = await supabase
    .from("study_schedules" as any)
    .delete()
    .eq("id", id);

  if (error) throw error;
};
