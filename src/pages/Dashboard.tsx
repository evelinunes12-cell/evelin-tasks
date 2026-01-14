import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useConfetti } from "@/hooks/useConfetti";
import { useUserStreak } from "@/hooks/useUserStreak";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Task, isTaskOverdue as checkTaskOverdue, parseDueDate } from "@/services/tasks";
import { isSameDay, parseISO, isPast, isToday } from "date-fns";
import Navbar from "@/components/Navbar";
import StatsCards from "@/components/StatsCards";
import SwipeableTaskCard from "@/components/SwipeableTaskCard";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import EmptyState from "@/components/EmptyState";
import StreakCard from "@/components/StreakCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Search, Filter, X, LayoutGrid, Columns } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logError } from "@/lib/logger";
import { useDebounce } from "@/hooks/useDebounce";
import { registerActivity } from "@/services/activity";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { triggerConfetti } = useConfetti();
  
  // Check if user needs onboarding
  useOnboarding();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Ref to store deleted task for undo
  const deletedTaskRef = useRef<Task | null>(null);
  
  // Filtros persistidos na URL
  const statusFilter = searchParams.get("status") || "all";
  const environmentFilter = searchParams.get("environment") || "all";
  const subjectFilter = searchParams.get("subject") || "all";
  const groupWorkFilter = searchParams.get("groupWork") === null ? null : searchParams.get("groupWork") === "true" ? true : searchParams.get("groupWork") === "false" ? false : null;
  const overdueFilter = searchParams.get("overdue") === "true";
  const dueTodayFilter = searchParams.get("due") === "today";
  const sortBy = searchParams.get("sortBy") || "due_date";
  const viewMode = (searchParams.get("view") as "list" | "board") || "list";
  
  // Estado local para busca com debounce
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("q") || "");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Funções para atualizar filtros na URL
  const setStatusFilter = (value: string) => {
    setSearchParams(prev => {
      if (value === "all") prev.delete("status");
      else prev.set("status", value);
      return prev;
    });
  };

  const setEnvironmentFilter = (value: string) => {
    setSearchParams(prev => {
      if (value === "all") prev.delete("environment");
      else prev.set("environment", value);
      return prev;
    });
  };

  const setSubjectFilter = (value: string) => {
    setSearchParams(prev => {
      if (value === "all") prev.delete("subject");
      else prev.set("subject", value);
      return prev;
    });
  };

  const setGroupWorkFilter = (value: boolean | null) => {
    setSearchParams(prev => {
      if (value === null) prev.delete("groupWork");
      else prev.set("groupWork", String(value));
      return prev;
    });
  };

  const setOverdueFilter = (value: boolean) => {
    setSearchParams(prev => {
      if (!value) prev.delete("overdue");
      else prev.set("overdue", "true");
      return prev;
    });
  };

  const setSortBy = (value: string) => {
    setSearchParams(prev => {
      if (value === "due_date") prev.delete("sortBy");
      else prev.set("sortBy", value);
      return prev;
    });
  };

  const setViewMode = (value: "list" | "board") => {
    setSearchParams(prev => {
      if (value === "list") prev.delete("view");
      else prev.set("view", value);
      return prev;
    });
  };

  // React Query para tarefas com cache de 5 minutos
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true });
      
      if (error) {
        toast.error("Erro ao carregar tarefas", {
          description: "Tente novamente mais tarde.",
          duration: 5000,
        });
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

  // React Query para subjects com cache de 30 minutos
  const { data: availableSubjects = [] } = useQuery({
    queryKey: ['subjects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data?.map(s => s.name) || [];
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!user,
  });

  // React Query para statuses com cache de 30 minutos
  const { data: availableStatuses = [] } = useQuery({
    queryKey: ['statuses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_statuses")
        .select("name")
        .order("name", { ascending: true });
      if (error) throw error;
      return data?.map(s => s.name) || [];
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!user,
  });

  // React Query para environments com cache de 30 minutos
  const { data: environments = [] } = useQuery({
    queryKey: ['environments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shared_environments")
        .select("id, environment_name")
        .order("environment_name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!user,
  });

  // Mutation for quick status change with optimistic update
  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);
      if (error) throw error;
      return { newStatus };
    },
    onMutate: async ({ taskId, newStatus }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', user?.id] });
      
      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', user?.id]);
      
      // Optimistically update
      queryClient.setQueryData<Task[]>(['tasks', user?.id], (old) =>
        old?.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        ) || []
      );
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', user?.id], context.previousTasks);
      }
      toast.error("Erro ao atualizar status", {
        description: "Tente novamente mais tarde.",
        duration: 5000,
      });
    },
    onSuccess: async (data, variables) => {
      toast.success("Status atualizado", { duration: 2000 });
      // Dispara confetes e registra atividade se o status for "Concluído"
      if (variables.newStatus.toLowerCase().includes("conclu")) {
        triggerConfetti();
        if (user?.id) {
          await registerActivity(user.id);
          // Invalida o cache do streak para atualizar a UI
          queryClient.invalidateQueries({ queryKey: ['user-streak', user.id] });
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
  });

  // Mutation for restoring deleted task
  const restoreTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase
        .from("tasks")
        .insert({
          id: task.id,
          subject_name: task.subject_name,
          description: task.description,
          due_date: task.due_date,
          is_group_work: task.is_group_work,
          group_members: task.group_members,
          google_docs_link: task.google_docs_link,
          canva_link: task.canva_link,
          status: task.status,
          user_id: task.user_id,
          environment_id: task.environment_id,
          checklist: task.checklist as any,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      toast.success("Tarefa restaurada!", { duration: 2000 });
    },
    onError: () => {
      toast.error("Erro ao restaurar tarefa", { duration: 5000 });
    },
  });

  // Verificação de tarefas e etapas atrasadas no frontend (mais confiável que pg_cron)
  const checkOverdueTasks = useCallback(async () => {
    if (!user?.id || tasks.length === 0) return;
    
    const today = new Date();
    const lastCheckDate = localStorage.getItem(`zenit_last_overdue_check_${user.id}`);
    
    // Evita spam: só roda se ainda não rodou hoje
    if (lastCheckDate && isSameDay(parseISO(lastCheckDate), today)) {
      return;
    }

    // 1. Verifica Tarefas Principais Atrasadas
    const overdueTasksCount = tasks.filter(t => {
      if (!t.due_date || t.status.toLowerCase().includes("conclu")) return false;
      const dueDate = parseDueDate(t.due_date);
      return isPast(dueDate) && !isToday(dueDate);
    }).length;

    // 2. Verifica Etapas (Steps) Atrasadas via checklist
    let overdueStepsCount = 0;
    
    tasks.forEach(task => {
      // Se a tarefa principal já está concluída, ignoramos as etapas dela
      if (task.status.toLowerCase().includes("conclu")) return;

      const steps = (task.checklist as any[]) || [];
      
      steps.forEach(step => {
        // Verifica se tem data, se não está completa e se já passou
        if (step.due_date && !step.completed) {
          try {
            const stepDate = parseISO(step.due_date);
            if (isPast(stepDate) && !isToday(stepDate)) {
              overdueStepsCount++;
            }
          } catch {
            // Ignora datas inválidas
          }
        }
      });
    });

    // 3. Gera a Notificação (Se houver algo atrasado)
    if (overdueTasksCount > 0 || overdueStepsCount > 0) {
      let message = "";
      
      if (overdueTasksCount > 0 && overdueStepsCount > 0) {
        message = `Você tem ${overdueTasksCount} tarefa(s) e ${overdueStepsCount} etapa(s) atrasada(s).`;
      } else if (overdueTasksCount > 0) {
        message = `Você tem ${overdueTasksCount} tarefa(s) atrasada(s).`;
      } else {
        message = `Você tem ${overdueStepsCount} etapa(s) pendente(s) que já venceu(ram).`;
      }

      // Tenta inserir no Banco (pode falhar por RLS, mas o toast local avisa)
      try {
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Atenção aos Prazos ⏰",
          message: message,
          link: "/dashboard?overdue=true"
        });
      } catch {
        // Ignora erro de RLS
      }

      // Salva que já verificou hoje
      localStorage.setItem(`zenit_last_overdue_check_${user.id}`, today.toISOString());
      
      toast.warning("Prazos Vencidos", {
        description: message,
        duration: 6000,
        action: {
          label: "Ver",
          onClick: () => setOverdueFilter(true)
        }
      });
    }
  }, [user?.id, tasks, setOverdueFilter]);

  // Verificação de tarefas e etapas que vencem HOJE
  const checkDueTodayTasks = useCallback(async () => {
    if (!user?.id || tasks.length === 0) return;
    
    const today = new Date();
    // Chave diferente no localStorage para não misturar com atrasados
    const lastCheckToday = localStorage.getItem(`zenit_last_today_check_${user.id}`);
    
    if (lastCheckToday && isSameDay(parseISO(lastCheckToday), today)) {
      return;
    }

    // 1. Conta tarefas que vencem HOJE e não estão concluídas
    const tasksDueTodayCount = tasks.filter(t => {
      if (!t.due_date || t.status.toLowerCase().includes("conclu")) return false;
      const dueDate = parseDueDate(t.due_date);
      return isToday(dueDate);
    }).length;

    // 2. Conta etapas que vencem HOJE
    let stepsDueTodayCount = 0;
    tasks.forEach(task => {
      if (task.status.toLowerCase().includes("conclu")) return;
      const steps = (task.checklist as any[]) || [];
      steps.forEach(step => {
        if (step.due_date && !step.completed) {
          try {
            const stepDate = parseISO(step.due_date);
            if (isToday(stepDate)) {
              stepsDueTodayCount++;
            }
          } catch {
            // Ignora datas inválidas
          }
        }
      });
    });

    if (tasksDueTodayCount > 0 || stepsDueTodayCount > 0) {
      let message = "";
      
      if (tasksDueTodayCount > 0 && stepsDueTodayCount > 0) {
        message = `Você tem ${tasksDueTodayCount} tarefa(s) e ${stepsDueTodayCount} etapa(s) para entregar hoje. Força!`;
      } else if (tasksDueTodayCount > 0) {
        message = `Você tem ${tasksDueTodayCount} tarefa(s) para entregar hoje. Força!`;
      } else {
        message = `Você tem ${stepsDueTodayCount} etapa(s) para concluir hoje. Força!`;
      }

      // Tenta inserir no Banco
      try {
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Foco no Hoje! 📅",
          message: message,
          link: "/dashboard?due=today"
        });
      } catch {
        // Ignora erro de RLS
      }

      // Salva que já avisou hoje
      localStorage.setItem(`zenit_last_today_check_${user.id}`, today.toISOString());
      
      toast.info("Planejamento do Dia", {
        description: message,
        duration: 6000,
        action: {
          label: "Ver",
          onClick: () => setSearchParams(prev => { prev.set("due", "today"); return prev; })
        }
      });
    }
  }, [user?.id, tasks, setSearchParams]);

  useEffect(() => {
    if (tasks.length > 0 && user?.id) {
      checkOverdueTasks();
      checkDueTodayTasks();
    }
  }, [tasks, user?.id, checkOverdueTasks, checkDueTodayTasks]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleDeleteTask = async (id: string) => {
    // Store task for potential undo
    const taskToDelete = tasks.find(t => t.id === id);
    if (taskToDelete) {
      deletedTaskRef.current = taskToDelete;
    }

    try {
      // Optimistic update
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
          onClick: () => {
            if (deletedTaskRef.current) {
              restoreTaskMutation.mutate(deletedTaskRef.current);
            }
          },
        },
      });
    } catch (error) {
      logError("Error deleting task", error);
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      toast.error("Erro ao excluir tarefa", {
        description: "Tente novamente mais tarde.",
        duration: 5000,
      });
    }
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateStatusMutation.mutate({ taskId, newStatus });
  };

  const loading = tasksLoading;

  const isTaskOverdue = (task: Task) => {
    // 1. Verifica se a Tarefa Principal está atrasada
    let mainTaskOverdue = false;
    if (task.due_date && !task.status.toLowerCase().includes("conclu")) {
      const dueDate = parseDueDate(task.due_date);
      mainTaskOverdue = isPast(dueDate) && !isToday(dueDate);
    }

    // 2. Verifica se alguma Etapa (Checklist) está atrasada
    let hasOverdueStep = false;
    if (task.checklist && Array.isArray(task.checklist)) {
      hasOverdueStep = task.checklist.some((step: any) => {
        if (!step.due_date || step.completed) return false;
        try {
          const stepDate = parseISO(step.due_date);
          return isPast(stepDate) && !isToday(stepDate);
        } catch {
          return false;
        }
      });
    }

    // Retorna true se QUALQUER UM dos dois for verdadeiro
    return mainTaskOverdue || hasOverdueStep;
  };

  // Verifica se a tarefa ou alguma etapa vence HOJE
  const isTaskDueToday = (task: Task) => {
    // 1. Verifica se a Tarefa Principal vence hoje
    let mainTaskDueToday = false;
    if (task.due_date && !task.status.toLowerCase().includes("conclu")) {
      const dueDate = parseDueDate(task.due_date);
      mainTaskDueToday = isToday(dueDate);
    }

    // 2. Verifica se alguma Etapa vence hoje
    let hasStepDueToday = false;
    if (task.checklist && Array.isArray(task.checklist)) {
      hasStepDueToday = task.checklist.some((step: any) => {
        if (!step.due_date || step.completed) return false;
        try {
          const stepDate = parseISO(step.due_date);
          return isToday(stepDate);
        } catch {
          return false;
        }
      });
    }

    return mainTaskDueToday || hasStepDueToday;
  };

  // Use debounced search for filtering
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesEnvironment = 
      environmentFilter === "all" || 
      (environmentFilter === "personal" && !task.environment_id) ||
      (environmentFilter !== "personal" && task.environment_id === environmentFilter);
    const matchesSubject = subjectFilter === "all" || task.subject_name === subjectFilter;
    const matchesGroupWork = groupWorkFilter === null || task.is_group_work === groupWorkFilter;
    const matchesOverdue = !overdueFilter || isTaskOverdue(task);
    const matchesDueToday = !dueTodayFilter || isTaskDueToday(task);
    const matchesSearch = 
      debouncedSearch === "" || 
      task.subject_name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
      (task.description && task.description.toLowerCase().includes(debouncedSearch.toLowerCase()));
    
    return matchesStatus && matchesEnvironment && matchesSubject && matchesGroupWork && matchesOverdue && matchesDueToday && matchesSearch;
  }).sort((a, b) => {
    switch (sortBy) {
      case "due_date":
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return parseDueDate(a.due_date).getTime() - parseDueDate(b.due_date).getTime();
      case "recent":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "overdue_first":
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return parseDueDate(a.due_date).getTime() - parseDueDate(b.due_date).getTime();
      case "subject":
        return a.subject_name.localeCompare(b.subject_name);
      default:
        return 0;
    }
  });

  const activeFiltersCount = [
    statusFilter !== "all",
    environmentFilter !== "all",
    subjectFilter !== "all",
    groupWorkFilter !== null,
    overdueFilter,
    dueTodayFilter
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchParams(prev => {
      prev.delete("status");
      prev.delete("environment");
      prev.delete("subject");
      prev.delete("groupWork");
      prev.delete("overdue");
      prev.delete("due");
      return prev;
    });
    setSearchQuery("");
  };

  const stats = {
    notStarted: tasks.filter(t => t.status.toLowerCase().includes("não") || t.status.toLowerCase().includes("nao")).length,
    inProgress: tasks.filter(t => t.status.toLowerCase().includes("progresso") || t.status.toLowerCase().includes("andamento")).length,
    completed: tasks.filter(t => t.status.toLowerCase().includes("conclu")).length
  };

  const overdueCount = tasks.filter(isTaskOverdue).length;

  // Busca a ofensiva do banco de dados
  const { currentStreak, completedToday } = useUserStreak(user?.id);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex-1">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Minhas Tarefas</h2>
            <p className="text-muted-foreground">Gerencie seus trabalhos e projetos de forma organizada</p>
          </div>
          <StreakCard streak={currentStreak} completedToday={completedToday} />
        </div>

        <StatsCards notStarted={stats.notStarted} inProgress={stats.inProgress} completed={stats.completed} />

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Pesquisar por disciplina ou descrição..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="pl-9" 
              />
            </div>
            
            {/* Advanced Filters Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 bg-popover" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filtros Avançados</h4>
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-auto p-1 text-xs">
                        <X className="w-3 h-3 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>
                  
                  {/* Subject Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Disciplina</Label>
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {availableSubjects.map(subject => (
                          <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {availableStatuses.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Environment Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Ambiente</Label>
                    <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="personal">Pessoal</SelectItem>
                        {environments.map(env => (
                          <SelectItem key={env.id} value={env.id}>{env.environment_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Group Work Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Tipo de Trabalho</Label>
                    <Select 
                      value={groupWorkFilter === null ? "all" : groupWorkFilter ? "group" : "individual"} 
                      onValueChange={(val) => setGroupWorkFilter(val === "all" ? null : val === "group")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="group">Em Grupo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Overdue Filter */}
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="overdue" 
                      checked={overdueFilter} 
                      onCheckedChange={(checked) => setOverdueFilter(checked === true)}
                    />
                    <Label htmlFor="overdue" className="text-sm cursor-pointer flex items-center gap-2">
                      Apenas atrasadas
                      {overdueCount > 0 && (
                        <Badge variant="destructive" className="text-xs">{overdueCount}</Badge>
                      )}
                    </Label>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* View Mode Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-r-none"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "board" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("board")}
                className="rounded-l-none"
              >
                <Columns className="w-4 h-4" />
              </Button>
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date">Próximos do prazo</SelectItem>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="overdue_first">Atrasados primeiro</SelectItem>
                <SelectItem value="subject">Nome da Disciplina</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Status: {statusFilter}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                </Badge>
              )}
              {subjectFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Disciplina: {subjectFilter}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSubjectFilter("all")} />
                </Badge>
              )}
              {environmentFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Ambiente: {environmentFilter === "personal" ? "Pessoal" : environments.find(e => e.id === environmentFilter)?.environment_name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setEnvironmentFilter("all")} />
                </Badge>
              )}
              {groupWorkFilter !== null && (
                <Badge variant="secondary" className="gap-1">
                  {groupWorkFilter ? "Em Grupo" : "Individual"}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setGroupWorkFilter(null)} />
                </Badge>
              )}
              {overdueFilter && (
                <Badge variant="destructive" className="gap-1">
                  Atrasadas
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setOverdueFilter(false)} />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <DashboardSkeleton viewMode={viewMode} />
        ) : tasks.length === 0 ? (
          <EmptyState type="tasks" />
        ) : filteredTasks.length === 0 ? (
          <EmptyState type="filtered" onClearFilters={clearAllFilters} />
        ) : viewMode === "list" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => (
              <SwipeableTaskCard 
                key={task.id} 
                id={task.id} 
                subjectName={task.subject_name} 
                description={task.description} 
                dueDate={task.due_date} 
                isGroupWork={task.is_group_work} 
                status={task.status} 
                checklist={task.checklist}
                availableStatuses={availableStatuses}
                completedStatusName={availableStatuses.find(s => s.toLowerCase().includes("conclu")) || "Concluído"}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          /* Kanban Board View - Mobile optimized with snap scroll */
          <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto snap-x snap-mandatory touch-pan-x pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
            {/* Coluna A Fazer */}
            <div className="bg-muted/50 rounded-lg p-4 min-w-[85vw] md:min-w-0 snap-center flex-shrink-0">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                A Fazer
                <Badge variant="secondary" className="ml-auto">
                  {filteredTasks.filter(t => 
                    t.status.toLowerCase().includes("não") || 
                    t.status.toLowerCase().includes("nao") ||
                    t.status.toLowerCase().includes("fazer")
                  ).length}
                </Badge>
              </h3>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {filteredTasks
                    .filter(t => 
                      t.status.toLowerCase().includes("não") || 
                      t.status.toLowerCase().includes("nao") ||
                      t.status.toLowerCase().includes("fazer")
                    )
                    .map(task => (
                      <SwipeableTaskCard 
                        key={task.id} 
                        id={task.id} 
                        subjectName={task.subject_name} 
                        description={task.description} 
                        dueDate={task.due_date} 
                        isGroupWork={task.is_group_work} 
                        status={task.status} 
                        checklist={task.checklist}
                        availableStatuses={availableStatuses}
                        completedStatusName={availableStatuses.find(s => s.toLowerCase().includes("conclu")) || "Concluído"}
                        onDelete={handleDeleteTask}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* Coluna Em Progresso */}
            <div className="bg-muted/50 rounded-lg p-4 min-w-[85vw] md:min-w-0 snap-center flex-shrink-0">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Em Progresso
                <Badge variant="secondary" className="ml-auto">
                  {filteredTasks.filter(t => 
                    t.status.toLowerCase().includes("progresso") || 
                    t.status.toLowerCase().includes("andamento")
                  ).length}
                </Badge>
              </h3>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {filteredTasks
                    .filter(t => 
                      t.status.toLowerCase().includes("progresso") || 
                      t.status.toLowerCase().includes("andamento")
                    )
                    .map(task => (
                      <SwipeableTaskCard 
                        key={task.id} 
                        id={task.id} 
                        subjectName={task.subject_name} 
                        description={task.description} 
                        dueDate={task.due_date} 
                        isGroupWork={task.is_group_work} 
                        status={task.status} 
                        checklist={task.checklist}
                        availableStatuses={availableStatuses}
                        completedStatusName={availableStatuses.find(s => s.toLowerCase().includes("conclu")) || "Concluído"}
                        onDelete={handleDeleteTask}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* Coluna Concluído */}
            <div className="bg-muted/50 rounded-lg p-4 min-w-[85vw] md:min-w-0 snap-center flex-shrink-0">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                Concluído
                <Badge variant="secondary" className="ml-auto">
                  {filteredTasks.filter(t => t.status.toLowerCase().includes("conclu")).length}
                </Badge>
              </h3>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {filteredTasks
                    .filter(t => t.status.toLowerCase().includes("conclu"))
                    .map(task => (
                      <SwipeableTaskCard 
                        key={task.id} 
                        id={task.id} 
                        subjectName={task.subject_name} 
                        description={task.description} 
                        dueDate={task.due_date} 
                        isGroupWork={task.is_group_work} 
                        status={task.status} 
                        checklist={task.checklist}
                        availableStatuses={availableStatuses}
                        completedStatusName={availableStatuses.find(s => s.toLowerCase().includes("conclu")) || "Concluído"}
                        onDelete={handleDeleteTask}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
