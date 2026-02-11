import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { registerActivity } from "@/services/activity";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, StickyNote, CalendarDays, Target } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { startOfWeek, format, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  fetchNotes,
  fetchNotesForWeek,
  createNote,
  updateNote,
  deleteNote,
  fetchGoals,
  fetchGoalsForWeek,
  createGoal,
  updateGoal,
  deleteGoal,
  PlannerNote,
  PlannerGoal,
} from "@/services/planner";
import { fetchSubjects, Subject } from "@/services/subjects";
import { NoteCard } from "@/components/planner/NoteCard";
import { NoteDialog } from "@/components/planner/NoteDialog";
import { GoalCard } from "@/components/planner/GoalCard";
import { GoalDialog } from "@/components/planner/GoalDialog";
import { WeeklyView } from "@/components/planner/WeeklyView";

const Planner = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [tab, setTab] = useState("notes");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PlannerNote | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PlannerGoal | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [prefillDate, setPrefillDate] = useState<string | null>(null);

  // Redirect if not logged in
  if (!loading && !user) {
    navigate("/auth");
    return null;
  }

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
    enabled: !!user,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["planner-notes"],
    queryFn: fetchNotes,
    enabled: !!user,
  });

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndStr = format(weekEndDate, "yyyy-MM-dd");

  const { data: weekNotes = [] } = useQuery({
    queryKey: ["planner-notes-week", weekStartStr],
    queryFn: () => fetchNotesForWeek(weekStartStr, weekEndStr),
    enabled: !!user && tab === "weekly",
  });

  const { data: weekGoals = [] } = useQuery({
    queryKey: ["planner-goals-week", weekStartStr],
    queryFn: () => fetchGoalsForWeek(weekStartStr, weekEndStr),
    enabled: !!user && tab === "weekly",
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["planner-goals"],
    queryFn: fetchGoals,
    enabled: !!user,
  });

  // Note mutations
  const createNoteMut = useMutation({
    mutationFn: (data: Parameters<typeof createNote>[1]) => createNote(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-notes"] });
      queryClient.invalidateQueries({ queryKey: ["planner-notes-week"] });
      if (user) registerActivity(user.id);
      queryClient.invalidateQueries({ queryKey: ["user-streak"] });
      toast.success("Anotação criada!");
    },
    onError: () => toast.error("Erro ao criar anotação"),
  });

  const updateNoteMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof updateNote>[1]) => updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-notes"] });
      queryClient.invalidateQueries({ queryKey: ["planner-notes-week"] });
      if (user) registerActivity(user.id);
      queryClient.invalidateQueries({ queryKey: ["user-streak"] });
      toast.success("Anotação atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar anotação"),
  });

  const deleteNoteMut = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-notes"] });
      queryClient.invalidateQueries({ queryKey: ["planner-notes-week"] });
      toast.success("Anotação removida!");
    },
    onError: () => toast.error("Erro ao remover anotação"),
  });

  const togglePinMut = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => updateNote(id, { pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-notes"] });
      queryClient.invalidateQueries({ queryKey: ["planner-notes-week"] });
    },
  });

  // Goal mutations
  const createGoalMut = useMutation({
    mutationFn: (data: Parameters<typeof createGoal>[1]) => createGoal(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-goals"] });
      queryClient.invalidateQueries({ queryKey: ["planner-goals-week"] });
      if (user) registerActivity(user.id);
      queryClient.invalidateQueries({ queryKey: ["user-streak"] });
      toast.success("Meta criada!");
    },
    onError: () => toast.error("Erro ao criar meta"),
  });

  const updateGoalMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof updateGoal>[1]) => updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-goals"] });
      queryClient.invalidateQueries({ queryKey: ["planner-goals-week"] });
      if (user) registerActivity(user.id);
      queryClient.invalidateQueries({ queryKey: ["user-streak"] });
      toast.success("Meta atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar meta"),
  });

  const deleteGoalMut = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-goals"] });
      queryClient.invalidateQueries({ queryKey: ["planner-goals-week"] });
      toast.success("Meta removida!");
    },
    onError: () => toast.error("Erro ao remover meta"),
  });

  const handleSaveNote = (data: { title: string; content: string; subject_id: string | null; planned_date: string | null }) => {
    if (editingNote) {
      updateNoteMut.mutate({ id: editingNote.id, ...data });
    } else {
      createNoteMut.mutate(data);
    }
    setEditingNote(null);
    setPrefillDate(null);
  };

  const handleSaveGoal = (data: { title: string; description: string | null; subject_id: string | null; target_date: string | null }) => {
    if (editingGoal) {
      updateGoalMut.mutate({ id: editingGoal.id, ...data });
    } else {
      createGoalMut.mutate(data);
    }
    setEditingGoal(null);
  };

  const openNewNote = (date?: string) => {
    setEditingNote(null);
    setPrefillDate(date || null);
    setNoteDialogOpen(true);
  };

  const openEditNote = (note: PlannerNote) => {
    setEditingNote(note);
    setPrefillDate(null);
    setNoteDialogOpen(true);
  };

  const openNewGoal = () => {
    setEditingGoal(null);
    setGoalDialogOpen(true);
  };

  const openEditGoal = (goal: PlannerGoal) => {
    setEditingGoal(goal);
    setGoalDialogOpen(true);
  };

  // Build prefilled note for dialog
  const prefillNote = editingNote || (prefillDate ? { planned_date: prefillDate } as PlannerNote : null);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg font-bold">Planner</h1>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="notes" className="gap-1.5">
                <StickyNote className="h-4 w-4" />
                {!isMobile && "Notas"}
              </TabsTrigger>
              <TabsTrigger value="weekly" className="gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {!isMobile && "Semanal"}
              </TabsTrigger>
              <TabsTrigger value="goals" className="gap-1.5">
                <Target className="h-4 w-4" />
                {!isMobile && "Metas"}
              </TabsTrigger>
            </TabsList>

            <Button
              size="sm"
              onClick={() => {
                if (tab === "goals") openNewGoal();
                else openNewNote();
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {tab === "goals" ? "Nova Meta" : "Nova Nota"}
            </Button>
          </div>

          <TabsContent value="notes" className="mt-4">
            {notes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma anotação ainda.</p>
                <p className="text-xs">Clique em "Nova Nota" para começar!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {notes.map((note) => (
                   <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={openEditNote}
                    onDelete={(id) => deleteNoteMut.mutate(id)}
                    onTogglePin={(id, pinned) => togglePinMut.mutate({ id, pinned })}
                    onToggleComplete={(id, completed) => updateNoteMut.mutate({ id, completed })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <WeeklyView
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              notes={weekNotes}
              goals={weekGoals}
              onAddNote={(date) => openNewNote(date)}
              onEditNote={openEditNote}
              onDeleteNote={(id) => deleteNoteMut.mutate(id)}
              onTogglePin={(id, pinned) => togglePinMut.mutate({ id, pinned })}
              onToggleNoteComplete={(id, completed) => updateNoteMut.mutate({ id, completed })}
              onEditGoal={openEditGoal}
              onToggleGoalComplete={(id, completed, progress) =>
                updateGoalMut.mutate({ id, completed, progress })
              }
            />
          </TabsContent>

          <TabsContent value="goals" className="mt-4">
            {goals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma meta definida.</p>
                <p className="text-xs">Defina metas para acompanhar seu progresso!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={openEditGoal}
                    onDelete={(id) => deleteGoalMut.mutate(id)}
                    onToggleComplete={(id, completed) =>
                      updateGoalMut.mutate({ id, completed, progress: completed ? 100 : goal.progress })
                    }
                    onProgressChange={(id, progress) =>
                      updateGoalMut.mutate({ id, progress })
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        note={prefillNote}
        subjects={subjects}
        onSave={handleSaveNote}
      />

      <GoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        goal={editingGoal}
        subjects={subjects}
        onSave={handleSaveGoal}
      />
    </div>
  );
};

export default Planner;
