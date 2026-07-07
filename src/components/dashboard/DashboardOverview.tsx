import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, isSameDay, parseISO, startOfToday } from "date-fns";
import { AlertTriangle, CalendarClock, CheckCircle2, Eye, PlayCircle, Sparkles, StickyNote, Target, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type Task, parseDueDate } from "@/services/tasks";
import { isTaskDueToday, isTaskOverdue } from "@/hooks/useDashboardFilters";
import { stripHtml } from "@/utils/sanitize";

interface DashboardOverviewProps {
  username: string;
  tasks: Task[];
  completedStatusName: string;
}

interface PlannerNote {
  id: string;
  title: string;
  planned_date: string | null;
}

interface PlannerGoal {
  id: string;
  title: string;
  target_date: string | null;
}

const isCompletedTask = (task: Task, completedStatusName: string) => {
  const normalizedStatus = task.status.toLowerCase();
  return normalizedStatus === completedStatusName.toLowerCase() || normalizedStatus.includes("conclu");
};

const isInProgressTask = (task: Task) => {
  const s = task.status.toLowerCase();
  return s.includes("andamento") || s.includes("progresso") || s.includes("progress");
};

const getTaskDescription = (task: Task, fallback: string) => stripHtml(task.description).trim() || fallback;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

interface FocusRecommendation {
  icon: typeof Target;
  title: string;
  description: string;
  meta: string;
  tone: "default" | "destructive" | "success";
  taskId?: string;
  plannerLink?: boolean;
}

const getFocusRecommendation = (
  tasks: Task[],
  notes: PlannerNote[],
  goals: PlannerGoal[],
  completedStatusName: string,
): FocusRecommendation => {
  const openTasks = tasks.filter((task) => !isCompletedTask(task, completedStatusName));
  const now = new Date();
  const nearLimit = addDays(now, 3);

  // 1. Tarefas com data de hoje ou próxima da entrega
  const nextDue = openTasks
    .filter((task) => {
      if (!task.due_date || isTaskOverdue(task)) return false;
      const dueDate = parseDueDate(task.due_date);
      return dueDate <= nearLimit;
    })
    .sort((a, b) => parseDueDate(a.due_date).getTime() - parseDueDate(b.due_date).getTime())[0];
  if (nextDue) {
    return {
      icon: CalendarClock,
      title: "Preparar próxima entrega",
      description: getTaskDescription(nextDue, `Avance na tarefa de ${nextDue.subject_name} antes do prazo.`),
      meta: `${nextDue.subject_name} · vence em ${format(parseDueDate(nextDue.due_date), "dd/MM")}`,
      tone: "default",
      taskId: nextDue.id,
    };
  }

  // 2. Tarefas atrasadas
  const overdue = openTasks
    .filter((task) => task.due_date && isTaskOverdue(task))
    .sort((a, b) => parseDueDate(a.due_date).getTime() - parseDueDate(b.due_date).getTime());
  if (overdue[0]) {
    return {
      icon: AlertTriangle,
      title: "Resolver tarefa atrasada",
      description: getTaskDescription(overdue[0], `Finalize a pendência de ${overdue[0].subject_name}.`),
      meta: `${overdue[0].subject_name} · venceu em ${format(parseDueDate(overdue[0].due_date), "dd/MM")}`,
      tone: "destructive",
      taskId: overdue[0].id,
    };
  }

  // 3. Anotações (sem tarefa com data próxima)
  const nextNote = notes
    .filter((n) => n.planned_date)
    .sort((a, b) => parseISO(a.planned_date!).getTime() - parseISO(b.planned_date!).getTime())[0];
  if (nextNote) {
    return {
      icon: StickyNote,
      title: nextNote.title,
      description: "Você tem uma anotação planejada. Revise e conclua para manter o dia em dia.",
      meta: `Anotação · ${format(parseISO(nextNote.planned_date!), "dd/MM")}`,
      tone: "default",
      plannerLink: true,
    };
  }

  // 4. Metas
  const nextGoal = goals
    .filter((g) => g.target_date)
    .sort((a, b) => parseISO(a.target_date!).getTime() - parseISO(b.target_date!).getTime())[0];
  if (nextGoal) {
    return {
      icon: Target,
      title: nextGoal.title,
      description: "Avance nesta meta. Pequenos passos hoje aproximam você do objetivo.",
      meta: `Meta · ${format(parseISO(nextGoal.target_date!), "dd/MM")}`,
      tone: "default",
      plannerLink: true,
    };
  }

  // 5. Sugestão amigável
  return {
    icon: PlayCircle,
    title: "Iniciar uma sessão de estudos",
    description: "Sua fila está leve. Use alguns minutos para revisar conteúdos ou planejar o próximo ciclo.",
    meta: "Sugestão amigável",
    tone: "success",
  };
};

export function DashboardOverview({ username, tasks, completedStatusName }: DashboardOverviewProps) {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);

  const { data: notes = [] } = useQuery({
    queryKey: ["planner-notes-overview", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_notes")
        .select("id, title, planned_date")
        .eq("completed", false)
        .not("planned_date", "is", null);
      if (error) throw error;
      return (data || []) as PlannerNote[];
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
      return (data || []) as PlannerGoal[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

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

  const focus = useMemo(
    () => getFocusRecommendation(tasks, notes, goals, completedStatusName),
    [completedStatusName, tasks, notes, goals],
  );
  const FocusIcon = focus.icon;
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
          <CardTitle className="flex items-center gap-2 text-xl"><Target className="h-5 w-5 text-primary" /> Seu foco de hoje</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 overflow-hidden">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><FocusIcon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1 space-y-1">
              <Badge variant={focus.tone === "destructive" ? "destructive" : "secondary"} className="max-w-full truncate">{focus.meta}</Badge>
              <h2 className="text-lg font-semibold text-foreground line-clamp-2 break-words">{focus.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-2 break-words">{focus.description}</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            {focus.taskId && (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={`/task/${focus.taskId}`}><Eye className="h-4 w-4" /> Ver tarefa</Link>
              </Button>
            )}
            {focus.plannerLink && (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/planner"><Eye className="h-4 w-4" /> Ver no planner</Link>
              </Button>
            )}
            <Button asChild className="w-full sm:w-auto">
              <Link to="/estudos/pomodoro"><PlayCircle className="h-4 w-4" /> Iniciar foco</Link>
            </Button>
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

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Target; label: string; value: number; tone: MetricTone }) {
  const styles = TONE_STYLES[tone];
  return (
    <div className="min-w-0 rounded-xl border bg-background/70 p-3">
      <Icon className={cn("mb-1 h-4 w-4", styles.icon)} />
      <p className={cn("text-2xl font-bold", styles.value)}>{value}</p>
      <p className="break-words text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
