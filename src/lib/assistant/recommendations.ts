import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Flag,
  History,
  PlayCircle,
  RefreshCw,
  Sparkles,
  StickyNote,
  Target,
} from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { type Task, parseDueDate } from "@/services/tasks";
import { isTaskOverdue } from "@/hooks/useDashboardFilters";
import { stripHtml } from "@/utils/sanitize";

/**
 * Academic Assistant — recommendation engine.
 *
 * Pure, data-driven logic that inspects the data the system already has
 * (tasks, study cycles, variable events, goals and notes) and returns a
 * SINGLE, supportive "next best action" for the student.
 *
 * No new business rules, no generative AI: only interpretation of existing
 * data. The tone is always welcoming and never blaming.
 */

export type AssistantCategory = "task" | "cycle" | "event" | "goal" | "note" | "clear";
export type AssistantTone = "default" | "destructive" | "success" | "warning";

export interface AssistantAction {
  label: string;
  to: string;
}

export interface AssistantRecommendation {
  id: string;
  category: AssistantCategory;
  icon: LucideIcon;
  meta: string;
  title: string;
  message: string;
  tone: AssistantTone;
  primaryAction: AssistantAction;
  secondaryAction?: AssistantAction;
}

// ---- Minimal data shapes (reuse existing query results) --------------------

export interface AssistantCycle {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  end_date: string | null;
  /** Epoch ms of the most recent focus session linked to this cycle (if any). */
  lastActivityAt?: number | null;
}

export interface AssistantEvent {
  id: string;
  title: string;
  /** yyyy-MM-dd */
  specific_date: string | null;
  start_time: string;
}

export interface AssistantNote {
  id: string;
  title: string;
  planned_date: string | null;
}

export interface AssistantGoal {
  id: string;
  title: string;
  target_date: string | null;
}

export interface AssistantInput {
  tasks: Task[];
  cycles: AssistantCycle[];
  events: AssistantEvent[];
  goals: AssistantGoal[];
  notes: AssistantNote[];
  completedStatusName: string;
  now?: Date;
}

// ---- Thresholds (tuned to be gentle, not alarmist) -------------------------

const NEAR_DUE_DAYS = 2; // vence hoje / amanhã / depois
const IN_PROGRESS_STALE_DAYS = 7; // em andamento há muitos dias
const CREATED_STALE_DAYS = 14; // criada há muito tempo sem atualização
const CYCLE_IDLE_DAYS = 4; // ciclo sem novos registros
const CYCLE_NEAR_END_DAYS = 3; // ciclo perto da data final
const GOAL_NEAR_DAYS = 3; // meta próxima do vencimento

// ---- Helpers ---------------------------------------------------------------

const isCompleted = (task: Task, completedStatusName: string) => {
  const s = task.status.toLowerCase();
  return s === completedStatusName.toLowerCase() || s.includes("conclu");
};

const isInProgress = (task: Task) => {
  const s = task.status.toLowerCase();
  return s.includes("andamento") || s.includes("progresso") || s.includes("progress");
};

const description = (task: Task, fallback: string) => stripHtml(task.description ?? "").trim() || fallback;

const daysSince = (isoOrMs: string | number, now: Date) => {
  const date = typeof isoOrMs === "number" ? new Date(isoOrMs) : new Date(isoOrMs);
  return differenceInCalendarDays(now, date);
};

