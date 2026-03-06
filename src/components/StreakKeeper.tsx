import { useEffect, useRef } from "react";
import { useUserStreak } from "@/hooks/useUserStreak";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const StreakKeeper = () => {
  const { data: streakData } = useUserStreak();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasResetRef = useRef(false);

  useEffect(() => {
    // Só executa se tivermos dados e detectarmos que a sequência quebrou
    // Usa ref para evitar múltiplas execuções
    if (user && streakData?.isBroken && streakData.rawStreak > 0 && !hasResetRef.current) {
      hasResetRef.current = true;
      
      const resetStreak = async () => {
        // 1. Avisar o usuário (UX)
        toast({
          variant: "destructive",
          title: "Sequência perdida... 🧊",
          description: "Você ficou mais de um dia sem praticar. Sua ofensiva foi reiniciada.",
        });

        // 2. Resetar conquistas desbloqueadas
        await supabase
          .from("user_achievements")
          .delete()
          .eq("user_id", user.id);

        // 3. Atualizar o banco para 0 para não avisar de novo no próximo F5
        const { error } = await supabase
          .from("profiles")
          .update({ current_streak: 0 })
          .eq("id", user.id);
          
        if (!error) {
          queryClient.invalidateQueries({ queryKey: ["user-streak"] });
          queryClient.invalidateQueries({ queryKey: ["user-achievements"] });
        }
      };

      resetStreak();
    }
  }, [streakData, user, toast, queryClient]);

  // Reset the ref when streak data changes significantly
  useEffect(() => {
    if (streakData && !streakData.isBroken) {
      hasResetRef.current = false;
    }
  }, [streakData?.isBroken]);

  return null; // Componente invisível
};

export default StreakKeeper;
