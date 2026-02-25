import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchFocusSessionsWithDetails, FocusSessionWithDetails } from "@/services/studyAnalytics";
import { fetchStudyCycles } from "@/services/studyCycles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Clock, Repeat, Timer, CheckCircle, TrendingUp, BookOpen } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { subDays } from "date-fns";
import type { DateRange } from "react-day-picker";

const COLORS = [
  "hsl(262, 83%, 58%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)",
  "hsl(200, 80%, 50%)", "hsl(340, 75%, 55%)", "hsl(170, 60%, 45%)",
  "hsl(25, 95%, 55%)", "hsl(280, 60%, 55%)",
];

type OriginFilter = "all" | "cycle" | "pomodoro";

const StudyAnalyticsPage = () => {
  const { user } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [selectedCycleId, setSelectedCycleId] = useState<string>("all");

  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: ["study-analytics", user?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: () => fetchFocusSessionsWithDetails(user!.id, dateRange?.from, dateRange?.to),
    enabled: !!user?.id,
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["study-cycles-list"],
    queryFn: fetchStudyCycles,
    enabled: !!user?.id,
  });

  // Apply origin + cycle filters
  const sessions = useMemo(() => {
    let filtered = allSessions;

    if (originFilter === "cycle") {
      filtered = filtered.filter((s) => s.study_cycle_id !== null);
    } else if (originFilter === "pomodoro") {
      filtered = filtered.filter((s) => s.study_cycle_id === null);
    }

    if (selectedCycleId !== "all" && originFilter !== "pomodoro") {
      filtered = filtered.filter((s) => s.study_cycle_id === selectedCycleId);
    }

    return filtered;
  }, [allSessions, originFilter, selectedCycleId]);

  const analytics = useMemo(() => {
    const totalMinutes = sessions.reduce((a, s) => a + s.duration_minutes, 0);
    const cycleMinutes = sessions.filter((s) => s.study_cycle_id).reduce((a, s) => a + s.duration_minutes, 0);
    const pomodoroMinutes = sessions.filter((s) => !s.study_cycle_id).reduce((a, s) => a + s.duration_minutes, 0);
    const totalSessions = sessions.length;

    // By subject
    const subjectMap = new Map<string, { name: string; color: string | null; minutes: number }>();
    sessions.forEach((s) => {
      const key = s.subject_name || "Sem Matéria Definida";
      const existing = subjectMap.get(key);
      if (existing) {
        existing.minutes += s.duration_minutes;
      } else {
        subjectMap.set(key, { name: key, color: s.subject_color, minutes: s.duration_minutes });
      }
    });
    const bySubject = Array.from(subjectMap.values()).sort((a, b) => b.minutes - a.minutes);

    // By cycle (only sessions with study_cycle_id)
    const cycleMap = new Map<string, { name: string; minutes: number }>();
    sessions.forEach((s) => {
      if (!s.study_cycle_id || !s.study_cycle_name) return;
      const existing = cycleMap.get(s.study_cycle_id);
      if (existing) {
        existing.minutes += s.duration_minutes;
      } else {
        cycleMap.set(s.study_cycle_id, { name: s.study_cycle_name, minutes: s.duration_minutes });
      }
    });
    const byCycle = Array.from(cycleMap.values()).sort((a, b) => b.minutes - a.minutes);

    return { totalMinutes, cycleMinutes, pomodoroMinutes, totalSessions, bySubject, byCycle };
  }, [sessions]);

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}min`;
    return `${h}h ${m}min`;
  };

  const showCycleFilter = originFilter !== "pomodoro";

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
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Origem</label>
            <Select value={originFilter} onValueChange={(v) => { setOriginFilter(v as OriginFilter); setSelectedCycleId("all"); }}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tudo</SelectItem>
                <SelectItem value="cycle">Apenas Ciclos</SelectItem>
                <SelectItem value="pomodoro">Apenas Pomodoro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showCycleFilter && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ciclo</label>
              <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Ciclos</SelectItem>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
            <Skeleton className="h-72 rounded-xl sm:col-span-2 lg:col-span-4" />
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma sessão de estudo encontrada para o período e filtros selecionados.</p>
              <p className="text-sm text-muted-foreground mt-1">Use o Pomodoro ou Ciclo de Estudos para começar a acompanhar seu desempenho.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Clock} label="Tempo Total" value={formatTime(analytics.totalMinutes)} />
              <KpiCard icon={Repeat} label="Foco em Ciclos" value={formatTime(analytics.cycleMinutes)} />
              <KpiCard icon={Timer} label="Foco em Pomodoro" value={formatTime(analytics.pomodoroMinutes)} />
              <KpiCard icon={CheckCircle} label="Sessões Realizadas" value={String(analytics.totalSessions)} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pie - by subject */}
              <Card>
                <CardHeader><CardTitle className="text-base">Tempo por Disciplina</CardTitle></CardHeader>
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
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {analytics.bySubject.map((entry, index) => (
                            <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatTime(value), "Tempo"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">Sem dados</p>
                  )}
                </CardContent>
              </Card>

              {/* Bar - by cycle */}
              <Card>
                <CardHeader><CardTitle className="text-base">Tempo por Ciclo</CardTitle></CardHeader>
                <CardContent>
                  {analytics.byCycle.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.byCycle}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => [formatTime(value), "Tempo"]} />
                        <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">Nenhum ciclo registrado no período</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default StudyAnalyticsPage;
