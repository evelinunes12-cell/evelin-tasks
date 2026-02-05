import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, CheckCircle2, TrendingUp, Target, BookOpen, ListChecks, Calendar, Timer, Flame } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { format, subDays, startOfDay, isWithinInterval, parseISO, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { SidebarTrigger } from "@/components/ui/sidebar";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
];

const Reports = () => {
  const { user } = useAuth();
  
  // Date range state - default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const fromDate = dateRange?.from || subDays(new Date(), 30);
  const toDate = dateRange?.to || new Date();

  // Fetch tasks filtered by date range
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks-reports", user?.id, fromDate.toISOString(), toDate.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all tasks for completion analysis (need to check updated_at for completions)
  const { data: allTasks } = useQuery({
    queryKey: ["all-tasks-reports", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: statuses } = useQuery({
    queryKey: ["task_statuses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("task_statuses")
        .select("*")
        .eq("user_id", user.id)
        .order("order_index");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch focus sessions filtered by date range
  const { data: focusSessions, isLoading: focusLoading } = useQuery({
    queryKey: ["focus-sessions", user?.id, fromDate.toISOString(), toDate.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("started_at", fromDate.toISOString())
        .lte("started_at", toDate.toISOString())
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Filter completed tasks that were completed within the date range
  const completedTasksInRange = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter((t) => {
      if (!t.status?.toLowerCase().includes("conclu") || !t.updated_at) return false;
      const updatedDate = parseISO(t.updated_at);
      return isWithinInterval(updatedDate, { start: startOfDay(fromDate), end: toDate });
    });
  }, [allTasks, fromDate, toDate]);

  const analytics = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        totalTasks: 0,
        completionRate: 0,
        completedInRange: 0,
        totalFocusMinutes: 0,
        focusSessionsCount: 0,
        weeklyData: [],
        subjectData: [],
        statusData: [],
        monthlyData: [],
        focusDailyData: [],
      };
    }

    const totalTasks = tasks.length;
    const completedInRange = completedTasksInRange.length;
    const completionRate = totalTasks > 0 ? Math.round((completedInRange / totalTasks) * 100) : 0;

    // Focus stats
    const totalFocusMinutes = focusSessions?.reduce((acc, s) => acc + s.duration_minutes, 0) || 0;
    const focusSessionsCount = focusSessions?.length || 0;

    // Daily productivity within date range
    const days = eachDayOfInterval({ start: fromDate, end: toDate });
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    
    // Weekly data (last 7 days of selected range or full range if < 7 days)
    const recentDays = days.slice(-7);
    const weeklyData = recentDays.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = completedTasksInRange.filter((t) => {
        if (!t.updated_at) return false;
        const updatedDate = parseISO(t.updated_at);
        return isWithinInterval(updatedDate, { start: dayStart, end: dayEnd });
      }).length;

      return {
        day: weekDays[day.getDay()],
        fullDate: format(day, "dd/MM", { locale: ptBR }),
        tarefas: count,
      };
    });

    // Focus daily data
    const focusDailyData = recentDays.map((day) => {
      const dayStart = startOfDay(day);
      
      const sessionsOnDay = focusSessions?.filter((s) => 
        isSameDay(parseISO(s.started_at), dayStart)
      ) || [];

      const minutesOnDay = sessionsOnDay.reduce((acc, s) => acc + s.duration_minutes, 0);

      return {
        day: weekDays[day.getDay()],
        fullDate: format(day, "dd/MM", { locale: ptBR }),
        minutos: minutesOnDay,
        sessoes: sessionsOnDay.length,
      };
    });

    // Subject distribution
    const subjectMap = new Map<string, number>();
    tasks.forEach((t) => {
      const subject = t.subject_name || "Sem disciplina";
      subjectMap.set(subject, (subjectMap.get(subject) || 0) + 1);
    });
    const subjectData = Array.from(subjectMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Status distribution - group children under parents
    const statusMap = new Map<string, number>();
    
    // Build a map of child status -> parent status
    const childToParentMap = new Map<string, string>();
    const parentStatuses = statuses?.filter(s => !s.parent_id) || [];
    const childStatuses = statuses?.filter(s => s.parent_id) || [];
    
    childStatuses.forEach(child => {
      const parent = parentStatuses.find(p => p.id === child.parent_id);
      if (parent) {
        childToParentMap.set(child.name, parent.name);
      }
    });
    
    tasks.forEach((t) => {
      const taskStatus = t.status || "Sem status";
      // If this is a child status, count it under the parent
      const parentName = childToParentMap.get(taskStatus) || taskStatus;
      statusMap.set(parentName, (statusMap.get(parentName) || 0) + 1);
    });
    
    const statusData = Array.from(statusMap.entries()).map(([name, value]) => {
      // Find the parent status info for color
      const statusInfo = parentStatuses.find((s) => s.name === name) || 
                         statuses?.find((s) => s.name === name);
      return {
        name,
        value,
        color: statusInfo?.color || "hsl(var(--muted-foreground))",
      };
    });

    // Monthly evolution (within date range or last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Only include if month overlaps with date range
      if (monthEnd < fromDate || monthStart > toDate) continue;

      const createdCount = tasks.filter((t) => {
        if (!t.created_at) return false;
        const createdDate = parseISO(t.created_at);
        return isWithinInterval(createdDate, { start: monthStart, end: monthEnd });
      }).length;

      const completedCount = completedTasksInRange.filter((t) => {
        if (!t.updated_at) return false;
        const updatedDate = parseISO(t.updated_at);
        return isWithinInterval(updatedDate, { start: monthStart, end: monthEnd });
      }).length;

      monthlyData.push({
        month: format(monthDate, "MMM", { locale: ptBR }),
        fullMonth: format(monthDate, "MMMM 'de' yyyy", { locale: ptBR }),
        criadas: createdCount,
        concluidas: completedCount,
      });
    }

    return {
      totalTasks,
      completionRate,
      completedInRange,
      totalFocusMinutes,
      focusSessionsCount,
      weeklyData,
      subjectData,
      statusData,
      monthlyData,
      focusDailyData,
    };
  }, [tasks, statuses, completedTasksInRange, focusSessions, fromDate, toDate]);

  const isLoading = tasksLoading || focusLoading;

  if (isLoading) {
    return (
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Relatórios</h1>
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const hasNoData = (!tasks || tasks.length === 0) && (!focusSessions || focusSessions.length === 0);

  if (hasNoData) {
    return (
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <BarChart3 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold">Relatórios</h1>
            </div>
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
          <Card className="py-16">
            <CardContent className="text-center">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Sem dados no período</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Não encontramos tarefas ou sessões de foco no período selecionado.
                Tente ajustar as datas ou comece a criar tarefas!
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Date Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Relatórios</h1>
              <p className="text-muted-foreground text-sm">
                Analise seu desempenho e produtividade
              </p>
            </div>
          </div>
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tarefas Criadas
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold">{analytics.totalTasks}</div>
              <p className="text-xs text-muted-foreground">no período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Conclusão
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-green-600">
                {analytics.completionRate}%
              </div>
              <p className="text-xs text-muted-foreground">{analytics.completedInRange} concluídas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sessões de Foco
              </CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-primary">
                {analytics.focusSessionsCount}
              </div>
              <p className="text-xs text-muted-foreground">pomodoros</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tempo Focado
              </CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-orange-500">
                {Math.floor(analytics.totalFocusMinutes / 60)}h {analytics.totalFocusMinutes % 60}m
              </div>
              <p className="text-xs text-muted-foreground">de concentração</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Productivity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Tarefas Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.weeklyData.some((d) => d.tarefas > 0) ? (
                <ResponsiveContainer width="100%" height={300} className="min-h-[250px]">
                  <BarChart data={analytics.weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="text-sm font-medium">
                                {payload[0].payload.fullDate}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {payload[0].value} tarefa(s) concluída(s)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="tarefas"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhuma tarefa concluída no período
                </div>
              )}
            </CardContent>
          </Card>

          {/* Focus Sessions Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                Tempo de Foco Diário
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.focusDailyData.some((d) => d.minutos > 0) ? (
                <ResponsiveContainer width="100%" height={300} className="min-h-[250px]">
                  <AreaChart data={analytics.focusDailyData}>
                    <defs>
                      <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}m`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="text-sm font-medium">
                                {payload[0].payload.fullDate}
                              </p>
                              <p className="text-sm text-primary">
                                {payload[0].value} minutos de foco
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {payload[0].payload.sessoes} sessão(ões)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutos"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorFocus)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhuma sessão de foco no período
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subject Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Distribuição por Disciplina
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.subjectData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} className="min-h-[250px]">
                  <PieChart>
                    <Pie
                      data={analytics.subjectData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name.substring(0, 10)}${name.length > 10 ? "..." : ""} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {analytics.subjectData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="text-sm font-medium">
                                {payload[0].payload.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {payload[0].value} tarefa(s)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Sem dados de disciplinas no período
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Funil de Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300} className="min-h-[250px]">
                  <BarChart data={analytics.statusData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="text-sm font-medium">
                                {payload[0].payload.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {payload[0].value} tarefa(s)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {analytics.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Sem dados de status no período
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Heatmap - Full Width */}
          <div className="lg:col-span-2">
            <ActivityHeatmap
              completedTasks={completedTasksInRange}
              focusSessions={focusSessions || []}
              fromDate={fromDate}
              toDate={toDate}
            />
          </div>

          {/* Monthly Evolution */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Evolução Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.monthlyData.length > 0 && analytics.monthlyData.some((d) => d.criadas > 0 || d.concluidas > 0) ? (
                <>
                  <ResponsiveContainer width="100%" height={300} className="min-h-[250px]">
                    <AreaChart data={analytics.monthlyData}>
                      <defs>
                        <linearGradient id="colorCriadas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorConcluidas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover border rounded-lg shadow-lg p-3">
                                <p className="text-sm font-medium capitalize">
                                  {payload[0].payload.fullMonth}
                                </p>
                                <p className="text-sm text-primary">
                                  {payload[0].value} tarefa(s) criada(s)
                                </p>
                                <p className="text-sm text-green-600">
                                  {payload[1]?.value || 0} tarefa(s) concluída(s)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="criadas"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCriadas)"
                        name="Criadas"
                      />
                      <Area
                        type="monotone"
                        dataKey="concluidas"
                        stroke="#22C55E"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorConcluidas)"
                        name="Concluídas"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm text-muted-foreground">Criadas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm text-muted-foreground">Concluídas</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Sem dados de evolução mensal no período
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default Reports;
