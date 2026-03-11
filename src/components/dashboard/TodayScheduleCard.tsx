import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CalendarClock } from "lucide-react";
import { fetchStudySchedules } from "@/services/studySchedules";

export function TodayScheduleCard() {
  const { user } = useAuth();
  const todayDow = new Date().getDay();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["study-schedules-today", user?.id, todayDow],
    queryFn: async () => {
      if (!user) return [];
      const all = await fetchStudySchedules(user.id);
      return all
        .filter(s => s.day_of_week === todayDow)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const formatTime = (t: string) => t.slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          Agenda do Dia
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum horário fixo para hoje.</p>
        ) : (
          <ul className="space-y-2">
            {schedules.map(s => (
              <li key={s.id} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.color || "hsl(var(--primary))" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(s.start_time)} – {formatTime(s.end_time)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
