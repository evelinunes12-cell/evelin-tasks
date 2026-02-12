import { useMemo } from "react";
import { format, eachDayOfInterval, isSameDay, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  completedTasks: { updated_at: string | null }[];
  focusSessions: { started_at: string }[];
  createdTasks: { created_at: string | null }[];
  updatedTasks: { updated_at: string | null }[];
  plannerNotes: { created_at: string; updated_at: string }[];
  plannerGoals: { created_at: string; updated_at: string }[];
  fromDate: Date;
  toDate: Date;
}

export const ActivityHeatmap = ({
  completedTasks,
  focusSessions,
  createdTasks,
  updatedTasks,
  plannerNotes,
  plannerGoals,
  fromDate,
  toDate,
}: ActivityHeatmapProps) => {
  const activityData = useMemo(() => {
    const days = eachDayOfInterval({ start: fromDate, end: toDate });

    return days.map((day) => {
      const dayStart = startOfDay(day);

      const hasCompletedTask = completedTasks.some((task) => {
        if (!task.updated_at) return false;
        return isSameDay(parseISO(task.updated_at), dayStart);
      });

      const hasFocusSession = focusSessions.some((session) => {
        return isSameDay(parseISO(session.started_at), dayStart);
      });

      const hasCreatedTask = createdTasks.some((task) => {
        if (!task.created_at) return false;
        return isSameDay(parseISO(task.created_at), dayStart);
      });

      const hasUpdatedTask = updatedTasks.some((task) => {
        if (!task.updated_at) return false;
        return isSameDay(parseISO(task.updated_at), dayStart);
      });

      const hasPlannerActivity = [...plannerNotes, ...plannerGoals].some((item) => {
        return (
          isSameDay(parseISO(item.created_at), dayStart) ||
          isSameDay(parseISO(item.updated_at), dayStart)
        );
      });

      const isActive = hasCompletedTask || hasFocusSession || hasCreatedTask || hasUpdatedTask || hasPlannerActivity;

      // Build activity labels
      const activities: string[] = [];
      if (hasCompletedTask) activities.push("Tarefa concluída");
      if (hasCreatedTask && !hasCompletedTask) activities.push("Tarefa criada");
      if (hasUpdatedTask && !hasCompletedTask && !hasCreatedTask) activities.push("Tarefa atualizada");
      if (hasFocusSession) activities.push("Sessão de foco");
      if (hasPlannerActivity) activities.push("Planejamento");

      // Determine intensity level
      const activityCount = [hasCompletedTask, hasFocusSession, hasCreatedTask || hasUpdatedTask, hasPlannerActivity].filter(Boolean).length;

      return {
        date: day,
        isActive,
        hasTask: hasCompletedTask,
        hasFocus: hasFocusSession,
        hasPlanner: hasPlannerActivity,
        hasCreatedOrUpdated: hasCreatedTask || hasUpdatedTask,
        activityCount,
        activities,
      };
    });
  }, [completedTasks, focusSessions, createdTasks, updatedTasks, plannerNotes, plannerGoals, fromDate, toDate]);

  const activeDays = activityData.filter((d) => d.isActive).length;
  const totalDays = activityData.length;
  const consistencyRate = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;

  // Group days by week for display
  const weeks = useMemo(() => {
    const result: typeof activityData[] = [];
    let currentWeek: typeof activityData = [];

    activityData.forEach((day, index) => {
      currentWeek.push(day);
      if (day.date.getDay() === 6 || index === activityData.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    return result;
  }, [activityData]);

  if (activityData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Constância do Foguinho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            Nenhum dado no período selecionado
          </div>
        </CardContent>
      </Card>
    );
  }

  const getColor = (day: typeof activityData[0]) => {
    if (!day.isActive) return "bg-muted";
    if (day.activityCount >= 3) return "bg-orange-600";
    if (day.activityCount === 2) return "bg-orange-500";
    if (day.hasTask) return "bg-green-500";
    if (day.hasFocus) return "bg-primary";
    if (day.hasPlanner) return "bg-violet-500";
    return "bg-emerald-400";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Constância do Foguinho
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {activeDays} de {totalDays} dias ativos
            </span>
            <span className="font-semibold text-orange-500">
              {consistencyRate}% de consistência
            </span>
          </div>

          {/* Heatmap Grid */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-1 min-w-max pb-2">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day) => (
                    <div
                      key={day.date.toISOString()}
                      title={`${format(day.date, "dd/MM/yyyy", { locale: ptBR })}${
                        day.isActive
                          ? ` - ${day.activities.join(", ")}`
                          : " - Sem atividade"
                      }`}
                      className={cn(
                        "w-4 h-4 rounded-sm transition-all cursor-default",
                        getColor(day)
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-muted" />
              <span>Sem atividade</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-400" />
              <span>Tarefa criada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span>Tarefa concluída</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span>Sessão de foco</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-violet-500" />
              <span>Planejamento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-orange-500" />
              <span>2 tipos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-orange-600" />
              <span>3+ tipos</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