const parsePlanner = (dateStr: string): Date => {
  // Planner dates may be yyyy-MM-dd or full ISO; normalize to local date.
  const datePart = dateStr.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const dueLabel = (days: number) => {
  if (days <= 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
};

// ---- Engine ----------------------------------------------------------------

export function buildAssistantRecommendation(input: AssistantInput): AssistantRecommendation {
  const now = input.now ?? new Date();
  const { tasks, cycles, events, goals, notes, completedStatusName } = input;

  const openTasks = tasks.filter((t) => !isCompleted(t, completedStatusName));

  // 1. TAREFAS -------------------------------------------------------------
  // 1a. Próximas do vencimento (hoje / amanhã / depois de amanhã)
  const nearDue = openTasks
    .filter((t) => t.due_date && !isTaskOverdue(t))
    .map((t) => ({ task: t, days: differenceInCalendarDays(parseDueDate(t.due_date), now) }))
    .filter(({ days }) => days >= 0 && days <= NEAR_DUE_DAYS)
    .sort((a, b) => a.days - b.days)[0];
  if (nearDue) {
    const { task, days } = nearDue;
    return {
      id: `task-due-${task.id}`,
      category: "task",
      icon: CalendarClock,
      meta: `${task.subject_name} · vence ${dueLabel(days)}`,
      title: `Sua prioridade pode ser ${task.subject_name}`,
      message: description(task, `Essa entrega de ${task.subject_name} vence ${dueLabel(days)}. Que tal dar o próximo passo agora?`),
      tone: days === 0 ? "warning" : "default",
      primaryAction: { label: "Abrir tarefa", to: `/task/${task.id}` },
    };
  }

  // 1b. Atrasadas
  const overdue = openTasks
    .filter((t) => t.due_date && isTaskOverdue(t))
    .sort((a, b) => parseDueDate(a.due_date).getTime() - parseDueDate(b.due_date).getTime())[0];
  if (overdue) {
    const days = Math.abs(differenceInCalendarDays(parseDueDate(overdue.due_date), now));
    return {
      id: `task-overdue-${overdue.id}`,
      category: "task",
      icon: AlertTriangle,
      meta: `${overdue.subject_name} · pendente há ${days} ${days === 1 ? "dia" : "dias"}`,
      title: `Que tal retomar ${overdue.subject_name}?`,
      message: description(overdue, `Essa tarefa de ${overdue.subject_name} ficou para trás. Um pequeno passo já ajuda a colocá-la em dia.`),
      tone: "destructive",
      primaryAction: { label: "Abrir tarefa", to: `/task/${overdue.id}` },
    };
  }

  // 1c. Em andamento há muitos dias
  const stalledInProgress = openTasks
    .filter((t) => isInProgress(t) && daysSince(t.updated_at, now) >= IN_PROGRESS_STALE_DAYS)
    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())[0];
  if (stalledInProgress) {
    const days = daysSince(stalledInProgress.updated_at, now);
    return {
      id: `task-stalled-${stalledInProgress.id}`,
      category: "task",
      icon: History,
      meta: `${stalledInProgress.subject_name} · em andamento há ${days} dias`,
      title: `Vale a pena retomar ${stalledInProgress.subject_name}`,
      message: description(stalledInProgress, `Você tem uma tarefa em andamento há ${days} dias. Talvez seja um bom momento para dar continuidade.`),
      tone: "default",
      primaryAction: { label: "Abrir tarefa", to: `/task/${stalledInProgress.id}` },
    };
  }

  // 1d. Criada há muito tempo sem atualização
  const forgotten = openTasks
    .filter((t) => daysSince(t.created_at, now) >= CREATED_STALE_DAYS && daysSince(t.updated_at, now) >= CREATED_STALE_DAYS)
    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())[0];
  if (forgotten) {
    const days = daysSince(forgotten.updated_at, now);
    return {
      id: `task-forgotten-${forgotten.id}`,
      category: "task",
      icon: RefreshCw,
      meta: `${forgotten.subject_name} · sem atualização há ${days} dias`,
      title: `Que tal revisar ${forgotten.subject_name}?`,
      message: description(forgotten, `Essa tarefa está parada há um tempo. Vale a pena revisar se ela ainda faz sentido ou dar o próximo passo.`),
      tone: "default",
      primaryAction: { label: "Abrir tarefa", to: `/task/${forgotten.id}` },
    };
  }

  // 2. CICLOS DE ESTUDO ----------------------------------------------------
  const activeCycles = cycles.filter((c) => c.is_active);

  // 2a. Ciclo próximo da data final
  const cycleNearEnd = activeCycles
    .filter((c) => c.end_date)
    .map((c) => ({ cycle: c, days: differenceInCalendarDays(parsePlanner(c.end_date!), now) }))
    .filter(({ days }) => days >= 0 && days <= CYCLE_NEAR_END_DAYS)
    .sort((a, b) => a.days - b.days)[0];
  if (cycleNearEnd) {
    const { cycle, days } = cycleNearEnd;
    return {
      id: `cycle-end-${cycle.id}`,
      category: "cycle",
      icon: AlarmClock,
      meta: `Ciclo · termina ${dueLabel(days)}`,
      title: `Reta final do ciclo "${cycle.name}"`,
      message: `Seu ciclo "${cycle.name}" termina ${dueLabel(days)}. Você está em um bom momento para consolidar os estudos.`,
      tone: "default",
      primaryAction: { label: "Abrir ciclo", to: "/estudos/ciclo" },
      secondaryAction: { label: "Registrar estudo", to: "/estudos/pomodoro" },
    };
  }

  // 2b. Ciclo sem novos registros há muitos dias
  const idleCycle = activeCycles
    .map((c) => {
      const ref = c.lastActivityAt ?? new Date(c.created_at).getTime();
      return { cycle: c, days: daysSince(ref, now) };
    })
    .filter(({ days }) => days >= CYCLE_IDLE_DAYS)
    .sort((a, b) => b.days - a.days)[0];
  if (idleCycle) {
    const { cycle, days } = idleCycle;
    return {
      id: `cycle-idle-${cycle.id}`,
      category: "cycle",
      icon: PlayCircle,
      meta: `Ciclo · sem registros há ${days} dias`,
      title: `Que tal retomar o ciclo "${cycle.name}"?`,
      message: `Seu ciclo de estudos "${cycle.name}" está há ${days} dias sem novos registros. Uma sessão curta já mantém o ritmo.`,
      tone: "default",
      primaryAction: { label: "Registrar estudo", to: "/estudos/pomodoro" },
      secondaryAction: { label: "Abrir ciclo", to: "/estudos/ciclo" },
    };
  }

  // 3. EVENTOS VARIÁVEIS (hoje) -------------------------------------------
  const todayEvent = events
    .filter((e) => e.specific_date)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
  if (todayEvent) {
    return {
      id: `event-${todayEvent.id}`,
      category: "event",
      icon: CalendarDays,
      meta: `Evento · hoje às ${todayEvent.start_time.slice(0, 5)}`,
      title: todayEvent.title,
      message: `Você possui um evento agendado para hoje às ${todayEvent.start_time.slice(0, 5)}. Vale a pena conferir sua agenda.`,
      tone: "default",
      primaryAction: { label: "Visualizar agenda", to: "/planner" },
    };
  }

  // 4. METAS ---------------------------------------------------------------
  const goal = goals
    .filter((g) => g.target_date)
    .map((g) => ({ goal: g, days: differenceInCalendarDays(parsePlanner(g.target_date!), now) }))
    .filter(({ days }) => days <= GOAL_NEAR_DAYS)
    .sort((a, b) => a.days - b.days)[0];
  if (goal) {
    const { goal: g, days } = goal;
    const overdueGoal = days < 0;
    return {
      id: `goal-${g.id}`,
      category: "goal",
      icon: Flag,
      meta: overdueGoal ? "Meta · esquecida" : `Meta · vence ${dueLabel(days)}`,
      title: g.title,
      message: overdueGoal
        ? `Essa meta ficou para trás. Que tal retomá-la e seguir avançando no seu objetivo?`
        : `Sua meta vence ${dueLabel(days)}. Pequenos passos hoje aproximam você do objetivo.`,
      tone: "default",
      primaryAction: { label: "Visualizar meta", to: "/planner" },
    };
  }

  // 5. ANOTAÇÕES -----------------------------------------------------------
  const note = notes
    .filter((n) => n.planned_date)
    .sort((a, b) => parsePlanner(a.planned_date!).getTime() - parsePlanner(b.planned_date!).getTime())[0];
  if (note) {
    return {
      id: `note-${note.id}`,
      category: "note",
      icon: StickyNote,
      meta: "Anotação planejada",
      title: note.title,
      message: "Você tem uma anotação planejada. Que tal revisá-la para manter tudo em dia?",
      tone: "default",
      primaryAction: { label: "Ver no planner", to: "/planner" },
    };
  }

  // TUDO EM DIA ------------------------------------------------------------
  return {
    id: "clear",
    category: "clear",
    icon: Sparkles,
    meta: "Tudo em dia",
    title: "Excelente! Você não possui pendências críticas hoje.",
    message: "Aproveite este momento para revisar conteúdos ou adiantar atividades futuras. Você está em um ótimo ritmo!",
    tone: "success",
    primaryAction: { label: "Iniciar foco", to: "/estudos/pomodoro" },
  };
}
