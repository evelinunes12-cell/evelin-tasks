import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle2, Activity, Filter, ListTodo, Percent, UserX, Trophy, Mail, Clock, TrendingDown, UserCheck } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  cohort_retention: { cohort_week: string; cohort_size: number; retention_d1: number; retention_d7: number; retention_d30: number }[];
  usage_heatmap: { day_of_week: number; hour: number; activity_count: number }[];
  churn_rate: { week_date: string; inactive_7d: number; inactive_14d: number; inactive_30d: number }[];
}

const statCards = [
  { key: "total_users" as const, label: "Usuários Totais", icon: Users, color: "text-primary" },
  { key: "total_tasks_created" as const, label: "Tarefas Criadas", icon: ListTodo, color: "text-blue-500" },
  { key: "total_completed_tasks" as const, label: "Tarefas Concluídas", icon: CheckCircle2, color: "text-success" },
  { key: "active_users_today" as const, label: "Ativos Hoje", icon: Activity, color: "text-warning" },
  { key: "inactive_users" as const, label: "Inativos (7d)", icon: UserX, color: "text-destructive" },
];

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
};

const AdminDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params: Record<string, string> = {};
    if (dateRange?.from) params.p_start_date = startOfDay(dateRange.from).toISOString();
    if (dateRange?.to) params.p_end_date = endOfDay(dateRange.to).toISOString();

    if (
      dateRange?.from &&
      dateRange?.to &&
      startOfDay(dateRange.from).getTime() > endOfDay(dateRange.to).getTime()
    ) {
      setLoadError("Intervalo de datas inválido.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_admin_dashboard_metrics", params);

    if (error) {
      const fallback = await supabase.rpc("get_admin_stats", params);
      if (fallback.error || !fallback.data) {
        const message = fallback.error?.message || error.message || "Falha ao carregar métricas do painel administrativo.";
        setLoadError(message);
        setStats(null);
        toast({
          variant: "destructive",
          title: "Erro ao carregar painel administrativo",
          description: "Não foi possível buscar as métricas globais. Verifique suas permissões de admin e tente novamente.",
        });
        console.error("[AdminDashboard] metrics fetch failed", { error, fallbackError: fallback.error, params });
      } else {
        setStats(fallback.data as unknown as AdminStats);
      }
      setLoading(false);
      return;
    }

    if (data) {
      setStats(data as unknown as AdminStats);
    } else {
      setStats(null);
    }

    setLoading(false);
  }, [dateRange, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const toChartLabel = (value: string) => format(new Date(value), "dd/MM", { locale: ptBR });
  const toDisplayDate = (value: string) => format(new Date(value), "dd/MM/yyyy", { locale: ptBR });

  const newUsersChartData = stats?.new_users_chart?.map((d) => ({
    ...d,
    label: toChartLabel(d.date),
  })) ?? [];

  const tasksChartData = stats?.tasks_created_chart?.map((d) => ({
    ...d,
    label: toChartLabel(d.date),
  })) ?? [];

  const churnChartData = stats?.churn_rate?.map((d) => ({
    ...d,
    label: toChartLabel(d.week_date),
  })) ?? [];

  // Build heatmap grid: 7 days x 24 hours
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxVal = 1;
    stats?.usage_heatmap?.forEach((h) => {
      grid[h.day_of_week][h.hour] = h.activity_count;
      if (h.activity_count > maxVal) maxVal = h.activity_count;
    });
    return { grid, maxVal };
  }, [stats?.usage_heatmap]);

  const getHeatColor = (value: number, max: number) => {
    if (value === 0) return 'hsl(var(--muted))';
    const intensity = value / max;
    if (intensity < 0.25) return 'hsl(var(--primary) / 0.2)';
    if (intensity < 0.5) return 'hsl(var(--primary) / 0.4)';
    if (intensity < 0.75) return 'hsl(var(--primary) / 0.65)';
    return 'hsl(var(--primary) / 0.9)';
  };

  const isFiltering = !!(dateRange?.from || dateRange?.to);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-bold">Visão Geral</h1>
        </div>
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
      {loadError && !loading && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          {loadError}
        </p>
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
                  <Tooltip contentStyle={tooltipStyle} />
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
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" name="Tarefas criadas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== NEW REPORTS ===== */}

      {/* Cohort Retention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="h-5 w-5 text-primary" />
            Cohort de Retenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : !stats?.cohort_retention?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem dados de retenção no período</p>
          ) : (
            <div className="rounded-lg border bg-card overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semana do Cadastro</TableHead>
                    <TableHead className="text-center">Tamanho</TableHead>
                    <TableHead className="text-center">D+1</TableHead>
                    <TableHead className="text-center">D+7</TableHead>
                    <TableHead className="text-center">D+30</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.cohort_retention.map((c, i) => (
                    <TableRow key={i}>
                          <TableCell className="font-medium text-sm">
                        {toDisplayDate(c.cohort_week)}
                      </TableCell>
                      <TableCell className="text-center text-sm">{c.cohort_size}</TableCell>
                      <TableCell className="text-center">
                        <RetentionBadge value={c.retention_d1} />
                      </TableCell>
                      <TableCell className="text-center">
                        <RetentionBadge value={c.retention_d7} />
                      </TableCell>
                      <TableCell className="text-center">
                        <RetentionBadge value={c.retention_d30} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Heatmap + Churn Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Heatmap */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Heatmap de Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-2">
                {/* Hour labels */}
                <div className="flex items-center gap-0.5 ml-10">
                  {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                    <span
                      key={h}
                      className="text-[10px] text-muted-foreground"
                      style={{ width: `${(3 / 24) * 100}%`, minWidth: 0 }}
                    >
                      {h}h
                    </span>
                  ))}
                </div>
                {/* Grid */}
                {DAY_LABELS.map((day, dayIdx) => (
                  <div key={dayIdx} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-9 text-right shrink-0">{day}</span>
                    <div className="flex gap-0.5 flex-1">
                      {Array.from({ length: 24 }, (_, hour) => (
                        <div
                          key={hour}
                          className="flex-1 aspect-square rounded-sm min-w-0 cursor-default"
                          style={{ backgroundColor: getHeatColor(heatmapData.grid[dayIdx][hour], heatmapData.maxVal) }}
                          title={`${day} ${hour}h — ${heatmapData.grid[dayIdx][hour]} atividades`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {/* Legend */}
                <div className="flex items-center justify-end gap-1 pt-2">
                  <span className="text-[10px] text-muted-foreground mr-1">Menos</span>
                  {[0, 0.2, 0.4, 0.65, 0.9].map((opacity, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: i === 0
                          ? 'hsl(var(--muted))'
                          : `hsl(var(--primary) / ${opacity})`,
                      }}
                    />
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-1">Mais</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Churn Rate Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Evolução de Churn
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : !churnChartData.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem dados de churn no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={churnChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="inactive_7d" name="Inativos 7d" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="inactive_14d" name="Inativos 14d" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="inactive_30d" name="Inativos 30d" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 2 }} />
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
                          {toDisplayDate(u.last_seen)}
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

function RetentionBadge({ value }: { value: number | null }) {
  const v = value ?? 0;
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  if (v >= 50) variant = "default";
  else if (v > 0 && v < 25) variant = "destructive";

  return (
    <Badge variant={variant} className="text-xs font-mono min-w-[3rem] justify-center">
      {v}%
    </Badge>
  );
}

export default AdminDashboard;
