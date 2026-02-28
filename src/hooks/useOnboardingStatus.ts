import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface OnboardingStep {
  id: number;
  label: string;
  completed: boolean;
  link: string;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  progress: number;
  completedCount: number;
  total: number;
}

export const useOnboardingStatus = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["onboarding-status", user?.id],
    queryFn: async (): Promise<OnboardingStatus | null> => {
      if (!user) return null;

      // Execute all checks in parallel for speed
      const [
        subjects,
        tasks,
        completedTasks,
        profile,
        ownedEnvironments,
        memberEnvironments,
        plannerNotes,
        studySchedules,
        studyCycles,
      ] = await Promise.all([
        // 1. Has subjects?
        supabase.from("subjects").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        // 2. Has tasks?
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        // 3. Completed a task?
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id).ilike("status", "%conclu%"),
        // 4. Has avatar and pomodoro sessions?
        supabase.from("profiles").select("avatar_url, pomodoro_sessions").eq("id", user.id).maybeSingle(),
        // 5. Owns an environment?
        supabase.from("shared_environments").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        // 6. Is member of an environment?
        supabase.from("environment_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        // 7. Has planner notes?
        supabase.from("planner_notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        // 8. Has study schedules?
        supabase.from("study_schedules").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        // 9. Has study cycles?
        supabase.from("study_cycles").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      const hasSubjects = (subjects.count || 0) > 0;
      const hasTasks = (tasks.count || 0) > 0;
      const hasCompletedTask = (completedTasks.count || 0) > 0;
      const hasAvatar = !!profile.data?.avatar_url;
      const hasUsedPomodoro = ((profile.data?.pomodoro_sessions as number) || 0) > 0;
      const hasEnvironment = ((ownedEnvironments.count || 0) > 0) || ((memberEnvironments.count || 0) > 0);
      const hasPlannerNotes = (plannerNotes.count || 0) > 0;
      const hasStudySchedule = (studySchedules.count || 0) > 0;
      const hasStudyCycle = (studyCycles.count || 0) > 0;

      const steps: OnboardingStep[] = [
        { id: 1, label: "Criar primeira disciplina", completed: hasSubjects, link: "/subjects" },
        { id: 2, label: "Criar primeira tarefa", completed: hasTasks, link: "/task/new" },
        { id: 3, label: "Adicionar foto de perfil", completed: hasAvatar, link: "/settings" },
        { id: 4, label: "Criar grupo de trabalho", completed: hasEnvironment, link: "/shared-environments" },
        { id: 5, label: "Completar um ciclo Pomodoro", completed: hasUsedPomodoro, link: "/estudos/pomodoro" },
        { id: 6, label: "Concluir uma tarefa", completed: hasCompletedTask, link: "/dashboard" },
        { id: 7, label: "Criar uma nota no Planner", completed: hasPlannerNotes, link: "/planner" },
        { id: 8, label: "Montar sua Grade Horária", completed: hasStudySchedule, link: "/estudos/grade" },
        { id: 9, label: "Criar um Ciclo de Estudos", completed: hasStudyCycle, link: "/estudos/ciclo" },
      ];

      const completedCount = steps.filter(s => s.completed).length;
      const progress = (completedCount / steps.length) * 100;

      return { steps, progress, completedCount, total: steps.length };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
