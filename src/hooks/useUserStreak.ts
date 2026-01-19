import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { differenceInCalendarDays, parseISO } from "date-fns";

interface UserStreakResult {
  streak: number;
  rawStreak: number;
  lastActivity: Date | null;
  isBroken: boolean;
}

export const useUserStreak = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-streak", user?.id],
    queryFn: async (): Promise<UserStreakResult> => {
      if (!user) return { streak: 0, rawStreak: 0, lastActivity: null, isBroken: false };

      const { data, error } = await supabase
        .from("profiles")
        .select("current_streak, last_activity_date")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      const lastDate = data.last_activity_date ? parseISO(data.last_activity_date) : null;
      const dbStreak = data.current_streak || 0;
      
      // Se nunca usou, retorna dados zerados
      if (!lastDate) return { streak: dbStreak, rawStreak: dbStreak, lastActivity: null, isBroken: false };

      const today = new Date();
      
      // Calcula a diferença de dias corridos (ex: Ontem->Hoje = 1, Anteontem->Hoje = 2)
      const diff = differenceInCalendarDays(today, lastDate);
      
      // Se a diferença for maior que 1, significa que pulou pelo menos um dia inteiro
      const isBroken = diff > 1;

      return {
        streak: isBroken ? 0 : dbStreak, // Se quebrou, mostra 0 na tela imediatamente
        rawStreak: dbStreak,             // O valor que ainda está no banco (para sabermos se precisamos avisar)
        lastActivity: lastDate,
        isBroken                         // Flag para disparar o aviso
      };
    },
    enabled: !!user,
    // Recalcula sempre que focar na janela para garantir que a virada do dia (meia-noite) atualize
    refetchOnWindowFocus: true, 
  });
};
