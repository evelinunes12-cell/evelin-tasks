import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchFocusSessionsWithSubjects } from "@/services/studyAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, BookOpen, CheckCircle, TrendingUp } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { subDays, format, startOfDay, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(200, 80%, 50%)",
  "hsl(340, 75%, 55%)",
  "hsl(170, 60%, 45%)",
  "hsl(25, 95%, 55%)",
  "hsl(280, 60%, 55%)",
];

const StudyAnalyticsPage = () => {
  const { user } = useAuth();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["study-analytics", user?.id],
    queryFn: () => fetchFocusSessionsWithSubjects(user!.id),
    enabled: !!user?.id,
  });

  const analytics = useMemo(() => {
    if (!sessions.length) return null;

    // Total time
    const totalMinutes = sessions.reduce((a, s) => a + s.duration_minutes, 0);
    const totalSessions = sessions.length;

    // Per-subject aggregation
    const subjectMap = new Map<string, { name: string; color: string | null; minutes: number }>();
    sessions.forEach((s) => {
      const key = s.subject_name || "Sem disciplina";
      const existing = subjectMap.get(key);
      if (existing) {
        existing.minutes += s.duration_minutes;
      } else {
        subjectMap.set(key, {
          name: key,
          color: s.subject_color,
          minutes: s.duration_minutes,
        });
      }
    });

    const bySubject = Array.from(subjectMap.values()).sort((a, b) => b.minutes - a.minutes);
    const topSubject = bySubject[0]?.name || "—";

    // Last 7 days
    const today = startOfDay(new Date());
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(today, 6 - i);
      const dayLabel = format(day, "EEE", { locale: ptBR });
      const dayMinutes = sessions
        .filter((s) => isSameDay(parseISO(s.started_at), day))
        .reduce((a, s) => a + s.duration_minutes, 0);
      return { day: dayLabel, minutos: dayMinutes };
    });

    return { totalMinutes, totalSessions, topSubject, bySubject, last7 };
  }, [sessions]);

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}min`;
    return `${h}h ${m}min`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Desempenho de Estudos</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
            <Skeleton className="h-72 rounded-xl sm:col-span-3" />
          </div>
        ) : !analytics ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Nenhuma sessão de estudo registrada ainda.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Use o Pomodoro ou Ciclo de Estudos para começar a acompanhar seu desempenho.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo Total</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatTime(analytics.totalMinutes)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mais Estudada</p>
                    <p className="text-2xl font-bold text-foreground truncate">
                      {analytics.topSubject}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sessões Concluídas</p>
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.totalSessions}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pie chart - time by subject */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tempo por Disciplina</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.bySubject.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.bySubject}
                          dataKey="minutes"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                          labelLine={false}
                        >
                          {analytics.bySubject.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={entry.color || COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [formatTime(value), "Tempo"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Sem dados de disciplinas
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Bar chart - last 7 days */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Estudo nos Últimos 7 Dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.last7}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [formatTime(value), "Estudo"]}
                      />
                      <Bar
                        dataKey="minutos"
                        fill="hsl(var(--primary))"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudyAnalyticsPage;
