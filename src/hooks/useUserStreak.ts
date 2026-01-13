import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSameDay, parseISO } from "date-fns";
import { logError } from "@/lib/logger";

interface UserStreakResult {
  currentStreak: number;
  completedToday: boolean;
  isLoading: boolean;
}

export const useUserStreak = (userId: string | undefined): UserStreakResult => {
  const { data, isLoading } = useQuery({
    queryKey: ['user-streak', userId],
    queryFn: async () => {
      if (!userId) return { streak: 0, lastActivityDate: null };

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("current_streak, last_activity_date")
        .eq("id", userId)
        .single();

      if (error) {
        logError("Erro ao buscar ofensiva", error);
        return { streak: 0, lastActivityDate: null };
      }

      return {
        streak: profile.current_streak || 0,
        lastActivityDate: profile.last_activity_date
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });

  const today = new Date();
  const completedToday = data?.lastActivityDate 
    ? isSameDay(parseISO(data.lastActivityDate), today) 
    : false;

  return {
    currentStreak: data?.streak || 0,
    completedToday,
    isLoading
  };
};
