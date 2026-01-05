import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Task, isTaskOverdue as checkTaskOverdue, parseDueDate } from "@/services/tasks";
import Navbar from "@/components/Navbar";
import StatsCards from "@/components/StatsCards";
import TaskCard from "@/components/TaskCard";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, X, LayoutGrid, Columns } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [groupWorkFilter, setGroupWorkFilter] = useState<boolean | null>(null);
  const [overdueFilter, setOverdueFilter] = useState<boolean>(false);
  
  // Sort
  const [sortBy, setSortBy] = useState<string>("due_date");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  
  // Data
  const [environments, setEnvironments] = useState<{ id: string; environment_name: string }[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  // React Query para tarefas com cache de 5 minutos
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar tarefas",
          description: "Tente novamente mais tarde."
        });
        throw error;
      }
      return (data || []).map(task => ({
        ...task,
        checklist: (task.checklist as unknown as Task['checklist']) || [],
      })) as Task[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !!user,
  });

  const [metadataLoading, setMetadataLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMetadata();
    }
  }, [user]);

  const fetchMetadata = async () => {
    setMetadataLoading(true);
    await Promise.all([fetchStatuses(), fetchEnvironments(), fetchSubjects()]);
    setMetadataLoading(false);
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("name")
        .order("name", { ascending: true });
      
      if (error) throw error;
      setAvailableSubjects(data.map(s => s.name));
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from("task_statuses")
        .select("name")
        .order("name", { ascending: true });
      
      if (error) throw error;
      setAvailableStatuses(data.map(s => s.name));
    } catch (error) {
      console.error("Error fetching statuses:", error);
    }
  };

  const fetchEnvironments = async () => {
    try {
      const { data, error } = await supabase
        .from("shared_environments")
        .select("id, environment_name")
        .order("environment_name");
      
      if (error) throw error;
      setEnvironments(data || []);
    } catch (error) {
      console.error("Error fetching environments:", error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      // Invalida o cache para recarregar as tarefas
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      toast({
        title: "Tarefa excluída",
        description: "A tarefa foi removida com sucesso."
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir tarefa",
        description: "Tente novamente mais tarde."
      });
    }
  };

  const loading = tasksLoading || metadataLoading;

  const isTaskOverdue = (task: Task) => checkTaskOverdue(task);

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesEnvironment = 
      environmentFilter === "all" || 
      (environmentFilter === "personal" && !task.environment_id) ||
      (environmentFilter !== "personal" && task.environment_id === environmentFilter);
    const matchesSubject = subjectFilter === "all" || task.subject_name === subjectFilter;
    const matchesGroupWork = groupWorkFilter === null || task.is_group_work === groupWorkFilter;
    const matchesOverdue = !overdueFilter || isTaskOverdue(task);
    const matchesSearch = 
      searchQuery === "" || 
      task.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesEnvironment && matchesSubject && matchesGroupWork && matchesOverdue && matchesSearch;
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
    overdueFilter
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setStatusFilter("all");
    setEnvironmentFilter("all");
    setSubjectFilter("all");
    setGroupWorkFilter(null);
    setOverdueFilter(false);
    setSearchQuery("");
  };

  const stats = {
    notStarted: tasks.filter(t => t.status.toLowerCase().includes("não") || t.status.toLowerCase().includes("nao")).length,
    inProgress: tasks.filter(t => t.status.toLowerCase().includes("progresso") || t.status.toLowerCase().includes("andamento")).length,
    completed: tasks.filter(t => t.status.toLowerCase().includes("conclu")).length
  };

  const overdueCount = tasks.filter(isTaskOverdue).length;

  if (authLoading) {
    return <LoadingOverlay isLoading={true} message="Verificando autenticação..." />;
  }

  return (
    <div className="min-h-screen bg-background flex-1">
      <LoadingOverlay isLoading={loading} message="Carregando tarefas..." />
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Minhas Tarefas</h2>
          <p className="text-muted-foreground">Gerencie seus trabalhos e projetos de forma organizada</p>
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
              <PopoverContent className="w-80 p-4" align="end">
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

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {activeFiltersCount > 0 || searchQuery 
                ? "Nenhuma tarefa encontrada com os filtros aplicados." 
                : "Nenhuma tarefa encontrada. Crie sua primeira tarefa!"}
            </p>
            {(activeFiltersCount > 0 || searchQuery) && (
              <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        ) : viewMode === "list" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => (
              <TaskCard 
                key={task.id} 
                id={task.id} 
                subjectName={task.subject_name} 
                description={task.description} 
                dueDate={task.due_date} 
                isGroupWork={task.is_group_work} 
                status={task.status} 
                checklist={task.checklist} 
                onDelete={handleDeleteTask} 
              />
            ))}
          </div>
        ) : (
          /* Kanban Board View */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna A Fazer */}
            <div className="bg-muted/50 rounded-lg p-4">
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
                      <TaskCard 
                        key={task.id} 
                        id={task.id} 
                        subjectName={task.subject_name} 
                        description={task.description} 
                        dueDate={task.due_date} 
                        isGroupWork={task.is_group_work} 
                        status={task.status} 
                        checklist={task.checklist} 
                        onDelete={handleDeleteTask} 
                      />
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* Coluna Em Progresso */}
            <div className="bg-muted/50 rounded-lg p-4">
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
                      <TaskCard 
                        key={task.id} 
                        id={task.id} 
                        subjectName={task.subject_name} 
                        description={task.description} 
                        dueDate={task.due_date} 
                        isGroupWork={task.is_group_work} 
                        status={task.status} 
                        checklist={task.checklist} 
                        onDelete={handleDeleteTask} 
                      />
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* Coluna Concluído */}
            <div className="bg-muted/50 rounded-lg p-4">
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
                      <TaskCard 
                        key={task.id} 
                        id={task.id} 
                        subjectName={task.subject_name} 
                        description={task.description} 
                        dueDate={task.due_date} 
                        isGroupWork={task.is_group_work} 
                        status={task.status} 
                        checklist={task.checklist} 
                        onDelete={handleDeleteTask} 
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
