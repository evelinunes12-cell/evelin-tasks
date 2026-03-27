import { format, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlannerNote, PlannerGoal } from "@/services/planner";
import { StudySchedule } from "@/services/studySchedules";
import { Task } from "@/services/tasks";
import { Clock, StickyNote, Target, ClipboardList, Pencil, Trash2, Check, RotateCcw, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DayDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  schedules: StudySchedule[];
  notes: PlannerNote[];
  goals: PlannerGoal[];
  tasks: Task[];
  filters: { schedules: boolean; notes: boolean; goals: boolean; tasks: boolean };
  onEditNote: (note: PlannerNote) => void;
  onEditGoal: (goal: PlannerGoal) => void;
  onEditSchedule: (schedule: StudySchedule) => void;
  onClickTask: (task: Task) => void;
  onDeleteNote: (id: string) => void;
  onDeleteGoal: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
  onToggleNoteComplete: (id: string, completed: boolean) => void;
  onToggleGoalComplete: (id: string, completed: boolean) => void;
  onCreateNote: (date: string) => void;
  onCreateGoal: () => void;
}

export function DayDetailSheet({
  open,
  onOpenChange,
  date,
  schedules,
  notes,
  goals,
  tasks,
  filters,
  onEditNote,
  onEditGoal,
  onEditSchedule,
  onClickTask,
  onDeleteNote,
  onDeleteGoal,
  onDeleteSchedule,
  onToggleNoteComplete,
  onToggleGoalComplete,
  onCreateNote,
  onCreateGoal,
}: DayDetailSheetProps) {
  if (!date) return null;

  const dateStr = format(date, "yyyy-MM-dd");
  const dow = getDay(date);

  const daySchedules = filters.schedules
    ? schedules.filter((s) => s.day_of_week === dow).sort((a, b) => a.start_time.localeCompare(b.start_time))
    : [];
  const dayNotes = filters.notes
    ? notes.filter((n) => (n.planned_date || format(new Date(n.created_at), "yyyy-MM-dd")) === dateStr)
    : [];
  const dayGoals = filters.goals
    ? goals.filter((g) => g.target_date === dateStr)
    : [];
  const dayTasks = filters.tasks
    ? tasks.filter((t) => t.due_date === dateStr && !t.is_archived)
    : [];

  const isEmpty = daySchedules.length === 0 && dayNotes.length === 0 && dayGoals.length === 0 && dayTasks.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-left">
            {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-6 space-y-6">
            {/* Quick add buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { onCreateNote(dateStr); onOpenChange(false); }}>
                <Plus className="h-3.5 w-3.5" />
                <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                Anotação
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { onCreateGoal(); onOpenChange(false); }}>
                <Plus className="h-3.5 w-3.5" />
                <Target className="h-3.5 w-3.5 text-emerald-500" />
                Meta
              </Button>
            </div>

            {isEmpty && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum evento neste dia.
              </p>
            )}

            {/* Schedules */}
            {daySchedules.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-semibold">Horários</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{daySchedules.length}</Badge>
                </div>
                <div className="space-y-2">
                  {daySchedules.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-blue-500/5 hover:bg-blue-500/10 transition-colors"
                      style={s.color ? { borderLeftColor: s.color, borderLeftWidth: 3 } : undefined}
                    >
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { onEditSchedule(s); onOpenChange(false); }}>
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {s.type === "fixed" ? "Fixo" : "Variável"}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir horário</AlertDialogTitle>
                            <AlertDialogDescription>Tem certeza que deseja excluir este horário? Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteSchedule(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {daySchedules.length > 0 && (dayTasks.length > 0 || dayNotes.length > 0 || dayGoals.length > 0) && <Separator />}

            {/* Tasks */}
            {dayTasks.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-violet-500" />
                  <h3 className="text-sm font-semibold">Tarefas</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{dayTasks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {dayTasks.map((t) => {
                    const isCompleted = t.status === "completed";
                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-lg border bg-violet-500/5 hover:bg-violet-500/10 transition-colors cursor-pointer ${isCompleted ? "opacity-60" : ""}`}
                        onClick={() => { onClickTask(t); onOpenChange(false); }}
                      >
                        <p className={`text-sm font-medium ${isCompleted ? "line-through" : ""}`}>
                          {t.subject_name}
                        </p>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {t.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {t.status === "completed" ? "Concluída" : t.status === "in_progress" ? "Em andamento" : "Pendente"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {dayTasks.length > 0 && (dayNotes.length > 0 || dayGoals.length > 0) && <Separator />}

            {/* Notes */}
            {dayNotes.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Anotações</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{dayNotes.length}</Badge>
                </div>
                <div className="space-y-2">
                  {dayNotes.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg border bg-amber-500/5 transition-colors ${n.completed ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${n.completed ? "line-through" : ""}`}>
                            {n.title || "Sem título"}
                          </p>
                          {n.content && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                              {n.content}
                            </p>
                          )}
                          {n.subject && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1.5"
                              style={n.subject.color ? { borderColor: n.subject.color, color: n.subject.color } : undefined}
                            >
                              {n.subject.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => onToggleNoteComplete(n.id, !n.completed)}>
                            {n.completed ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { onEditNote(n); onOpenChange(false); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir anotação</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteNote(n.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {dayNotes.length > 0 && dayGoals.length > 0 && <Separator />}

            {/* Goals */}
            {dayGoals.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold">Metas</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{dayGoals.length}</Badge>
                </div>
                <div className="space-y-2">
                  {dayGoals.map((g) => (
                    <div
                      key={g.id}
                      className={`p-3 rounded-lg border bg-emerald-500/5 transition-colors ${g.completed ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${g.completed ? "line-through" : ""}`}>
                            {g.title}
                          </p>
                          {g.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {g.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            {g.subject && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0"
                                style={g.subject.color ? { borderColor: g.subject.color, color: g.subject.color } : undefined}
                              >
                                {g.subject.name}
                              </Badge>
                            )}
                            {!g.completed && (
                              <span className="text-[10px] text-muted-foreground">{g.progress}%</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => onToggleGoalComplete(g.id, !g.completed)}>
                            {g.completed ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { onEditGoal(g); onOpenChange(false); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir meta</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteGoal(g.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
