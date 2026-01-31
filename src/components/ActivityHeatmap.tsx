import { useMemo } from "react";
import { format, eachDayOfInterval, isSameDay, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  completedTasks: { updated_at: string | null }[];
  focusSessions: { started_at: string }[];
  fromDate: Date;
  toDate: Date;
}

export const ActivityHeatmap = ({
  completedTasks,
  focusSessions,
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

      const isActive = hasCompletedTask || hasFocusSession;

      return {
        date: day,
        isActive,
        hasTask: hasCompletedTask,
        hasFocus: hasFocusSession,
      };
    });
  }, [completedTasks, focusSessions, fromDate, toDate]);

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
                          ? ` - ${day.hasTask ? "Tarefa concluída" : ""}${
                              day.hasTask && day.hasFocus ? " e " : ""
                            }${day.hasFocus ? "Sessão de foco" : ""}`
                          : " - Sem atividade"
                      }`}
                      className={cn(
                        "w-4 h-4 rounded-sm transition-all cursor-default",
                        day.isActive
                          ? day.hasTask && day.hasFocus
                            ? "bg-orange-500"
                            : day.hasTask
                              ? "bg-green-500"
                              : "bg-primary"
                          : "bg-muted"
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
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span>Tarefa concluída</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span>Sessão de foco</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-orange-500" />
              <span>Ambos</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
