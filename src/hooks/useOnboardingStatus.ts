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

      // Check if onboarding was already completed (persistent DB flag)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("onboarding_completed, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      // If already marked as completed in DB, don't show guide ever again
      if (profileData?.onboarding_completed) {
        return null;
      }

      const [
        subjects,
        tasks,
        studySchedules,
        studyCycles,
        plannerNotes,
        ownedEnvironments,
        memberEnvironments,
      ] = await Promise.all([
        supabase.from("subjects").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("study_schedules").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("study_cycles").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("planner_notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("shared_environments").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("environment_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      const hasAvatar = !!profileData?.avatar_url;
      const hasSubjects = (subjects.count || 0) > 0;
      const hasTasks = (tasks.count || 0) > 0;
      const hasStudySchedule = (studySchedules.count || 0) > 0;
      const hasStudyCycle = (studyCycles.count || 0) > 0;
      const hasPlannerNotes = (plannerNotes.count || 0) > 0;
      const hasEnvironment = ((ownedEnvironments.count || 0) > 0) || ((memberEnvironments.count || 0) > 0);

      const steps: OnboardingStep[] = [
        { id: 1, label: "Atualizar foto de perfil", completed: hasAvatar, link: "/settings" },
        { id: 2, label: "Criar primeira disciplina", completed: hasSubjects, link: "/subjects" },
        { id: 3, label: "Criar primeira tarefa", completed: hasTasks, link: "/task/new" },
        { id: 4, label: "Montar grade horária", completed: hasStudySchedule, link: "/planner" },
        { id: 5, label: "Criar Ciclo de Estudos", completed: hasStudyCycle, link: "/estudos/ciclo" },
        { id: 6, label: "Criar uma anotação", completed: hasPlannerNotes, link: "/planner" },
        { id: 7, label: "Criar grupo de trabalho", completed: hasEnvironment, link: "/shared-environments" },
      ];

      const completedCount = steps.filter(s => s.completed).length;
      const progress = (completedCount / steps.length) * 100;

      return { steps, progress, completedCount, total: steps.length };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
};
