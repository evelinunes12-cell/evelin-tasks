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
import StreakCard from "@/components/StreakCard";
import { StreakKeeper } from "@/components/StreakKeeper";
import { AchievementUnlockChecker } from "@/components/AchievementUnlockChecker";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { IncompleteProfileAlert } from "@/components/IncompleteProfileAlert";
import DashboardBannerCarousel from "@/components/DashboardBannerCarousel";

import { TodaySummary } from "@/components/dashboard/TodaySummary";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardKanban } from "@/components/dashboard/DashboardKanban";

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

  const completedStatusName = availableStatuses.find(s => s.toLowerCase().includes("conclu")) || "Concluído";

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
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Minhas Tarefas</h2>
            <p className="text-muted-foreground">Gerencie seus trabalhos e projetos de forma organizada</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/estudos/ciclo")}
              className="gap-2 bg-primary hover:bg-primary/90 shadow-md"
              size="lg"
            >
              <Play className="w-4 h-4" />
              Modo Foco
            </Button>
            <StreakCard streak={currentStreak} completedToday={completedToday} />
          </div>
        </div>

        <DashboardBannerCarousel />
        <OnboardingProgress />
        <IncompleteProfileAlert />

        {/* Today's Summary */}
        <TodaySummary
          tasks={tasks}
          onStatusChange={handleStatusChange}
          completedStatusName={completedStatusName}
        />

        <StatsCards tasks={tasks} statuses={dashboardStatuses} />

        {/* Filters */}
        <DashboardFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          subjectFilter={subjectFilter}
          setSubjectFilter={setSubjectFilter}
          environmentFilter={environmentFilter}
          setEnvironmentFilter={setEnvironmentFilter}
          groupWorkFilter={groupWorkFilter}
          setGroupWorkFilter={setGroupWorkFilter}
          overdueFilter={overdueFilter}
          setOverdueFilter={setOverdueFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
          activeFiltersCount={activeFiltersCount}
          clearAllFilters={clearAllFilters}
          availableSubjects={availableSubjects}
          availableStatuses={availableStatuses}
          environments={environments}
          overdueCount={overdueCount}
        />

        {/* Task Board / List */}
        <DashboardKanban
          tasks={tasks}
          filteredTasks={filteredTasks}
          tasksLoading={tasksLoading}
          viewMode={viewMode}
          availableStatuses={availableStatuses}
          kanbanStatuses={kanbanStatuses}
          onStatusChange={handleStatusChange}
          onDelete={(id) => handleDeleteTask(id, tasks)}
          onArchive={handleArchiveTask}
          clearAllFilters={clearAllFilters}
        />
      </main>
    </div>
  );
};

export default Dashboard;
