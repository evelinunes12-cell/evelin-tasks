import { supabase } from "@/integrations/supabase/client";

export interface Invite {
  id: string;
  token: string;
  type: "group" | "signup";
  environment_id: string | null;
  created_by: string;
  expires_at: string;
  max_uses: number;
  uses_count: number;
  revoked: boolean;
  created_at: string;
}

export interface InviteUse {
  id: string;
  invite_id: string;
  used_by: string;
  used_at: string;
}

export interface InviteValidation {
  valid: boolean;
  error?: string;
  type?: string;
  environment_id?: string;
  environment_name?: string;
}

export interface InviteConsumption {
  success: boolean;
  error?: string;
  type?: string;
  environment_id?: string;
}

export const createGroupInvite = async (
  environmentId: string,
  createdBy: string,
  options?: { maxUses?: number; expiresInDays?: number }
): Promise<Invite> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (options?.expiresInDays || 7));

  const { data, error } = await supabase
    .from("invites")
    .insert({
      type: "group",
      environment_id: environmentId,
      created_by: createdBy,
      max_uses: options?.maxUses ?? 0, // 0 = unlimited
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Invite;
};

export const createSignupInvite = async (
  createdBy: string,
  environmentId?: string,
  options?: { maxUses?: number; expiresInDays?: number }
): Promise<Invite> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (options?.expiresInDays || 7));

  const { data, error } = await supabase
    .from("invites")
    .insert({
      type: "signup",
      created_by: createdBy,
      max_uses: options?.maxUses ?? 0,
      expires_at: expiresAt.toISOString(),
      environment_id: environmentId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Invite;
};

export const fetchEnvironmentInvites = async (environmentId: string): Promise<Invite[]> => {
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("environment_id", environmentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Invite[];
};

export const revokeInvite = async (inviteId: string): Promise<void> => {
  const { error } = await supabase
    .from("invites")
    .update({ revoked: true })
    .eq("id", inviteId);

  if (error) throw error;
};

export const deleteInvite = async (inviteId: string): Promise<void> => {
  const { error } = await supabase
    .from("invites")
    .delete()
    .eq("id", inviteId);

  if (error) throw error;
};

export const validateInvite = async (token: string): Promise<InviteValidation> => {
  const { data, error } = await supabase.rpc("validate_invite", {
    invite_token: token,
  });

  if (error) throw error;
  return data as unknown as InviteValidation;
};

export const consumeInvite = async (token: string): Promise<InviteConsumption> => {
  const { data, error } = await supabase.rpc("consume_invite", {
    invite_token: token,
  });

  if (error) throw error;
  return data as unknown as InviteConsumption;
};

export const fetchInviteUses = async (inviteId: string): Promise<InviteUse[]> => {
  const { data, error } = await supabase
    .from("invite_uses")
    .select("*")
    .eq("invite_id", inviteId)
    .order("used_at", { ascending: false });

  if (error) throw error;
  return (data || []) as InviteUse[];
};

export const buildInviteLink = (token: string): string => {
  return `${window.location.origin}/invite/${token}`;
};
