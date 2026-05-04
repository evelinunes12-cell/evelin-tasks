import { supabase } from "@/integrations/supabase/client";
import type { EnvironmentMessage } from "./environmentMessages";

export interface EnvironmentThread {
  id: string;
  environment_id: string;
  created_by: string;
  title: string;
  source_message_id: string | null;
  source_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreadWithMeta extends EnvironmentThread {
  reply_count: number;
  last_reply_at: string | null;
  source_task_name?: string | null;
}

export async function listEnvironmentThreads(
  environmentId: string
): Promise<ThreadWithMeta[]> {
  const { data: threads, error } = await supabase
    .from("environment_threads" as any)
    .select("*")
    .eq("environment_id", environmentId)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const list = (threads ?? []) as unknown as EnvironmentThread[];
  if (list.length === 0) return [];

  const ids = list.map((t) => t.id);
  const { data: msgs } = await supabase
    .from("environment_messages")
    .select("thread_id,created_at" as any)
    .in("thread_id" as any, ids);

  const taskIds = list.map((t) => t.source_task_id).filter(Boolean) as string[];
  let taskMap: Record<string, string> = {};
  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id,subject_name")
      .in("id", taskIds);
    (tasks ?? []).forEach((t: any) => {
      taskMap[t.id] = t.subject_name;
    });
  }

  const counts: Record<string, { count: number; last: string | null }> = {};
  ((msgs as any[]) ?? []).forEach((m) => {
    const tid = m.thread_id as string;
    if (!counts[tid]) counts[tid] = { count: 0, last: null };
    counts[tid].count += 1;
    if (!counts[tid].last || m.created_at > counts[tid].last) {
      counts[tid].last = m.created_at;
    }
  });

  return list.map((t) => ({
    ...t,
    reply_count: counts[t.id]?.count ?? 0,
    last_reply_at: counts[t.id]?.last ?? null,
    source_task_name: t.source_task_id ? taskMap[t.source_task_id] ?? null : null,
  }));
}

export async function getThread(threadId: string): Promise<ThreadWithMeta | null> {
  const { data, error } = await supabase
    .from("environment_threads" as any)
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const t = data as unknown as EnvironmentThread;
  let source_task_name: string | null = null;
  if (t.source_task_id) {
    const { data: task } = await supabase
      .from("tasks")
      .select("subject_name")
      .eq("id", t.source_task_id)
      .maybeSingle();
    source_task_name = (task as any)?.subject_name ?? null;
  }
  return { ...t, reply_count: 0, last_reply_at: null, source_task_name };
}

export async function listThreadMessages(
  threadId: string
): Promise<EnvironmentMessage[]> {
  const { data, error } = await supabase
    .from("environment_messages")
    .select("*")
    .eq("thread_id" as any, threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EnvironmentMessage[];
}

export async function createThread(params: {
  environmentId: string;
  title: string;
  sourceMessageId?: string | null;
  sourceTaskId?: string | null;
}): Promise<EnvironmentThread> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("environment_threads" as any)
    .insert({
      environment_id: params.environmentId,
      created_by: auth.user.id,
      title: params.title.trim().slice(0, 200),
      source_message_id: params.sourceMessageId ?? null,
      source_task_id: params.sourceTaskId ?? null,
    } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as EnvironmentThread;
}

export async function findThreadByTask(
  environmentId: string,
  taskId: string
): Promise<EnvironmentThread | null> {
  const { data, error } = await supabase
    .from("environment_threads" as any)
    .select("*")
    .eq("environment_id", environmentId)
    .eq("source_task_id", taskId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as EnvironmentThread) ?? null;
}

export async function sendThreadMessage(params: {
  environmentId: string;
  threadId: string;
  content: string;
  replyToId?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado");
  const trimmed = params.content.trim();
  if (!trimmed) return;
  const { error } = await supabase.from("environment_messages").insert({
    environment_id: params.environmentId,
    user_id: auth.user.id,
    content: trimmed.slice(0, 2000),
    thread_id: params.threadId,
    reply_to_id: params.replyToId ?? null,
  } as any);
  if (error) throw error;
}

export async function deleteThread(threadId: string) {
  const { error } = await supabase
    .from("environment_threads" as any)
    .delete()
    .eq("id", threadId);
  if (error) throw error;
}
