import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchStudySchedules } from "@/services/studySchedules";
import { addDays, format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function TodayScheduleCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDow = selectedDate.getDay();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["study-schedules-today", user?.id, selectedDow],
    queryFn: async () => {
      if (!user) return [];
      const all = await fetchStudySchedules(user.id);
      return all
        .filter(s => s.day_of_week === selectedDow)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const formatTime = (t: string) => t.slice(0, 5);

  const goToPrevDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(prev => addDays(prev, -1));
  };

  const goToNextDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(prev => addDays(prev, 1));
  };

  const dayLabel = isToday(selectedDate)
    ? "Hoje"
    : format(selectedDate, "dd/MM", { locale: ptBR });

  return (
    <Card className="h-full cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/planner")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Agenda
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goToPrevDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground min-w-[60px] text-center">
              {dayLabel} · {DAY_LABELS[selectedDow].slice(0, 3)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goToNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum horário fixo para {isToday(selectedDate) ? "hoje" : DAY_LABELS[selectedDow].toLowerCase()}.</p>
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
