import { supabase } from "@/integrations/supabase/client";

export type StudyGroupRole = "admin" | "member";

export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface StudyGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: StudyGroupRole;
  share_status: boolean;
  share_metrics: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    email: string;
  };
}

export interface StudyGroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface RankingRow {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  total_minutes: number;
  shares_metrics: boolean;
}

export async function listMyStudyGroups(): Promise<(StudyGroup & { member_count: number; sample_avatars: string[] })[]> {
  const { data, error } = await supabase
    .from("study_groups")
    .select("*, study_group_members(user_id, profiles:user_id(avatar_url))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    created_by: g.created_by,
    created_at: g.created_at,
    member_count: g.study_group_members?.length ?? 0,
    sample_avatars: (g.study_group_members ?? [])
      .slice(0, 4)
      .map((m: any) => m.profiles?.avatar_url)
      .filter(Boolean),
  }));
}

export async function createStudyGroup(name: string, description: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("study_groups")
    .insert({ name, description: description || null, created_by: auth.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getStudyGroup(id: string) {
  const { data, error } = await supabase.from("study_groups").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listGroupMembers(groupId: string): Promise<StudyGroupMember[]> {
  const { data, error } = await supabase
    .from("study_group_members")
    .select("*, profile:profiles!study_group_members_user_id_fkey(full_name, username, avatar_url, email)")
    .eq("group_id", groupId);
  if (error) {
    // fallback without explicit FK name
    const fb = await supabase
      .from("study_group_members")
      .select("*, profile:user_id(full_name, username, avatar_url, email)")
      .eq("group_id", groupId);
    if (fb.error) throw fb.error;
    return (fb.data as any) ?? [];
  }
  return (data as any) ?? [];
}

export async function updateMyMemberPrefs(
  memberId: string,
  prefs: { share_status?: boolean; share_metrics?: boolean }
) {
  const { error } = await supabase.from("study_group_members").update(prefs).eq("id", memberId);
  if (error) throw error;
}

export async function leaveGroup(memberId: string) {
  const { error } = await supabase.from("study_group_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from("study_groups").delete().eq("id", groupId);
  if (error) throw error;
}

export async function addMemberByIdentifier(groupId: string, identifier: string) {
  const id = identifier.trim().replace(/^@/, "");
  if (!id) throw new Error("Informe email ou @username");
  // Try email first if contains @, else username
  let userId: string | null = null;
  if (id.includes("@") && id.includes(".")) {
    const { data } = await supabase.from("profiles").select("id").eq("email", id).maybeSingle();
    userId = data?.id ?? null;
  }
  if (!userId) {
    const { data } = await supabase.from("profiles").select("id").eq("username", id).maybeSingle();
    userId = data?.id ?? null;
  }
  if (!userId) throw new Error("Usuário não encontrado");

  const { error } = await supabase
    .from("study_group_members")
    .insert({ group_id: groupId, user_id: userId, role: "member" });
  if (error) {
    if (error.code === "23505") throw new Error("Este usuário já é membro do grupo");
    throw error;
  }
}

export async function removeMember(memberId: string) {
  const { error } = await supabase.from("study_group_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function listMessages(groupId: string, limit = 100): Promise<StudyGroupMessage[]> {
  const { data, error } = await supabase
    .from("study_group_messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function sendMessage(groupId: string, content: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");
  const trimmed = content.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from("study_group_messages")
    .insert({ group_id: groupId, user_id: auth.user.id, content: trimmed.slice(0, 2000) });
  if (error) throw error;
}

export async function getWeeklyRanking(groupId: string): Promise<RankingRow[]> {
  const { data, error } = await supabase.rpc("get_study_group_weekly_ranking", { p_group_id: groupId });
  if (error) throw error;
  return (data as any) ?? [];
}
