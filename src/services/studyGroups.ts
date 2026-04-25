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

export interface MemberPreview {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

// ---- Member previews cache (TTL em memória) -------------------------------
type PreviewEntry = { count: number; members: MemberPreview[] };
const PREVIEW_TTL_MS = 60_000; // 1 minuto
const previewCache = new Map<string, { data: PreviewEntry; expiresAt: number }>();
const inflight = new Map<string, Promise<void>>();

export function invalidateGroupPreviewCache(groupId?: string) {
  if (groupId) previewCache.delete(groupId);
  else previewCache.clear();
}

async function fetchPreviewsFromRpc(groupIds: string[]): Promise<Map<string, PreviewEntry>> {
  const result = new Map<string, PreviewEntry>();
  if (groupIds.length === 0) return result;
  const { data: previews, error } = await supabase.rpc(
    "get_study_groups_member_previews",
    { p_group_ids: groupIds, p_limit_per_group: 4 }
  );
  if (error) throw error;
  groupIds.forEach((id) => result.set(id, { count: 0, members: [] }));
  ((previews as any[]) ?? []).forEach((r) => {
    const entry = result.get(r.group_id) ?? { count: 0, members: [] };
    entry.count = Number(r.member_count) || entry.count;
    entry.members.push({
      user_id: r.user_id,
      full_name: r.full_name,
      username: r.username,
      avatar_url: r.avatar_url,
    });
    result.set(r.group_id, entry);
  });
  return result;
}

async function getMemberPreviewsCached(
  groupIds: string[]
): Promise<Map<string, PreviewEntry>> {
  const now = Date.now();
  const out = new Map<string, PreviewEntry>();
  const stale: string[] = [];

  for (const id of groupIds) {
    const cached = previewCache.get(id);
    if (cached && cached.expiresAt > now) {
      out.set(id, cached.data);
    } else {
      stale.push(id);
    }
  }

  if (stale.length === 0) return out;

  // Deduplica fetches concorrentes pelo conjunto de ids
  const key = stale.slice().sort().join(",");
  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      const fresh = await fetchPreviewsFromRpc(stale);
      const expiresAt = Date.now() + PREVIEW_TTL_MS;
      fresh.forEach((data, id) => previewCache.set(id, { data, expiresAt }));
    })().finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  await pending;

  for (const id of stale) {
    const cached = previewCache.get(id);
    if (cached) out.set(id, cached.data);
  }
  return out;
}
// ---------------------------------------------------------------------------

export async function listMyStudyGroups(): Promise<
  (StudyGroup & { member_count: number; sample_members: MemberPreview[] })[]
> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  // 1) Memberships do usuário
  const { data: memberships, error: mErr } = await supabase
    .from("study_group_members")
    .select("group_id")
    .eq("user_id", auth.user.id);
  if (mErr) throw mErr;

  const groupIds = (memberships ?? []).map((m: any) => m.group_id);
  if (groupIds.length === 0) return [];

  // 2) Detalhes dos grupos
  const { data: groups, error: gErr } = await supabase
    .from("study_groups")
    .select("*")
    .in("id", groupIds)
    .order("created_at", { ascending: false });
  if (gErr) throw gErr;

  // 3) Prévias de membros + contagem — com cache em memória (TTL) por grupo
  const byGroup = await getMemberPreviewsCached(groupIds);

  return (groups ?? []).map((g: any) => {
    const entry = byGroup.get(g.id);
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      created_by: g.created_by,
      created_at: g.created_at,
      member_count: entry?.count ?? 0,
      sample_members: entry?.members ?? [],
    };
  });
}

export async function getStudyGroupsUnreadCounts(
  groupIds: string[]
): Promise<Record<string, number>> {
  if (groupIds.length === 0) return {};
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return {};

  const links = groupIds.map((id) => `/grupos-de-estudo/${id}`);
  const { data, error } = await supabase
    .from("notifications")
    .select("link")
    .eq("user_id", auth.user.id)
    .eq("read", false)
    .in("link", links);
  if (error) throw error;

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: any) => {
    const id = String(row.link).replace("/grupos-de-estudo/", "");
    counts[id] = (counts[id] ?? 0) + 1;
  });
  return counts;
}

export function normalizeStudyGroupName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

export async function createStudyGroup(name: string, description: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");

  const trimmedName = normalizeStudyGroupName(name);
  if (!trimmedName) throw new Error("Informe um nome para o grupo");
  if (trimmedName.length > 80) throw new Error("Nome deve ter no máximo 80 caracteres");

  // Pre-check: avoid duplicate name (case-insensitive) for the same creator
  const { data: existing } = await supabase
    .from("study_groups")
    .select("id")
    .eq("created_by", auth.user.id)
    .ilike("name", trimmedName)
    .maybeSingle();
  if (existing) {
    throw new Error("Você já tem um grupo com esse nome");
  }

  const id = crypto.randomUUID();
  const payload = {
    id,
    name: trimmedName,
    description: description?.trim() || null,
    created_by: auth.user.id,
  };

  const { error } = await supabase.from("study_groups").insert(payload);
  if (error) {
    if (error.code === "23505") throw new Error("Você já tem um grupo com esse nome");
    throw error;
  }

  return {
    ...payload,
    created_at: new Date().toISOString(),
  };
}

export async function getStudyGroup(id: string) {
  const { data, error } = await supabase.from("study_groups").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listGroupMembers(groupId: string): Promise<StudyGroupMember[]> {
  const { data, error } = await supabase.rpc("get_study_group_members", { p_group_id: groupId });
  if (error) throw error;
  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    group_id: r.group_id,
    user_id: r.user_id,
    role: r.role,
    share_status: r.share_status,
    share_metrics: r.share_metrics,
    created_at: r.created_at,
    profile: {
      full_name: r.full_name,
      username: r.username,
      avatar_url: r.avatar_url,
      email: r.email,
    },
  }));
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
