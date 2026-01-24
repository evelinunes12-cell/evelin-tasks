import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/services/tasks";
import { unarchiveTask } from "@/services/archive";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Calendar, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ArchivedTasks = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Query para tarefas arquivadas
  const { data: archivedTasks = [], isLoading } = useQuery({
    queryKey: ['archived-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("is_archived", true)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return (data || []).map(task => ({
        ...task,
        checklist: (task.checklist as unknown as Task['checklist']) || [],
      })) as Task[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  // Mutation para desarquivar
  const unarchiveMutation = useMutation({
    mutationFn: unarchiveTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['archived-tasks', user?.id] });
      const previousTasks = queryClient.getQueryData<Task[]>(['archived-tasks', user?.id]);
      
      queryClient.setQueryData<Task[]>(['archived-tasks', user?.id], (old) =>
        old?.filter(task => task.id !== taskId) || []
      );
      
      return { previousTasks };
    },
    onError: (err, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['archived-tasks', user?.id], context.previousTasks);
      }
      toast.error("Erro ao desarquivar tarefa");
    },
    onSuccess: () => {
      toast.success("Tarefa restaurada para a Dashboard!");
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-tasks', user?.id] });
    },
  });

  // Mutation para deletar permanentemente
  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['archived-tasks', user?.id] });
      const previousTasks = queryClient.getQueryData<Task[]>(['archived-tasks', user?.id]);
      
      queryClient.setQueryData<Task[]>(['archived-tasks', user?.id], (old) =>
        old?.filter(task => task.id !== taskId) || []
      );
      
      return { previousTasks };
    },
    onError: (err, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['archived-tasks', user?.id], context.previousTasks);
      }
      toast.error("Erro ao excluir tarefa");
    },
    onSuccess: () => {
      toast.success("Tarefa excluída permanentemente");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-tasks', user?.id] });
    },
  });

  const parseDueDate = (dateStr: string) => {
    const parts = dateStr.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex-1">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Archive className="w-8 h-8 text-muted-foreground" />
            <h2 className="text-3xl font-bold text-foreground">Tarefas Arquivadas</h2>
          </div>
          <p className="text-muted-foreground">
            Tarefas concluídas ou arquivadas manualmente. Você pode restaurá-las para a Dashboard a qualquer momento.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : archivedTasks.length === 0 ? (
          <Card className="p-12 text-center">
            <Archive className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa arquivada</h3>
            <p className="text-muted-foreground mb-4">
              Quando você arquivar tarefas ou elas forem arquivadas automaticamente após 7 dias concluídas, aparecerão aqui.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Voltar para Dashboard
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedTasks.map((task) => (
              <Card key={task.id} className="flex flex-col">
                <CardContent className="pt-6 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg text-foreground line-clamp-1">
                      {task.subject_name}
                    </h3>
                    <Badge variant="secondary" className="shrink-0">
                      {task.status}
                    </Badge>
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {task.description}
                    </p>
                  )}
                  
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(parseDueDate(task.due_date), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex gap-2 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/task/${task.id}`)}
                    className="flex-1 gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => unarchiveMutation.mutate(task.id)}
                    disabled={unarchiveMutation.isPending}
                    className="flex-1 gap-2"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    Restaurar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A tarefa "{task.subject_name}" será excluída permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(task.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ArchivedTasks;
