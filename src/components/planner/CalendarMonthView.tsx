import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  getDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { PlannerNote, PlannerGoal } from "@/services/planner";
import { StudySchedule } from "@/services/studySchedules";
import { Task } from "@/services/tasks";
import { DraggableEventPill } from "./DraggableEventPill";
import { DroppableDayCell } from "./DroppableDayCell";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface CalendarMonthViewProps {
  currentDate: Date;
  schedules: StudySchedule[];
  notes: PlannerNote[];
  goals: PlannerGoal[];
  tasks: Task[];
  filters: { schedules: boolean; notes: boolean; goals: boolean; tasks: boolean };
  onClickNote: (note: PlannerNote) => void;
  onClickGoal: (goal: PlannerGoal) => void;
  onClickSchedule: (schedule: StudySchedule) => void;
  onClickTask: (task: Task) => void;
  onClickDay: (date: Date) => void;
}

export function CalendarMonthView({
  currentDate,
  schedules,
  notes,
  goals,
  tasks,
  filters,
  onClickNote,
  onClickGoal,
  onClickSchedule,
  onClickTask,
  onClickDay,
}: CalendarMonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const notesByDate = useMemo(() => {
    const map = new Map<string, PlannerNote[]>();
    notes.forEach((n) => {
      const key = n.planned_date || format(new Date(n.created_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    });
    return map;
  }, [notes]);

  const goalsByDate = useMemo(() => {
    const map = new Map<string, PlannerGoal[]>();
    goals.forEach((g) => {
      if (g.target_date) {
        if (!map.has(g.target_date)) map.set(g.target_date, []);
        map.get(g.target_date)!.push(g);
      }
    });
    return map;
  }, [goals]);

  const schedulesByDow = useMemo(() => {
    const map = new Map<number, StudySchedule[]>();
    schedules.forEach((s) => {
      if (!map.has(s.day_of_week)) map.set(s.day_of_week, []);
      map.get(s.day_of_week)!.push(s);
    });
    return map;
  }, [schedules]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      if (t.due_date && !t.is_archived) {
        if (!map.has(t.due_date)) map.set(t.due_date, []);
        map.get(t.due_date)!.push(t);
      }
    });
    return map;
  }, [tasks]);

  const MAX_VISIBLE = 3;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const dow = getDay(day);

          const dayNotes = filters.notes ? notesByDate.get(dateStr) || [] : [];
          const dayGoals = filters.goals ? goalsByDate.get(dateStr) || [] : [];
          const daySchedules = filters.schedules ? schedulesByDow.get(dow) || [] : [];
          const dayTasks = filters.tasks ? tasksByDate.get(dateStr) || [] : [];

          const allEvents: { type: "schedule" | "note" | "goal" | "task"; item: any; time?: string }[] = [];
          daySchedules.forEach((s) =>
            allEvents.push({ type: "schedule", item: s, time: s.start_time?.slice(0, 5) })
          );
          dayTasks.forEach((t) => allEvents.push({ type: "task", item: t }));
          dayNotes.forEach((n) => allEvents.push({ type: "note", item: n }));
          dayGoals.forEach((g) => allEvents.push({ type: "goal", item: g }));

          const visible = allEvents.slice(0, MAX_VISIBLE);
          const overflow = allEvents.length - MAX_VISIBLE;

          return (
            <DroppableDayCell
              key={dateStr}
              dateStr={dateStr}
              className={cn(
                "border-b border-r p-1 min-h-[90px] cursor-pointer transition-colors hover:bg-accent/30",
                !inMonth && "bg-muted/30"
              )}
              onClick={() => onClickDay(day)}
            >
              <div className="flex justify-end">
                <span
                  className={cn(
                    "text-xs w-6 h-6 flex items-center justify-center rounded-full",
                    today && "bg-primary text-primary-foreground font-bold",
                    !inMonth && "text-muted-foreground/50"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-0.5 mt-0.5">
                {visible.map((ev, i) => (
                  <DraggableEventPill
                    key={`${ev.type}-${ev.item.id}-${i}`}
                    id={ev.item.id}
                    type={ev.type}
                    title={ev.type === "task" ? ev.item.subject_name : ev.item.title}
                    time={ev.time}
                    color={ev.type === "schedule" ? ev.item.color : undefined}
                    completed={
                      ev.type === "goal" ? ev.item.completed
                      : ev.type === "note" ? ev.item.completed
                      : ev.type === "task" ? ev.item.status === "completed"
                      : false
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ev.type === "note") onClickNote(ev.item);
                      else if (ev.type === "goal") onClickGoal(ev.item);
                      else if (ev.type === "task") onClickTask(ev.item);
                      else onClickSchedule(ev.item);
                    }}
                  />
                ))}
                {overflow > 0 && (
                  <span className="text-[10px] text-muted-foreground pl-1">
                    +{overflow} mais
                  </span>
                )}
              </div>
            </DroppableDayCell>
          );
        })}
      </div>
    </div>
  );
}
