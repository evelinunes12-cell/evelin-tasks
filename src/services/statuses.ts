import { supabase } from "@/integrations/supabase/client";
import { subjectStatusSchema } from "@/lib/validation";

export interface TaskStatus {
  id: string;
  name: string;
  color: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Validate status data before database operations
const validateStatus = (name: string, color?: string | null): void => {
  const validation = subjectStatusSchema.safeParse({ name, color: color || undefined });
  if (!validation.success) {
    throw new Error(validation.error.errors.map(e => e.message).join(', '));
  }
};

export const fetchStatuses = async () => {
  const { data, error } = await supabase
    .from("task_statuses")
    .select("*")
    .order("name");
  
  if (error) throw error;
  return data as TaskStatus[];
};

export const fetchStatusNames = async () => {
  const { data, error } = await supabase
    .from("task_statuses")
    .select("name, color")
    .order("name");
  
  if (error) throw error;
  return data;
};

export const ensureStatusExists = async (
  statusName: string,
  userId: string
) => {
  // Validate status name
  validateStatus(statusName);

  // Check if status already exists
  const { data: existingStatus } = await supabase
    .from("task_statuses")
    .select("id")
    .eq("name", statusName)
    .eq("user_id", userId)
    .single();

  // Create if doesn't exist
  if (!existingStatus) {
    const { error } = await supabase
      .from("task_statuses")
      .insert({
        name: statusName,
        user_id: userId,
        color: null,
      });
    
    if (error) throw error;
  }
};

export const createStatus = async (
  name: string,
  userId: string,
  color?: string
) => {
  // Validate status data
  validateStatus(name, color);

  const { data, error } = await supabase
    .from("task_statuses")
    .insert({
      name,
      user_id: userId,
      color: color || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as TaskStatus;
};

export const updateStatus = async (
  id: string,
  updates: { name?: string; color?: string | null }
) => {
  // Validate if name is being updated
  if (updates.name) {
    validateStatus(updates.name, updates.color);
  }

  const { error } = await supabase
    .from("task_statuses")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteStatus = async (id: string) => {
  const { error } = await supabase
    .from("task_statuses")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
};
