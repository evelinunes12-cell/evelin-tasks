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
    if (user && streakData?.isBroken && streakData.rawStreak > 0 && !hasResetRef.current) {
      hasResetRef.current = true;
      
      const resetStreak = async () => {
        toast({
          variant: "destructive",
          title: "Sequência perdida... 🧊",
          description: "Você ficou mais de um dia sem praticar. Sua ofensiva foi zerada.",
        });

        const { error } = await supabase
          .from("profiles")
          .update({ current_streak: 0 })
          .eq("id", user.id);

        if (!error) {
          queryClient.invalidateQueries({ queryKey: ["user-streak"] });
        }
      };

      resetStreak();
    }
  }, [streakData, user, toast, queryClient]);

  useEffect(() => {
    if (streakData && !streakData.isBroken) {
      hasResetRef.current = false;
    }
  }, [streakData?.isBroken]);

  return null;
};

export default StreakKeeper;
