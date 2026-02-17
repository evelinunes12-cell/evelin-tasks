import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Achievement {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  required_value: number;
  gradient_from: string;
  gradient_to: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export const useAchievements = () => {
  const { user } = useAuth();

  const allQuery = useQuery({
    queryKey: ["achievements"],
    queryFn: async (): Promise<Achievement[]> => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("required_value", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const unlockedQuery = useQuery({
    queryKey: ["user-achievements", user?.id],
    queryFn: async (): Promise<UserAchievement[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  const unlockMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_achievements")
        .insert({ user_id: user.id, achievement_id: achievementId });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
    },
  });

  return {
    achievements: allQuery.data || [],
    unlocked: unlockedQuery.data || [],
    isLoading: allQuery.isLoading || unlockedQuery.isLoading,
    unlock: unlockMutation.mutateAsync,
  };
};
