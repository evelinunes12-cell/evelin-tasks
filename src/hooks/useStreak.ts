import { useMemo } from 'react';
import { Task } from '@/services/tasks';
import { parseISO, isToday, isYesterday, differenceInDays, startOfDay } from 'date-fns';

interface StreakResult {
  currentStreak: number;
  completedToday: boolean;
  completedYesterday: boolean;
}

export const useStreak = (tasks: Task[]): StreakResult => {
  return useMemo(() => {
    // Filtra tarefas concluídas (status contém "conclu")
    const completedTasks = tasks.filter(task => 
      task.status.toLowerCase().includes('conclu') && task.updated_at
    );

    if (completedTasks.length === 0) {
      return { currentStreak: 0, completedToday: false, completedYesterday: false };
    }

    // Agrupa por data de conclusão (updated_at)
    const completionDates = new Set<string>();
    
    completedTasks.forEach(task => {
      if (task.updated_at) {
        const date = startOfDay(parseISO(task.updated_at)).toISOString();
        completionDates.add(date);
      }
    });

    // Converte para array ordenado (mais recente primeiro)
    const sortedDates = Array.from(completionDates)
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    if (sortedDates.length === 0) {
      return { currentStreak: 0, completedToday: false, completedYesterday: false };
    }

    const today = startOfDay(new Date());
    const completedToday = sortedDates.some(d => isToday(d));
    const completedYesterday = sortedDates.some(d => isYesterday(d));

    // Calcula a sequência
    let streak = 0;
    let checkDate = completedToday ? today : (completedYesterday ? startOfDay(new Date(today.getTime() - 86400000)) : null);

    if (!checkDate) {
      // Não completou hoje nem ontem - streak é 0
      return { currentStreak: 0, completedToday, completedYesterday };
    }

    // Conta dias consecutivos
    for (const date of sortedDates) {
      const daysDiff = differenceInDays(checkDate, date);
      
      if (daysDiff === 0) {
        streak++;
        checkDate = new Date(checkDate.getTime() - 86400000); // Dia anterior
      } else if (daysDiff === 1) {
        // Dia anterior ao esperado, ainda na sequência
        streak++;
        checkDate = new Date(date.getTime() - 86400000);
      } else {
        // Quebrou a sequência
        break;
      }
    }

    return { currentStreak: streak, completedToday, completedYesterday };
  }, [tasks]);
};
