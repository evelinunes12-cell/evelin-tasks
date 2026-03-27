import { useMemo } from "react";
import {
  startOfWeek,
  addDays,
  format,
  isToday,
  getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PlannerNote, PlannerGoal } from "@/services/planner";
import { StudySchedule } from "@/services/studySchedules";
import { Task } from "@/services/tasks";
import { DraggableEventPill } from "./DraggableEventPill";
import { DroppableDayCell } from "./DroppableDayCell";

interface CalendarWeekViewProps {
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

export function CalendarWeekView({
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
}: CalendarWeekViewProps) {
  const days = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
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
    map.forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));
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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="grid grid-cols-7 border-b">
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className="py-3 text-center border-r last:border-r-0">
              <div className="text-xs text-muted-foreground uppercase">
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div
                className={cn(
                  "text-lg font-medium mt-0.5 mx-auto w-9 h-9 flex items-center justify-center rounded-full",
                  today && "bg-primary text-primary-foreground font-bold"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 flex-1">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dow = getDay(day);

          const dayNotes = filters.notes ? notesByDate.get(dateStr) || [] : [];
          const dayGoals = filters.goals ? goalsByDate.get(dateStr) || [] : [];
          const daySchedules = filters.schedules ? schedulesByDow.get(dow) || [] : [];
          const dayTasks = filters.tasks ? tasksByDate.get(dateStr) || [] : [];

          return (
            <DroppableDayCell
              key={dateStr}
              dateStr={dateStr}
              className="border-r last:border-r-0 p-1.5 space-y-1 min-h-[300px] cursor-pointer hover:bg-accent/20 transition-colors"
              onClick={() => onClickDay(day)}
            >
              {daySchedules.map((s) => (
                <DraggableEventPill
                  key={s.id}
                  id={s.id}
                  type="schedule"
                  title={s.title}
                  time={s.start_time?.slice(0, 5)}
                  color={s.color}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClickSchedule(s);
                  }}
                />
              ))}
              {dayTasks.map((t) => (
                <DraggableEventPill
                  key={t.id}
                  id={t.id}
                  type="task"
                  title={t.subject_name}
                  completed={t.status === "completed"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClickTask(t);
                  }}
                />
              ))}
              {dayNotes.map((n) => (
                <DraggableEventPill
                  key={n.id}
                  id={n.id}
                  type="note"
                  title={n.title}
                  completed={n.completed}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClickNote(n);
                  }}
                />
              ))}
              {dayGoals.map((g) => (
                <DraggableEventPill
                  key={g.id}
                  id={g.id}
                  type="goal"
                  title={g.title}
                  completed={g.completed}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClickGoal(g);
                  }}
                />
              ))}
            </DroppableDayCell>
          );
        })}
      </div>
    </div>
  );
}
