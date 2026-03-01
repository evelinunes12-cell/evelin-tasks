import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/services/tasks";
import { toast } from "sonner";

export const useDashboardData = () => {
  const { user } = useAuth();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("is_archived", false)
        .order("due_date", { ascending: true });
      if (error) {
        toast.error("Erro ao carregar tarefas", { description: "Tente novamente mais tarde.", duration: 5000 });
        throw error;
      }
      return (data || []).map(task => ({
        ...task,
        checklist: (task.checklist as unknown as Task['checklist']) || [],
      })) as Task[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  const { data: availableSubjects = [] } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("name").order("name", { ascending: true });
      if (error) throw error;
      return data?.map(s => s.name) || [];
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!user,
  });

  const { data: statusesData = [] } = useQuery({
    queryKey: ['statuses-full', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_statuses").select("*").order("order_index", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!user,
  });

  const availableStatuses = statusesData.map(s => s.name);

  const kanbanStatuses = useMemo(() => {
    const parentStatuses = statusesData.filter(s => !s.parent_id && s.show_in_kanban);
    const childStatuses = statusesData.filter(s => s.parent_id);
    return parentStatuses.map(parent => ({
      ...parent,
      children: childStatuses.filter(child => child.parent_id === parent.id),
    }));
  }, [statusesData]);

  const dashboardStatuses = useMemo(() => {
    const parentStatuses = statusesData.filter(s => !s.parent_id && s.show_in_dashboard);
    const childStatuses = statusesData.filter(s => s.parent_id);
    return parentStatuses.map(parent => ({
      ...parent,
      children: childStatuses.filter(child => child.parent_id === parent.id),
    }));
  }, [statusesData]);

  const { data: environments = [] } = useQuery({
    queryKey: ['environments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shared_environments").select("id, environment_name").order("environment_name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!user,
  });

  return {
    tasks,
    tasksLoading,
    availableSubjects,
    availableStatuses,
    statusesData,
    kanbanStatuses,
    dashboardStatuses,
    environments,
  };
};
