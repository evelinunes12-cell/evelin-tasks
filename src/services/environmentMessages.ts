import { supabase } from "@/integrations/supabase/client";

export interface EnvironmentMessage {
  id: string;
  environment_id: string;
  user_id: string;
  content: string;
  created_at: string;
  reply_to_id?: string | null;
  thread_id?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  attachment_type?: string | null;
}

export interface OutgoingAttachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

export async function listEnvironmentMessages(
  environmentId: string,
  limit = 100
): Promise<EnvironmentMessage[]> {
  const { data, error } = await supabase
    .from("environment_messages")
    .select("*")
    .eq("environment_id", environmentId)
    .is("thread_id" as any, null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as any[]) ?? []).reverse() as EnvironmentMessage[];
}

export async function sendEnvironmentMessage(
  environmentId: string,
  content: string,
  replyToId?: string | null,
  attachment?: OutgoingAttachment | null,
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");
  const trimmed = content.trim();
  if (!trimmed && !attachment) return;
  const { error } = await supabase.from("environment_messages").insert({
    environment_id: environmentId,
    user_id: auth.user.id,
    content: trimmed.slice(0, 2000),
    reply_to_id: replyToId ?? null,
    attachment_url: attachment?.url ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_size: attachment?.size ?? null,
    attachment_type: attachment?.type ?? null,
  } as any);
  if (error) throw error;
}

export async function getEnvironmentsUnreadCounts(
  environmentIds: string[]
): Promise<Record<string, number>> {
  if (environmentIds.length === 0) return {};
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return {};

  const links = environmentIds.map((id) => `/environment/${id}`);
  const { data, error } = await supabase
    .from("notifications")
    .select("link")
    .eq("user_id", auth.user.id)
    .eq("read", false)
    .in("link", links);
  if (error) throw error;

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: any) => {
    const id = String(row.link).replace("/environment/", "");
    counts[id] = (counts[id] ?? 0) + 1;
  });
  return counts;
}
