import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/DateRangePicker";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Calendar, Eye, Filter, Search, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
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

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

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

  // Extract unique subjects and statuses for filters
  const uniqueSubjects = useMemo(() => {
    const subjects = [...new Set(archivedTasks.map(t => t.subject_name))];
    return subjects.sort();
  }, [archivedTasks]);

  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(archivedTasks.map(t => t.status))];
    return statuses.sort();
  }, [archivedTasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return archivedTasks.filter(task => {
      // Search term filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSubject = task.subject_name.toLowerCase().includes(search);
        const matchesDescription = task.description?.toLowerCase().includes(search);
        if (!matchesSubject && !matchesDescription) return false;
      }

      // Subject filter
      if (selectedSubject !== "all" && task.subject_name !== selectedSubject) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all" && task.status !== selectedStatus) {
        return false;
      }

      // Date range filter (based on due_date)
      if (dateRange?.from && task.due_date) {
        const taskDate = parseDueDate(task.due_date);
        if (taskDate < dateRange.from) return false;
        if (dateRange.to && taskDate > dateRange.to) return false;
      }

      return true;
    });
  }, [archivedTasks, searchTerm, selectedSubject, selectedStatus, dateRange]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSubject("all");
    setSelectedStatus("all");
    setDateRange(undefined);
  };

  const hasActiveFilters = searchTerm || selectedSubject !== "all" || selectedStatus !== "all" || dateRange;

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

        {/* Filters Section */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por disciplina ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Toggle Filters Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  !
                </Badge>
              )}
            </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <Card className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Subject Filter */}
                <div className="space-y-2">
                  <Label htmlFor="subject-filter">Disciplina</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger id="subject-filter">
                      <SelectValue placeholder="Todas as disciplinas" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todas as disciplinas</SelectItem>
                      {uniqueSubjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Todos os status</SelectItem>
                      {uniqueStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Filter */}
                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label>Data de Entrega</Label>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Results count */}
          {!isLoading && archivedTasks.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Mostrando {filteredTasks.length} de {archivedTasks.length} tarefas arquivadas
            </p>
          )}
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
        ) : filteredTasks.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar os filtros para encontrar o que procura.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
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
