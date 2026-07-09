import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay, parseISO } from "date-fns";
import { AlertTriangle, CalendarClock, CheckCircle2, Eye, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type Task } from "@/services/tasks";
import { fetchStudyCycles } from "@/services/studyCycles";
import { fetchStudySchedules } from "@/services/studySchedules";
import { isTaskDueToday, isTaskOverdue } from "@/hooks/useDashboardFilters";
import {
  buildAssistantRecommendation,
  type AssistantCycle,
  type AssistantEvent,
  type AssistantGoal,
  type AssistantNote,
} from "@/lib/assistant/recommendations";

interface DashboardOverviewProps {
  username: string;
  tasks: Task[];
  completedStatusName: string;
}

const isCompletedTask = (task: Task, completedStatusName: string) => {
  const normalizedStatus = task.status.toLowerCase();
  return normalizedStatus === completedStatusName.toLowerCase() || normalizedStatus.includes("conclu");
};

const isInProgressTask = (task: Task) => {
  const s = task.status.toLowerCase();
  return s.includes("andamento") || s.includes("progresso") || s.includes("progress");
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

export function DashboardOverview({ username, tasks, completedStatusName }: DashboardOverviewProps) {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(today, "yyyy-MM-dd"), [today]);

  const { data: notes = [] } = useQuery({
    queryKey: ["planner-notes-overview", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_notes")
        .select("id, title, planned_date")
        .eq("completed", false)
        .not("planned_date", "is", null);
      if (error) throw error;
      return (data || []) as AssistantNote[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["planner-goals-overview", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_goals")
        .select("id, title, target_date")
        .eq("completed", false)
        .not("target_date", "is", null);
      if (error) throw error;
      return (data || []) as AssistantGoal[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  // Ciclos ativos (reutiliza serviço existente).
  const { data: cycles = [] } = useQuery({
    queryKey: ["study-cycles-overview", user?.id],
    queryFn: async () => {
      const all = await fetchStudyCycles();
      return all.filter((c) => c.is_active);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  // Última atividade (sessão de foco) por ciclo, para detectar inatividade.
  const { data: cycleActivity = {} } = useQuery({
    queryKey: ["cycle-activity-overview", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("focus_sessions")
        .select("study_cycle_id, started_at")
        .eq("user_id", user!.id)
        .not("study_cycle_id", "is", null)
        .order("started_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data || []) {
        const id = (row as { study_cycle_id: string | null }).study_cycle_id;
        if (id && !(id in map)) map[id] = new Date((row as { started_at: string }).started_at).getTime();
      }
      return map;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  // Eventos variáveis (evento único) agendados para hoje.
  const { data: todayEvents = [] } = useQuery({
    queryKey: ["variable-events-today-overview", user?.id, todayStr],
    queryFn: async () => {
      if (!user) return [];
      const all = await fetchStudySchedules(user.id);
      return all
        .filter((s) => s.type === "variable" && s.specific_date === todayStr)
        .map((s) => ({ id: s.id, title: s.title, specific_date: s.specific_date ?? null, start_time: s.start_time }));
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  // Métricas do painel do dia
  const todayTasks = useMemo(() => tasks.filter((task) => isTaskDueToday(task)), [tasks]);
  const overdueTasks = useMemo(() => tasks.filter(isTaskOverdue), [tasks]);
  const completedToday = useMemo(
    () => tasks.filter((task) => isCompletedTask(task, completedStatusName) && isSameDay(new Date(task.updated_at), today)),
    [completedStatusName, tasks, today],
  );
  const openTasks = useMemo(() => tasks.filter((task) => !isCompletedTask(task, completedStatusName)), [completedStatusName, tasks]);
  const inProgressTasks = useMemo(() => openTasks.filter(isInProgressTask), [openTasks]);

  const notesToday = useMemo(
    () => notes.filter((n) => n.planned_date && isSameDay(parseISO(n.planned_date), today)),
    [notes, today],
  );
  const goalsToday = useMemo(
    () => goals.filter((g) => g.target_date && isSameDay(parseISO(g.target_date), today)),
    [goals, today],
  );
  const forTodayCount = todayTasks.length + notesToday.length + goalsToday.length;

  const recommendation = useMemo(() => {
    const cyclesWithActivity: AssistantCycle[] = cycles.map((c) => ({
      id: c.id,
      name: c.name,
      is_active: c.is_active,
      created_at: c.created_at,
      end_date: c.end_date,
      lastActivityAt: cycleActivity[c.id] ?? null,
    }));
    return buildAssistantRecommendation({
      tasks,
      cycles: cyclesWithActivity,
      events: todayEvents as AssistantEvent[],
      goals,
      notes,
      completedStatusName,
      now: today,
    });
  }, [tasks, cycles, cycleActivity, todayEvents, goals, notes, completedStatusName, today]);

  const RecIcon = recommendation.icon;
  const allDoneToday = forTodayCount === 0 && overdueTasks.length === 0;

  return (
    <section className="mb-6 min-w-0 space-y-4" aria-labelledby="dashboard-greeting">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="p-5 sm:p-6">
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <Badge variant="secondary" className="w-fit gap-1"><Sparkles className="h-3.5 w-3.5" /> Painel do dia</Badge>
              <h1 id="dashboard-greeting" className="break-words text-3xl font-bold tracking-tight text-foreground">
                {getGreeting()}, {username} 👋
              </h1>
              <p className="max-w-2xl break-words text-muted-foreground">
                {allDoneToday
                  ? "Parabéns! Você concluiu todas as tarefas previstas para hoje."
                  : "Veja o que merece sua atenção agora e organize seu estudo com tranquilidade."}
              </p>
            </div>
            <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto lg:basis-[560px]">
              <Metric icon={CalendarClock} label="Para hoje" value={forTodayCount} tone="today" />
              <Metric icon={Timer} label="Em progresso" value={inProgressTasks.length} tone="progress" />
              <Metric icon={AlertTriangle} label="Atrasadas" value={overdueTasks.length} tone="overdue" />
              <Metric icon={CheckCircle2} label="Concluídas hoje" value={completedToday.length} tone="done" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" /> Assistente Zenit
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 overflow-hidden">
          <div className="flex gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                recommendation.tone === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : recommendation.tone === "success"
                    ? "bg-success/10 text-success"
                    : recommendation.tone === "warning"
                      ? "bg-warning/10 text-warning"
                      : "bg-primary/10 text-primary",
              )}
            >
              <RecIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Badge
                variant={recommendation.tone === "destructive" ? "destructive" : "secondary"}
                className="max-w-full truncate"
              >
                {recommendation.meta}
              </Badge>
              <h2 className="line-clamp-2 break-words text-lg font-semibold text-foreground">{recommendation.title}</h2>
              <p className="line-clamp-2 break-words text-sm text-muted-foreground">{recommendation.message}</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button asChild className="w-full sm:w-auto">
              <Link to={recommendation.primaryAction.to}>
                <Eye className="h-4 w-4" /> {recommendation.primaryAction.label}
              </Link>
            </Button>
            {recommendation.secondaryAction && (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={recommendation.secondaryAction.to}>{recommendation.secondaryAction.label}</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

type MetricTone = "today" | "progress" | "overdue" | "done";

const TONE_STYLES: Record<MetricTone, { icon: string; value: string }> = {
  today: { icon: "text-primary", value: "text-foreground" },
  progress: { icon: "text-warning", value: "text-warning" },
  overdue: { icon: "text-destructive", value: "text-destructive" },
  done: { icon: "text-success", value: "text-success" },
};

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Timer; label: string; value: number; tone: MetricTone }) {
  const styles = TONE_STYLES[tone];
  return (
    <div className="min-w-0 rounded-xl border bg-background/70 p-3">
      <Icon className={cn("mb-1 h-4 w-4", styles.icon)} />
      <p className={cn("text-2xl font-bold", styles.value)}>{value}</p>
      <p className="break-words text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
