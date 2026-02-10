import { supabase } from "@/integrations/supabase/client";

export interface PlannerNote {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  content: string;
  color: string | null;
  pinned: boolean;
  planned_date: string | null;
  created_at: string;
  updated_at: string;
  subject?: { name: string; color: string | null } | null;
}

export interface PlannerGoal {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  target_date: string | null;
  progress: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
  subject?: { name: string; color: string | null } | null;
}

// ---- Notes ----

export const fetchNotes = async () => {
  const { data, error } = await supabase
    .from("planner_notes")
    .select("*, subject:subjects(name, color)")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as PlannerNote[];
};

export const fetchNotesByDate = async (date: string) => {
  const { data, error } = await supabase
    .from("planner_notes")
    .select("*, subject:subjects(name, color)")
    .eq("planned_date", date)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as PlannerNote[];
};

export const fetchGoalsForWeek = async (startDate: string, endDate: string) => {
  const { data, error } = await supabase
    .from("planner_goals")
    .select("*, subject:subjects(name, color)")
    .gte("target_date", startDate)
    .lte("target_date", endDate)
    .order("target_date")
    .order("completed");

  if (error) throw error;
  return data as PlannerGoal[];
};

export const fetchNotesForWeek = async (startDate: string, endDate: string) => {
  const { data, error } = await supabase
    .from("planner_notes")
    .select("*, subject:subjects(name, color)")
    .gte("planned_date", startDate)
    .lte("planned_date", endDate)
    .order("planned_date")
    .order("pinned", { ascending: false });

  if (error) throw error;
  return data as PlannerNote[];
};

export const createNote = async (
  userId: string,
  note: {
    title: string;
    content: string;
    subject_id?: string | null;
    color?: string | null;
    planned_date?: string | null;
    pinned?: boolean;
  }
) => {
  const { data, error } = await supabase
    .from("planner_notes")
    .insert({ user_id: userId, ...note })
    .select("*, subject:subjects(name, color)")
    .single();

  if (error) throw error;
  return data as PlannerNote;
};

export const updateNote = async (
  id: string,
  updates: Partial<{
    title: string;
    content: string;
    subject_id: string | null;
    color: string | null;
    planned_date: string | null;
    pinned: boolean;
  }>
) => {
  const { data, error } = await supabase
    .from("planner_notes")
    .update(updates)
    .eq("id", id)
    .select("*, subject:subjects(name, color)")
    .single();

  if (error) throw error;
  return data as PlannerNote;
};

export const deleteNote = async (id: string) => {
  const { error } = await supabase
    .from("planner_notes")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

// ---- Goals ----

export const fetchGoals = async () => {
  const { data, error } = await supabase
    .from("planner_goals")
    .select("*, subject:subjects(name, color)")
    .order("completed")
    .order("target_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as PlannerGoal[];
};

export const createGoal = async (
  userId: string,
  goal: {
    title: string;
    description?: string | null;
    subject_id?: string | null;
    target_date?: string | null;
  }
) => {
  const { data, error } = await supabase
    .from("planner_goals")
    .insert({ user_id: userId, ...goal })
    .select("*, subject:subjects(name, color)")
    .single();

  if (error) throw error;
  return data as PlannerGoal;
};

export const updateGoal = async (
  id: string,
  updates: Partial<{
    title: string;
    description: string | null;
    subject_id: string | null;
    target_date: string | null;
    progress: number;
    completed: boolean;
  }>
) => {
  const { data, error } = await supabase
    .from("planner_goals")
    .update(updates)
    .eq("id", id)
    .select("*, subject:subjects(name, color)")
    .single();

  if (error) throw error;
  return data as PlannerGoal;
};

export const deleteGoal = async (id: string) => {
  const { error } = await supabase
    .from("planner_goals")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
