import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useUserStreak } from "@/hooks/useUserStreak";
import { useDashboardFilters, isTaskOverdue, filterAndSortTasks } from "@/hooks/useDashboardFilters";
import { useDashboardMutations } from "@/hooks/useDashboardMutations";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardNotifications } from "@/hooks/useDashboardNotifications";
import Navbar from "@/components/Navbar";
import StatsCards from "@/components/StatsCards";
import SwipeableTaskCard from "@/components/SwipeableTaskCard";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import EmptyState from "@/components/EmptyState";
import StreakCard from "@/components/StreakCard";
import { StreakKeeper } from "@/components/StreakKeeper";
import { AchievementUnlockChecker } from "@/components/AchievementUnlockChecker";
import { KanbanBoard } from "@/components/KanbanBoard";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { IncompleteProfileAlert } from "@/components/IncompleteProfileAlert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, X, LayoutGrid, Columns } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DashboardBannerCarousel from "@/components/DashboardBannerCarousel";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  useOnboarding();

  const filters = useDashboardFilters();
  const {
    statusFilter, setStatusFilter,
    environmentFilter, setEnvironmentFilter,
    subjectFilter, setSubjectFilter,
    groupWorkFilter, setGroupWorkFilter,
    overdueFilter, setOverdueFilter,
    sortBy, setSortBy,
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    activeFiltersCount, clearAllFilters,
  } = filters;

  const {
    tasks, tasksLoading,
    availableSubjects, availableStatuses,
    kanbanStatuses, dashboardStatuses, environments,
  } = useDashboardData();

  const { handleDeleteTask, handleStatusChange, handleArchiveTask } = useDashboardMutations();

  useDashboardNotifications(tasks);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const filteredTasks = filterAndSortTasks(tasks, filters);
  const overdueCount = tasks.filter(isTaskOverdue).length;

  const { data: streakData } = useUserStreak();
  const currentStreak = streakData?.streak || 0;
  const completedToday = streakData?.lastActivity
    ? new Date().toDateString() === streakData.lastActivity.toDateString()
    : false;

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
      <StreakKeeper />
      <AchievementUnlockChecker />
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-[1600px]">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Minhas Tarefas</h2>
            <p className="text-muted-foreground">Gerencie seus trabalhos e projetos de forma organizada</p>
          </div>
          <StreakCard streak={currentStreak} completedToday={completedToday} />
        </div>

        <DashboardBannerCarousel />
        <OnboardingProgress />
        <IncompleteProfileAlert />
        <StatsCards tasks={tasks} statuses={dashboardStatuses} />

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

                  <div className="space-y-2">
                    <Label className="text-sm">Disciplina</Label>
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                      <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {availableSubjects.map(subject => (
                          <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {availableStatuses.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Ambiente</Label>
                    <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="personal">Pessoal</SelectItem>
                        {environments.map(env => (
                          <SelectItem key={env.id} value={env.id}>{env.environment_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Tipo de Trabalho</Label>
                    <Select
                      value={groupWorkFilter === null ? "all" : groupWorkFilter ? "group" : "individual"}
                      onValueChange={(val) => setGroupWorkFilter(val === "all" ? null : val === "group")}
                    >
                      <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="group">Em Grupo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="rounded-r-none">
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Visualização em grade</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={viewMode === "board" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("board")} className="rounded-l-none">
                      <Columns className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Visualização Kanban</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

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
        {tasksLoading ? (
          <DashboardSkeleton viewMode={viewMode} />
        ) : tasks.length === 0 ? (
          <EmptyState type="tasks" />
        ) : filteredTasks.length === 0 ? (
          <EmptyState type="filtered" onClearFilters={clearAllFilters} />
        ) : viewMode === "list" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                onDelete={(id) => handleDeleteTask(id, tasks)}
                onStatusChange={handleStatusChange}
                onArchive={handleArchiveTask}
              />
            ))}
          </div>
        ) : (
          <KanbanBoard
            tasks={filteredTasks}
            availableStatuses={availableStatuses}
            kanbanStatuses={kanbanStatuses}
            onStatusChange={handleStatusChange}
            onDelete={(id) => handleDeleteTask(id, tasks)}
            onArchive={handleArchiveTask}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
