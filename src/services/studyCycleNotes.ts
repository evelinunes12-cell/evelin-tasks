import { supabase } from "@/integrations/supabase/client";

export interface StudyCycleNote {
  id: string;
  user_id: string;
  cycle_id: string;
  subject_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  subject?: { name: string; color: string | null } | null;
  cycle?: { name: string } | null;
}

export interface NewCycleNote {
  cycle_id: string;
  subject_id?: string | null;
  title: string;
  content: string;
}

export const fetchCycleNotes = async (): Promise<StudyCycleNote[]> => {
  const { data, error } = await supabase
    .from("study_cycle_notes")
    .select("*, subjects(name, color), study_cycles(name)")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((n: any) => ({
    id: n.id,
    user_id: n.user_id,
    cycle_id: n.cycle_id,
    subject_id: n.subject_id,
    title: n.title,
    content: n.content,
    created_at: n.created_at,
    updated_at: n.updated_at,
    subject: n.subjects || null,
    cycle: n.study_cycles || null,
  }));
};

export const createCycleNote = async (
  userId: string,
  note: NewCycleNote
): Promise<StudyCycleNote> => {
  const { data, error } = await supabase
    .from("study_cycle_notes")
    .insert({
      user_id: userId,
      cycle_id: note.cycle_id,
      subject_id: note.subject_id ?? null,
      title: note.title,
      content: note.content,
    })
    .select()
    .single();

  if (error) throw error;
  return data as StudyCycleNote;
};

export const updateCycleNote = async (
  noteId: string,
  note: Partial<NewCycleNote>
) => {
  const { error } = await supabase
    .from("study_cycle_notes")
    .update({
      ...(note.cycle_id != null ? { cycle_id: note.cycle_id } : {}),
      ...(note.subject_id !== undefined ? { subject_id: note.subject_id } : {}),
      ...(note.title != null ? { title: note.title } : {}),
      ...(note.content != null ? { content: note.content } : {}),
    })
    .eq("id", noteId);

  if (error) throw error;
};

export const deleteCycleNote = async (noteId: string) => {
  const { error } = await supabase
    .from("study_cycle_notes")
    .delete()
    .eq("id", noteId);

  if (error) throw error;
};
