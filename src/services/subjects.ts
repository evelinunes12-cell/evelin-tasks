import { supabase } from "@/integrations/supabase/client";

export interface Subject {
  id: string;
  name: string;
  color: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const fetchSubjects = async () => {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("name");
  
  if (error) throw error;
  return data as Subject[];
};

export const fetchSubjectNames = async () => {
  const { data, error } = await supabase
    .from("subjects")
    .select("name")
    .order("name");
  
  if (error) throw error;
  return data.map(s => s.name);
};

export const ensureSubjectExists = async (
  subjectName: string,
  userId: string
) => {
  // Check if subject already exists
  const { data: existingSubject } = await supabase
    .from("subjects")
    .select("id")
    .eq("name", subjectName)
    .eq("user_id", userId)
    .single();

  // Create if doesn't exist
  if (!existingSubject) {
    const { error } = await supabase
      .from("subjects")
      .insert({
        name: subjectName,
        user_id: userId,
        color: null,
      });
    
    if (error) throw error;
  }
};

export const createSubject = async (
  name: string,
  userId: string,
  color?: string
) => {
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name,
      user_id: userId,
      color: color || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Subject;
};

export const updateSubject = async (
  id: string,
  updates: { name?: string; color?: string | null }
) => {
  const { error } = await supabase
    .from("subjects")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteSubject = async (id: string) => {
  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
};
