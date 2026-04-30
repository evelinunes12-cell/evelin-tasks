import { supabase } from "@/integrations/supabase/client";

export interface TaskAssignee {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface AssignableMember {
  user_id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export const fetchTaskAssignees = async (taskId: string): Promise<TaskAssignee[]> => {
  const { data, error } = await supabase.rpc("get_task_assignees", {
    _task_id: taskId,
  });
  if (error) throw error;
  return (data || []) as TaskAssignee[];
};

export const fetchAssignableMembers = async (
  environmentId: string
): Promise<AssignableMember[]> => {
  const { data, error } = await supabase.rpc("get_environment_assignable_members", {
    _environment_id: environmentId,
  });
  if (error) throw error;
  return (data || []) as AssignableMember[];
};

export const addTaskAssignee = async (
  taskId: string,
  userId: string,
  createdBy: string
) => {
  const { error } = await supabase.from("task_assignees").insert({
    task_id: taskId,
    user_id: userId,
    created_by: createdBy,
  });
  if (error) throw error;
};

export const removeTaskAssignee = async (assigneeId: string) => {
  const { error } = await supabase
    .from("task_assignees")
    .delete()
    .eq("id", assigneeId);
  if (error) throw error;
};

export const fetchAssigneesForTasks = async (
  taskIds: string[]
): Promise<Record<string, TaskAssignee[]>> => {
  if (taskIds.length === 0) return {};
  const { data, error } = await supabase.rpc("get_task_assignees_bulk", {
    _task_ids: taskIds,
  });
  if (error) throw error;
  const result: Record<string, TaskAssignee[]> = {};
  for (const row of (data || []) as any[]) {
    const item: TaskAssignee = {
      id: row.id,
      user_id: row.user_id,
      email: row.email ?? null,
      full_name: row.full_name ?? null,
      username: row.username ?? null,
      avatar_url: row.avatar_url ?? null,
      created_at: row.created_at,
    };
    if (!result[row.task_id]) result[row.task_id] = [];
    result[row.task_id].push(item);
  }
  return result;
};

export const setTaskAssignees = async (
  taskId: string,
  userIds: string[],
  createdBy: string
) => {
  const current = await fetchTaskAssignees(taskId);
  const currentIds = current.map((a) => a.user_id);

  const toRemove = current.filter((a) => !userIds.includes(a.user_id));
  const toAdd = userIds.filter((id) => !currentIds.includes(id));

  for (const a of toRemove) {
    await removeTaskAssignee(a.id);
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("task_assignees").insert(
      toAdd.map((user_id) => ({
        task_id: taskId,
        user_id,
        created_by: createdBy,
      }))
    );
    if (error) throw error;
  }
};
