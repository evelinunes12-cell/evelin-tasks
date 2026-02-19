import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle2, Activity, Filter, ListTodo, Percent, UserX, Trophy, Mail } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface AdminStats {
  total_users: number;
  total_completed_tasks: number;
  active_users_today: number;
  new_users_chart: { date: string; count: number }[];
  total_tasks_created: number;
  completion_rate: number;
  inactive_users: number;
  active_users_list: { email: string; full_name: string | null; last_seen: string }[];
  usage_ranking: { full_name: string | null; email: string; tasks_created: number; tasks_completed: number; focus_sessions: number; score: number }[];
  tasks_created_chart: { date: string; count: number }[];
}

const statCards = [
  { key: "total_users" as const, label: "Usuários Totais", icon: Users, color: "text-primary" },
  { key: "total_tasks_created" as const, label: "Tarefas Criadas", icon: ListTodo, color: "text-blue-500" },
  { key: "total_completed_tasks" as const, label: "Tarefas Concluídas", icon: CheckCircle2, color: "text-success" },
  { key: "active_users_today" as const, label: "Ativos Hoje", icon: Activity, color: "text-warning" },
  { key: "inactive_users" as const, label: "Inativos (7d)", icon: UserX, color: "text-destructive" },
];

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (dateRange?.from) params.p_start_date = dateRange.from.toISOString();
    if (dateRange?.to) params.p_end_date = dateRange.to.toISOString();

    const { data, error } = await supabase.rpc("get_admin_stats", params);
    if (!error && data) {
      setStats(data as unknown as AdminStats);
    }
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const newUsersChartData = stats?.new_users_chart?.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
  })) ?? [];

  const tasksChartData = stats?.tasks_created_chart?.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
  })) ?? [];

  const isFiltering = !!(dateRange?.from || dateRange?.to);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Visão Geral</h1>
        <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {isFiltering && dateRange?.from && dateRange?.to && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Exibindo dados de: {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} até {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
          </Badge>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.key} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-muted">
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground">
                      {stats?.[card.key] ?? 0}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Completion Rate Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-muted">
                <Percent className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Taxa de Conclusão</p>
                {loading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground">
                    {stats?.completion_rate ?? 0}%
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Users Chart */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Novos Usuários</h2>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={newUsersChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Bar dataKey="count" name="Novos usuários" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tasks Created Chart */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Tarefas Criadas por Dia</h2>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={tasksChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Line type="monotone" dataKey="count" name="Tarefas criadas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Users List & Usage Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Usuários Ativos (últimos 7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : !stats?.active_users_list.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário ativo recentemente</p>
            ) : (
              <div className="rounded-lg border bg-card max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Último acesso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.active_users_list.map((u, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{u.full_name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-sm">
                          {format(parseISO(u.last_seen), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Ranking */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-warning" />
              Ranking de Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : !stats?.usage_ranking.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem dados de uso no período</p>
            ) : (
              <div className="rounded-lg border bg-card max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead className="text-center">Criadas</TableHead>
                      <TableHead className="text-center">Concluídas</TableHead>
                      <TableHead className="text-center">Foco</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.usage_ranking.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold text-sm">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{r.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{r.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">{r.tasks_created}</TableCell>
                        <TableCell className="text-center text-sm">{r.tasks_completed}</TableCell>
                        <TableCell className="text-center text-sm">{r.focus_sessions}</TableCell>
                        <TableCell className="text-center font-semibold text-sm">{r.score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
