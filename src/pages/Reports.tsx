import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, CheckCircle2, TrendingUp, Target, BookOpen, ListChecks, Calendar } from "lucide-react";
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
import { format, subDays, startOfDay, isWithinInterval, parseISO, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

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

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", user?.id],
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

  const analytics = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        totalTasks: 0,
        completionRate: 0,
        completedLast30Days: 0,
        weeklyData: [],
        subjectData: [],
        statusData: [],
        monthlyData: [],
      };
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status?.toLowerCase().includes("conclu")
    );
    const completionRate = Math.round((completedTasks.length / totalTasks) * 100);

    // Completed in last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);
    const completedLast30Days = completedTasks.filter((t) => {
      if (!t.updated_at) return false;
      const updatedDate = parseISO(t.updated_at);
      return updatedDate >= thirtyDaysAgo;
    }).length;

    // Weekly productivity (last 7 days)
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = completedTasks.filter((t) => {
        if (!t.updated_at) return false;
        const updatedDate = parseISO(t.updated_at);
        return isWithinInterval(updatedDate, { start: dayStart, end: dayEnd });
      }).length;

      weeklyData.push({
        day: weekDays[day.getDay()],
        fullDate: format(day, "dd/MM", { locale: ptBR }),
        tarefas: count,
      });
    }

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

    // Status distribution
    const statusMap = new Map<string, number>();
    tasks.forEach((t) => {
      const status = t.status || "Sem status";
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    const statusData = Array.from(statusMap.entries()).map(([name, value]) => {
      const statusInfo = statuses?.find((s) => s.name === name);
      return {
        name,
        value,
        color: statusInfo?.color || "hsl(var(--muted-foreground))",
      };
    });

    // Monthly evolution (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const createdCount = tasks.filter((t) => {
        if (!t.created_at) return false;
        const createdDate = parseISO(t.created_at);
        return isWithinInterval(createdDate, { start: monthStart, end: monthEnd });
      }).length;

      const completedCount = completedTasks.filter((t) => {
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
      completedLast30Days,
      weeklyData,
      subjectData,
      statusData,
      monthlyData,
    };
  }, [tasks, statuses]);

  if (tasksLoading) {
    return (
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Relatórios</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
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
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Relatórios</h1>
          </div>
          <Card className="py-16">
            <CardContent className="text-center">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Sem dados suficientes</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Comece criando suas primeiras tarefas para visualizar estatísticas
                detalhadas sobre sua produtividade e desempenho.
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
        {/* Header */}
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">
              Analise seu desempenho e produtividade
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Tarefas
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalTasks}</div>
              <p className="text-xs text-muted-foreground">tarefas criadas</p>
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
              <div className="text-3xl font-bold text-green-600">
                {analytics.completionRate}%
              </div>
              <p className="text-xs text-muted-foreground">de tarefas concluídas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Últimos 30 dias
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {analytics.completedLast30Days}
              </div>
              <p className="text-xs text-muted-foreground">tarefas concluídas</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Productivity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Produtividade Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.weeklyData.some((d) => d.tarefas > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
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
                  Nenhuma tarefa concluída nos últimos 7 dias
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
                <ResponsiveContainer width="100%" height={280}>
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
                  Sem dados de disciplinas
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Funil de Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
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
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  Sem dados de status
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Evolution */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Evolução Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.monthlyData.some((d) => d.criadas > 0 || d.concluidas > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
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
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Sem dados de evolução mensal
                </div>
              )}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default Reports;
