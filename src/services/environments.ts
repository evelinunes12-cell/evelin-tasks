import { supabase } from "@/integrations/supabase/client";

export interface Environment {
  id: string;
  environment_name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentMember {
  id: string;
  environment_id: string;
  email: string;
  user_id: string | null;
  permissions: ("view" | "create" | "edit" | "delete")[];
  created_at: string;
}

export const fetchEnvironments = async () => {
  const { data, error } = await supabase
    .from("shared_environments")
    .select("id, environment_name")
    .order("environment_name");
  
  if (error) throw error;
  return data as Pick<Environment, "id" | "environment_name">[];
};

export const fetchEnvironmentById = async (id: string) => {
  const { data, error } = await supabase
    .from("shared_environments")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) throw error;
  return data as Environment;
};

export const fetchEnvironmentMembers = async (environmentId: string) => {
  const { data, error } = await supabase
    .from("environment_members")
    .select("*")
    .eq("environment_id", environmentId);
  
  if (error) throw error;
  return data as EnvironmentMember[];
};

export const createEnvironment = async (
  name: string,
  description: string | null,
  ownerId: string
) => {
  const { data, error } = await supabase
    .from("shared_environments")
    .insert({
      environment_name: name,
      description,
      owner_id: ownerId,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Environment;
};

export const updateEnvironment = async (
  id: string,
  updates: { environment_name?: string; description?: string | null }
) => {
  const { error } = await supabase
    .from("shared_environments")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteEnvironment = async (id: string) => {
  const { error } = await supabase
    .from("shared_environments")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
};

export const addEnvironmentMember = async (
  environmentId: string,
  email: string,
  permissions: ("view" | "create" | "edit" | "delete")[]
) => {
  const { data, error } = await supabase
    .from("environment_members")
    .insert({
      environment_id: environmentId,
      email,
      user_id: null,
      permissions,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as EnvironmentMember;
};

export const updateEnvironmentMember = async (
  memberId: string,
  permissions: ("view" | "create" | "edit" | "delete")[]
) => {
  const { error } = await supabase
    .from("environment_members")
    .update({ permissions })
    .eq("id", memberId);
  
  if (error) throw error;
};

export const removeEnvironmentMember = async (memberId: string) => {
  const { error } = await supabase
    .from("environment_members")
    .delete()
    .eq("id", memberId);
  
  if (error) throw error;
};

export const syncEnvironmentMembers = async (
  environmentId: string,
  members: { email: string; permissions: ("view" | "create" | "edit" | "delete")[] }[]
) => {
  // Get existing members
  const { data: existingMembers } = await supabase
    .from("environment_members")
    .select("email")
    .eq("environment_id", environmentId);

  const existingEmails = existingMembers?.map(m => m.email) || [];
  const newEmails = members.map(m => m.email);

  // Delete removed members
  const emailsToDelete = existingEmails.filter(email => !newEmails.includes(email));
  if (emailsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("environment_members")
      .delete()
      .eq("environment_id", environmentId)
      .in("email", emailsToDelete);

    if (deleteError) throw deleteError;
  }

  // Add new members
  const membersToAdd = members.filter(m => !existingEmails.includes(m.email));
  if (membersToAdd.length > 0) {
    const { error: insertError } = await supabase
      .from("environment_members")
      .insert(
        membersToAdd.map(m => ({
          environment_id: environmentId,
          email: m.email,
          user_id: null,
          permissions: m.permissions,
        }))
      );

    if (insertError) throw insertError;
  }
};
