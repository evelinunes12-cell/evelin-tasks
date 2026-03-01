import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { Task, parseDueDate } from "@/services/tasks";
import { isPast, isToday, parseISO } from "date-fns";

export const useDashboardFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL
  const statusFilter = searchParams.get("status") || "all";
  const environmentFilter = searchParams.get("environment") || "all";
  const subjectFilter = searchParams.get("subject") || "all";
  const groupWorkFilter = searchParams.get("groupWork") === null ? null : searchParams.get("groupWork") === "true" ? true : searchParams.get("groupWork") === "false" ? false : null;
  const overdueFilter = searchParams.get("overdue") === "true";
  const dueTodayFilter = searchParams.get("due") === "today";
  const sortBy = searchParams.get("sortBy") || "due_date";
  const viewMode = (searchParams.get("view") as "list" | "board") || "list";

  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("q") || "");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // URL update helpers
  const setFilter = (key: string, value: string, defaultValue: string) => {
    setSearchParams(prev => {
      if (value === defaultValue) prev.delete(key);
      else prev.set(key, value);
      return prev;
    });
  };

  const setStatusFilter = (v: string) => setFilter("status", v, "all");
  const setEnvironmentFilter = (v: string) => setFilter("environment", v, "all");
  const setSubjectFilter = (v: string) => setFilter("subject", v, "all");
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
  const setSortBy = (v: string) => setFilter("sortBy", v, "due_date");
  const setViewMode = (value: "list" | "board") => {
    setSearchParams(prev => {
      if (value === "list") prev.delete("view");
      else prev.set("view", value);
      return prev;
    });
  };

  const activeFiltersCount = [
    statusFilter !== "all",
    environmentFilter !== "all",
    subjectFilter !== "all",
    groupWorkFilter !== null,
    overdueFilter,
    dueTodayFilter,
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

  return {
    statusFilter, setStatusFilter,
    environmentFilter, setEnvironmentFilter,
    subjectFilter, setSubjectFilter,
    groupWorkFilter, setGroupWorkFilter,
    overdueFilter, setOverdueFilter,
    dueTodayFilter,
    sortBy, setSortBy,
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    debouncedSearch,
    activeFiltersCount,
    clearAllFilters,
    setSearchParams,
  };
};

// Task date helpers
export const isTaskOverdue = (task: Task) => {
  let mainTaskOverdue = false;
  if (task.due_date && !task.status.toLowerCase().includes("conclu")) {
    const dueDate = parseDueDate(task.due_date);
    mainTaskOverdue = isPast(dueDate) && !isToday(dueDate);
  }
  let hasOverdueStep = false;
  if (task.checklist && Array.isArray(task.checklist)) {
    hasOverdueStep = task.checklist.some((step: any) => {
      if (!step.due_date || step.completed) return false;
      try {
        const stepDate = parseISO(step.due_date);
        return isPast(stepDate) && !isToday(stepDate);
      } catch { return false; }
    });
  }
  return mainTaskOverdue || hasOverdueStep;
};

export const isTaskDueToday = (task: Task) => {
  let mainTaskDueToday = false;
  if (task.due_date && !task.status.toLowerCase().includes("conclu")) {
    const dueDate = parseDueDate(task.due_date);
    mainTaskDueToday = isToday(dueDate);
  }
  let hasStepDueToday = false;
  if (task.checklist && Array.isArray(task.checklist)) {
    hasStepDueToday = task.checklist.some((step: any) => {
      if (!step.due_date || step.completed) return false;
      try {
        const stepDate = parseISO(step.due_date);
        return isToday(stepDate);
      } catch { return false; }
    });
  }
  return mainTaskDueToday || hasStepDueToday;
};

export const filterAndSortTasks = (
  tasks: Task[],
  filters: ReturnType<typeof useDashboardFilters>,
) => {
  const {
    statusFilter, environmentFilter, subjectFilter,
    groupWorkFilter, overdueFilter, dueTodayFilter, debouncedSearch, sortBy,
  } = filters;

  return tasks.filter(task => {
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
      case "overdue_first": {
        const aOverdue = isTaskOverdue(a);
        const bOverdue = isTaskOverdue(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return parseDueDate(a.due_date).getTime() - parseDueDate(b.due_date).getTime();
      }
      case "subject":
        return a.subject_name.localeCompare(b.subject_name);
      default:
        return 0;
    }
  });
};
