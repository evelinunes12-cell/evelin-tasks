import { useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useConfetti } from "@/hooks/useConfetti";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/services/tasks";
import { archiveTask } from "@/services/archive";
import { registerActivity } from "@/services/activity";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

export const useDashboardMutations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { triggerConfetti } = useConfetti();
  const deletedTaskRef = useRef<Task | null>(null);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
      if (error) throw error;
      return { newStatus };
    },
    onMutate: async ({ taskId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', user?.id] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', user?.id]);
      queryClient.setQueryData<Task[]>(['tasks', user?.id], (old) =>
        old?.map(task => task.id === taskId ? { ...task, status: newStatus } : task) || []
      );
      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) queryClient.setQueryData(['tasks', user?.id], context.previousTasks);
      toast.error("Erro ao atualizar status", { description: "Tente novamente mais tarde.", duration: 5000 });
    },
    onSuccess: async (_data, variables) => {
      toast.success("Status atualizado", { duration: 2000 });
      if (variables.newStatus.toLowerCase().includes("conclu")) {
        triggerConfetti();
        if (user?.id) {
          await registerActivity(user.id);
          queryClient.invalidateQueries({ queryKey: ['user-streak', user.id] });
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  const restoreTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase.from("tasks").insert({
        id: task.id, subject_name: task.subject_name, description: task.description,
        due_date: task.due_date, is_group_work: task.is_group_work, group_members: task.group_members,
        google_docs_link: task.google_docs_link, canva_link: task.canva_link,
        status: task.status, user_id: task.user_id, environment_id: task.environment_id,
        checklist: task.checklist as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      toast.success("Tarefa restaurada!", { duration: 2000 });
    },
    onError: () => { toast.error("Erro ao restaurar tarefa", { duration: 5000 }); },
  });

  const archiveTaskMutation = useMutation({
    mutationFn: archiveTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', user?.id] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', user?.id]);
      queryClient.setQueryData<Task[]>(['tasks', user?.id], (old) =>
        old?.filter(task => task.id !== taskId) || []
      );
      return { previousTasks };
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousTasks) queryClient.setQueryData(['tasks', user?.id], context.previousTasks);
      toast.error("Erro ao arquivar tarefa");
    },
    onSuccess: () => {
      toast.success("Tarefa arquivada!", {
        description: "Você pode encontrá-la em Tarefas Arquivadas.",
        action: { label: "Ver", onClick: () => navigate("/archived") },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['archived-tasks', user?.id] });
    },
  });

  const handleDeleteTask = useCallback(async (id: string, tasks: Task[]) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (taskToDelete) deletedTaskRef.current = taskToDelete;

    try {
      queryClient.setQueryData<Task[]>(['tasks', user?.id], (old) =>
        old?.filter(task => task.id !== id) || []
      );
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      toast("Tarefa excluída", {
        description: "A tarefa foi removida com sucesso.",
        duration: 5000,
        action: {
          label: "Desfazer",
          onClick: () => { if (deletedTaskRef.current) restoreTaskMutation.mutate(deletedTaskRef.current); },
        },
      });
    } catch (error) {
      logError("Error deleting task", error);
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      toast.error("Erro ao excluir tarefa", { description: "Tente novamente mais tarde.", duration: 5000 });
    }
  }, [user?.id, queryClient, restoreTaskMutation]);

  const handleStatusChange = useCallback((taskId: string, newStatus: string) => {
    updateStatusMutation.mutate({ taskId, newStatus });
  }, [updateStatusMutation]);

  const handleArchiveTask = useCallback((taskId: string) => {
    archiveTaskMutation.mutate(taskId);
  }, [archiveTaskMutation]);

  return { handleDeleteTask, handleStatusChange, handleArchiveTask };
};
