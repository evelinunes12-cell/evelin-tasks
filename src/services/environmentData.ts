import { supabase } from "@/integrations/supabase/client";

export interface EnvironmentSubject {
  id: string;
  environment_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentStatus {
  id: string;
  environment_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export const fetchEnvironmentSubjects = async (environmentId: string) => {
  const { data, error } = await supabase
    .from("environment_subjects")
    .select("*")
    .eq("environment_id", environmentId)
    .order("name");

  if (error) throw error;
  return data as EnvironmentSubject[];
};

export const fetchEnvironmentStatuses = async (environmentId: string) => {
  const { data, error } = await supabase
    .from("environment_statuses")
    .select("*")
    .eq("environment_id", environmentId)
    .order("name");

  if (error) throw error;
  return data as EnvironmentStatus[];
};

export const createEnvironmentSubject = async (
  environmentId: string,
  name: string,
  color?: string | null
) => {
  const { data, error } = await supabase
    .from("environment_subjects")
    .insert({
      environment_id: environmentId,
      name,
      color: color || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as EnvironmentSubject;
};

export const createEnvironmentStatus = async (
  environmentId: string,
  name: string,
  color?: string | null
) => {
  const { data, error } = await supabase
    .from("environment_statuses")
    .insert({
      environment_id: environmentId,
      name,
      color: color || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as EnvironmentStatus;
};

export const updateEnvironmentSubject = async (
  id: string,
  updates: { name?: string; color?: string | null }
) => {
  const { error } = await supabase
    .from("environment_subjects")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
};

export const updateEnvironmentStatus = async (
  id: string,
  updates: { name?: string; color?: string | null }
) => {
  const { error } = await supabase
    .from("environment_statuses")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
};

export const deleteEnvironmentSubject = async (id: string) => {
  const { error } = await supabase
    .from("environment_subjects")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

export const deleteEnvironmentStatus = async (id: string) => {
  const { error } = await supabase
    .from("environment_statuses")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
