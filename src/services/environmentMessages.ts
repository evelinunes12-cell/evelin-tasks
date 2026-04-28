import { supabase } from "@/integrations/supabase/client";

export interface EnvironmentMessage {
  id: string;
  environment_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export async function listEnvironmentMessages(
  environmentId: string,
  limit = 100
): Promise<EnvironmentMessage[]> {
  const { data, error } = await supabase
    .from("environment_messages")
    .select("*")
    .eq("environment_id", environmentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as any[]) ?? []).reverse() as EnvironmentMessage[];
}

export async function sendEnvironmentMessage(
  environmentId: string,
  content: string
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");
  const trimmed = content.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from("environment_messages")
    .insert({
      environment_id: environmentId,
      user_id: auth.user.id,
      content: trimmed.slice(0, 2000),
    });
  if (error) throw error;
}

export async function getEnvironmentsUnreadCounts(
  environmentIds: string[]
): Promise<Record<string, number>> {
  if (environmentIds.length === 0) return {};
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return {};

  const links = environmentIds.map((id) => `/shared-environments/${id}`);
  const { data, error } = await supabase
    .from("notifications")
    .select("link")
    .eq("user_id", auth.user.id)
    .eq("read", false)
    .in("link", links);
  if (error) throw error;

  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: any) => {
    const id = String(row.link).replace("/shared-environments/", "");
    counts[id] = (counts[id] ?? 0) + 1;
  });
  return counts;
}
