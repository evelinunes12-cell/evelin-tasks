import { useMemo } from "react";
import { PlannerNote, PlannerGoal } from "@/services/planner";
import { NoteCard } from "./NoteCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Target, CheckCircle2 } from "lucide-react";
import { format, addDays, addWeeks, subWeeks, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface WeeklyViewProps {
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  notes: PlannerNote[];
  goals?: PlannerGoal[];
  onAddNote: (date: string) => void;
  onEditNote: (note: PlannerNote) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onEditGoal?: (goal: PlannerGoal) => void;
  onToggleGoalComplete?: (id: string, completed: boolean, progress: number) => void;
}

export function WeeklyView({
  weekStart,
  onWeekChange,
  notes,
  goals = [],
  onAddNote,
  onEditNote,
  onDeleteNote,
  onTogglePin,
  onEditGoal,
  onToggleGoalComplete,
}: WeeklyViewProps) {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const notesByDay = useMemo(() => {
    const map = new Map<string, PlannerNote[]>();
    for (const note of notes) {
      if (note.planned_date) {
        const key = note.planned_date;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(note);
      }
    }
    return map;
  }, [notes]);

  const goalsByDay = useMemo(() => {
    const map = new Map<string, PlannerGoal[]>();
    for (const goal of goals) {
      if (goal.target_date) {
        const key = goal.target_date;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(goal);
      }
    }
    return map;
  }, [goals]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => onWeekChange(subWeeks(weekStart, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-medium">
          {format(weekStart, "dd MMM", { locale: ptBR })} – {format(addDays(weekStart, 6), "dd MMM yyyy", { locale: ptBR })}
        </h3>
        <Button variant="outline" size="icon" onClick={() => onWeekChange(addWeeks(weekStart, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayNotes = notesByDay.get(dateStr) || [];
          const dayGoals = goalsByDay.get(dateStr) || [];
          const today = isToday(day);

          return (
            <div
              key={dateStr}
              className={cn(
                "rounded-lg border p-3 min-h-[120px] space-y-2",
                today && "border-primary/50 bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={cn(
                    "text-xs font-medium uppercase",
                    today ? "text-primary" : "text-muted-foreground"
                  )}>
                    {format(day, "EEE", { locale: ptBR })}
                  </span>
                  <span className={cn(
                    "ml-1.5 text-sm font-bold",
                    today && "text-primary"
                  )}>
                    {format(day, "dd")}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onAddNote(dateStr)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-2">
                {dayGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors hover:bg-accent/50",
                      goal.completed && "opacity-60"
                    )}
                    onClick={() => onEditGoal?.(goal)}
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleGoalComplete?.(goal.id, !goal.completed, goal.completed ? goal.progress : 100);
                        }}
                      >
                        {goal.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Target className="h-3.5 w-3.5 text-primary" />
                        )}
                      </button>
                      <span className={cn("font-medium line-clamp-1", goal.completed && "line-through")}>
                        {goal.title}
                      </span>
                    </div>
                    {goal.subject && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 mt-1"
                        style={goal.subject.color ? { borderColor: goal.subject.color, color: goal.subject.color } : undefined}
                      >
                        {goal.subject.name}
                      </Badge>
                    )}
                  </div>
                ))}
                {dayNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={onEditNote}
                    onDelete={onDeleteNote}
                    onTogglePin={onTogglePin}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
