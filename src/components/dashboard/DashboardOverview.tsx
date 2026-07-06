import { useMemo } from "react";
import { Link } from "react-router-dom";
import { addDays, format, isSameDay, startOfToday } from "date-fns";
import { AlertTriangle, CalendarClock, CheckCircle2, Eye, PlayCircle, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type Task, parseDueDate } from "@/services/tasks";
import { isTaskDueToday, isTaskOverdue } from "@/hooks/useDashboardFilters";
import { stripHtml } from "@/utils/sanitize";

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
}

const getFocusRecommendation = (tasks: Task[], completedStatusName: string): FocusRecommendation => {
  const openTasks = tasks.filter((task) => !isCompletedTask(task, completedStatusName));
  const now = new Date();
  const nearLimit = addDays(now, 3);
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

  const subjects = openTasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.subject_name] = (acc[task.subject_name] || 0) + 1;
    return acc;
  }, {});
  const busiestSubject = Object.entries(subjects).sort((a, b) => b[1] - a[1])[0];
  if (busiestSubject) {
    const firstTask = openTasks.find((task) => task.subject_name === busiestSubject[0]);
    return {
      icon: Target,
      title: `Organizar ${busiestSubject[0]}`,
      description: "Essa disciplina concentra mais pendências abertas. Comece quebrando uma tarefa em passos menores.",
      meta: `${busiestSubject[1]} pendência${busiestSubject[1] > 1 ? "s" : ""}`,
      tone: "default",
      taskId: firstTask?.id,
    };
  }

  return {
    icon: PlayCircle,
    title: "Iniciar uma sessão de estudos",
    description: "Sua fila está leve. Use alguns minutos para revisar conteúdos ou planejar o próximo ciclo.",
    meta: "Sugestão amigável",
    tone: "success",
  };
};

export function DashboardOverview({ username, tasks, completedStatusName }: DashboardOverviewProps) {
  const today = useMemo(() => new Date(), []);
  const todayTasks = useMemo(() => tasks.filter((task) => isTaskDueToday(task)), [tasks]);
  const overdueTasks = useMemo(() => tasks.filter(isTaskOverdue), [tasks]);
  const completedToday = useMemo(
    () => tasks.filter((task) => isCompletedTask(task, completedStatusName) && isSameDay(new Date(task.updated_at), today)),
    [completedStatusName, tasks, today],
  );
  const openTasks = useMemo(() => tasks.filter((task) => !isCompletedTask(task, completedStatusName)), [completedStatusName, tasks]);
  const inProgressTasks = useMemo(() => openTasks.filter(isInProgressTask), [openTasks]);
  const todoTasks = useMemo(() => openTasks.filter((task) => !isInProgressTask(task)), [openTasks]);
  const focus = useMemo(() => getFocusRecommendation(tasks, completedStatusName), [completedStatusName, tasks]);
  const FocusIcon = focus.icon;
  const allDoneToday = todayTasks.length === 0 && overdueTasks.length === 0;

  return (
    <section className="mb-6 space-y-4" aria-labelledby="dashboard-greeting">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit gap-1"><Sparkles className="h-3.5 w-3.5" /> Painel do dia</Badge>
              <h1 id="dashboard-greeting" className="text-3xl font-bold tracking-tight text-foreground">
                {getGreeting()}, {username} 👋
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                {allDoneToday
                  ? "Parabéns! Você concluiu todas as tarefas previstas para hoje."
                  : "Veja o que merece sua atenção agora e organize seu estudo com tranquilidade."}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[480px]">
              <Metric icon={CalendarClock} label="Para hoje" value={todayTasks.length} tone="today" />
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
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><FocusIcon className="h-5 w-5" /></div>
            <div className="space-y-1">
              <Badge variant={focus.tone === "destructive" ? "destructive" : "secondary"}>{focus.meta}</Badge>
              <h2 className="text-lg font-semibold text-foreground">{focus.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-3">{focus.description}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {focus.taskId && (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={`/task/${focus.taskId}`}><Eye className="h-4 w-4" /> Ver tarefa</Link>
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

const TONE_STYLES: Record<"todo" | "progress" | "done", { icon: string; value: string }> = {
  todo: { icon: "text-muted-foreground", value: "text-foreground" },
  progress: { icon: "text-warning", value: "text-warning" },
  done: { icon: "text-success", value: "text-success" },
};

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Target; label: string; value: number; tone: "todo" | "progress" | "done" }) {
  const styles = TONE_STYLES[tone];
  return (
    <div className="rounded-xl border bg-background/70 p-3">
      <Icon className={cn("mb-1 h-4 w-4", styles.icon)} />
      <p className={cn("text-2xl font-bold", styles.value)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
