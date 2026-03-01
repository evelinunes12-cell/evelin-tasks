import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Task, parseDueDate } from "@/services/tasks";
import { isSameDay, parseISO, isPast, isToday, isValid } from "date-fns";
import { toast } from "sonner";

export const useDashboardNotifications = (tasks: Task[]) => {
  const { user } = useAuth();
  const [, setSearchParams] = useSearchParams();

  const checkOverdueTasks = useCallback(async () => {
    if (!user?.id || tasks.length === 0) return;
    const today = new Date();
    const lastCheckDate = localStorage.getItem(`zenit_last_overdue_check_${user.id}`);
    if (lastCheckDate) {
      const parsed = parseISO(lastCheckDate);
      if (isValid(parsed) && isSameDay(parsed, today)) return;
    }

    const overdueTasksCount = tasks.filter(t => {
      if (!t.due_date || t.status.toLowerCase().includes("conclu")) return false;
      const dueDate = parseDueDate(t.due_date);
      return isPast(dueDate) && !isToday(dueDate);
    }).length;

    let overdueStepsCount = 0;
    tasks.forEach(task => {
      if (task.status.toLowerCase().includes("conclu")) return;
      const steps = (task.checklist as any[]) || [];
      steps.forEach(step => {
        if (step.due_date && !step.completed) {
          try {
            const stepDate = parseISO(step.due_date);
            if (isPast(stepDate) && !isToday(stepDate)) overdueStepsCount++;
          } catch { /* ignore */ }
        }
      });
    });

    if (overdueTasksCount > 0 || overdueStepsCount > 0) {
      let message = "";
      if (overdueTasksCount > 0 && overdueStepsCount > 0) {
        message = `Você tem ${overdueTasksCount} tarefa(s) e ${overdueStepsCount} etapa(s) atrasada(s).`;
      } else if (overdueTasksCount > 0) {
        message = `Você tem ${overdueTasksCount} tarefa(s) atrasada(s).`;
      } else {
        message = `Você tem ${overdueStepsCount} etapa(s) pendente(s) que já venceu(ram).`;
      }
      localStorage.setItem(`zenit_last_overdue_check_${user.id}`, today.toISOString());
      toast.warning("Prazos Vencidos", {
        description: message,
        duration: 6000,
        action: {
          label: "Ver",
          onClick: () => setSearchParams(prev => { prev.set("overdue", "true"); return prev; }),
        },
      });
    }
  }, [user?.id, tasks, setSearchParams]);

  const checkDueTodayTasks = useCallback(async () => {
    if (!user?.id || tasks.length === 0) return;
    const today = new Date();
    const lastCheckToday = localStorage.getItem(`zenit_last_today_check_${user.id}`);
    if (lastCheckToday) {
      const parsed = parseISO(lastCheckToday);
      if (isValid(parsed) && isSameDay(parsed, today)) return;
    }

    const tasksDueTodayCount = tasks.filter(t => {
      if (!t.due_date || t.status.toLowerCase().includes("conclu")) return false;
      return isToday(parseDueDate(t.due_date));
    }).length;

    let stepsDueTodayCount = 0;
    tasks.forEach(task => {
      if (task.status.toLowerCase().includes("conclu")) return;
      const steps = (task.checklist as any[]) || [];
      steps.forEach(step => {
        if (step.due_date && !step.completed) {
          try { if (isToday(parseISO(step.due_date))) stepsDueTodayCount++; } catch { /* ignore */ }
        }
      });
    });

    if (tasksDueTodayCount > 0 || stepsDueTodayCount > 0) {
      let message = "";
      if (tasksDueTodayCount > 0 && stepsDueTodayCount > 0) {
        message = `Você tem ${tasksDueTodayCount} tarefa(s) e ${stepsDueTodayCount} etapa(s) para entregar hoje. Força!`;
      } else if (tasksDueTodayCount > 0) {
        message = `Você tem ${tasksDueTodayCount} tarefa(s) para entregar hoje. Força!`;
      } else {
        message = `Você tem ${stepsDueTodayCount} etapa(s) para concluir hoje. Força!`;
      }
      localStorage.setItem(`zenit_last_today_check_${user.id}`, today.toISOString());
      toast.info("Planejamento do Dia", {
        description: message,
        duration: 6000,
        action: {
          label: "Ver",
          onClick: () => setSearchParams(prev => { prev.set("due", "today"); return prev; }),
        },
      });
    }
  }, [user?.id, tasks, setSearchParams]);

  useEffect(() => {
    if (tasks.length > 0 && user?.id) {
      checkOverdueTasks();
      checkDueTodayTasks();
    }
  }, [tasks, user?.id, checkOverdueTasks, checkDueTodayTasks]);
};
