// src/services/activity.ts
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isSameDay, subDays, parseISO } from "date-fns";
import { logError } from "@/lib/logger";
export const registerActivity = async (userId: string) => {
  if (!userId) return;

  try {
    // 1. Busca dados atuais
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("current_streak, last_activity_date")
      .eq("id", userId)
      .single();

    if (fetchError) throw fetchError;

    const today = new Date();
    const lastDate = profile.last_activity_date ? parseISO(profile.last_activity_date) : null;
    let newStreak = profile.current_streak || 0;

    // 2. Lógica de Atualização
    if (!lastDate) {
      // Primeira atividade de todas
      newStreak = 1;
      toast.success("Ofensiva iniciada! 🔥");
    } else if (isSameDay(lastDate, today)) {
      // Já fez algo hoje, não muda a ofensiva, só ignora
      return; 
    } else if (isSameDay(lastDate, subDays(today, 1))) {
      // Fez algo ontem, aumenta a ofensiva!
      newStreak += 1;
      toast.success(`Fogo neles! 🔥 Ofensiva: ${newStreak} dias!`);
    } else {
      // Perdeu um dia (ou mais), reseta :(
      newStreak = 1;
      toast("Ofensiva reiniciada! Mantenha o ritmo. 🔥");
    }

    // 3. Salva no Banco
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        current_streak: newStreak,
        last_activity_date: today.toISOString().split('T')[0]
      })
      .eq("id", userId);

    if (updateError) throw updateError;

  } catch (error) {
    logError("Erro ao atualizar ofensiva", error);
  }
};

// Hook para buscar streak atual do banco
export const fetchUserStreak = async (userId: string): Promise<{ streak: number; lastActivityDate: string | null }> => {
  if (!userId) return { streak: 0, lastActivityDate: null };

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("current_streak, last_activity_date")
      .eq("id", userId)
      .single();

    if (error) throw error;

    return {
      streak: profile.current_streak || 0,
      lastActivityDate: profile.last_activity_date
    };
  } catch (error) {
    logError("Erro ao buscar ofensiva", error);
    return { streak: 0, lastActivityDate: null };
  }
};

// Incrementa contador de Pomodoros concluídos
export const incrementPomodoroCount = async (userId: string) => {
  if (!userId) return;

  try {
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("pomodoro_sessions")
      .eq("id", userId)
      .single();

    if (fetchError) throw fetchError;

    const currentSessions = (profile?.pomodoro_sessions as number) || 0;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ pomodoro_sessions: currentSessions + 1 })
      .eq("id", userId);

    if (updateError) throw updateError;
  } catch (error) {
    logError("Erro ao computar Pomodoro", error);
  }
};
