import { supabase } from "@/integrations/supabase/client";

export const archiveTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({ is_archived: true })
    .eq("id", taskId);
  
  if (error) throw error;
};

export const unarchiveTask = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({ is_archived: false })
    .eq("id", taskId);
  
  if (error) throw error;
};

export const fetchArchivedTasks = async () => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("is_archived", true)
    .order("updated_at", { ascending: false });
  
  if (error) throw error;
  return data || [];
};
