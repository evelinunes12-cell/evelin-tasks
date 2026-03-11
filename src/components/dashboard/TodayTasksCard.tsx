import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, CheckCircle2, StickyNote, Target } from "lucide-react";
import { Task } from "@/services/tasks";
import { isToday, isPast, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface TodayTasksCardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  completedStatusName: string;
}

type UrgentItem = {
  id: string;
  type: "task" | "note" | "goal";
  title: string;
  subtitle?: string;
  date: string;
  overdue: boolean;
  progress?: number;
  link: string;
};

export function TodayTasksCard({ tasks, onStatusChange, completedStatusName }: TodayTasksCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [goalProgress, setGoalProgress] = useState<Record<string, number>>({});

  const { data: notes = [] } = useQuery({
    queryKey: ["planner-notes-today", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_notes")
        .select("id, title, planned_date, completed")
        .eq("completed", false)
        .not("planned_date", "is", null);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["planner-goals-today", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_goals")
        .select("id, title, target_date, completed, progress")
        .eq("completed", false)
        .not("target_date", "is", null);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  const handleCompleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from("planner_notes")
      .update({ completed: true })
      .eq("id", noteId);
    if (error) {
      toast.error("Erro ao concluir anotação");
    } else {
      toast.success("Anotação concluída!");
      queryClient.invalidateQueries({ queryKey: ["planner-notes-today"] });
    }
  };

  const handleGoalProgressCommit = async (goalId: string, value: number) => {
    const completed = value >= 100;
    const { error } = await supabase
      .from("planner_goals")
      .update({ progress: Math.min(value, 100), completed })
      .eq("id", goalId);
    if (error) {
      toast.error("Erro ao atualizar meta");
    } else {
      if (completed) toast.success("Meta concluída! 🎉");
      queryClient.invalidateQueries({ queryKey: ["planner-goals-today"] });
    }
  };

  const urgentItems = useMemo(() => {
    const items: UrgentItem[] = [];

    tasks.forEach(t => {
      if (!t.due_date) return;
      const isCompleted = t.status.toLowerCase().includes("conclu");
      if (isCompleted) return;
      const d = parseISO(t.due_date);
      if (!isToday(d) && !isPast(d)) return;
      items.push({
        id: t.id,
        type: "task",
        title: t.subject_name,
        subtitle: t.description || undefined,
        date: t.due_date,
        overdue: isPast(d) && !isToday(d),
        link: `/task/${t.id}`,
      });
    });

    notes.forEach(n => {
      if (!n.planned_date) return;
      const d = parseISO(n.planned_date);
      if (!isToday(d) && !isPast(d)) return;
      items.push({
        id: n.id,
        type: "note",
        title: n.title,
        date: n.planned_date,
        overdue: isPast(d) && !isToday(d),
        link: "/planner",
      });
    });

    goals.forEach(g => {
      if (!g.target_date) return;
      const d = parseISO(g.target_date);
      if (!isToday(d) && !isPast(d)) return;
      items.push({
        id: g.id,
        type: "goal",
        title: g.title,
        date: g.target_date,
        overdue: isPast(d) && !isToday(d),
        progress: g.progress,
        link: "/planner",
      });
    });

    return items.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [tasks, notes, goals]);

  const typeLabel = (type: UrgentItem["type"]) => {
    if (type === "note") return "Anotação";
    if (type === "goal") return "Meta";
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Prioridades & Entregas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {urgentItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary/50" />
            <p className="text-sm text-muted-foreground">Nenhuma entrega urgente. Bom trabalho! 🎉</p>
          </div>
        ) : (
          <ul className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {urgentItems.slice(0, 10).map(item => (
              <li key={`${item.type}-${item.id}`} className="flex items-start gap-2 group">
                {/* Checkbox / icon */}
                {item.type === "task" ? (
                  <Checkbox
                    className="mt-0.5"
                    onCheckedChange={() => onStatusChange(item.id, completedStatusName)}
                  />
                ) : item.type === "note" ? (
                  <Checkbox
                    className="mt-0.5"
                    onCheckedChange={() => handleCompleteNote(item.id)}
                  />
                ) : (
                  <span className="mt-0.5 flex items-center justify-center w-4 h-4">
                    <Target className="h-3 w-3 text-muted-foreground" />
                  </span>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {item.type === "note" && <StickyNote className="h-3 w-3 text-muted-foreground shrink-0" />}
                    {item.type === "goal" && <Target className="h-3 w-3 text-muted-foreground shrink-0" />}
                    <button
                      onClick={() => navigate(item.link)}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-sm font-medium truncate group-hover:underline">
                        {item.title}
                      </p>
                    </button>
                    {item.overdue && (
                      <span className="text-[10px] text-destructive font-medium shrink-0">Atrasada</span>
                    )}
                  </div>

                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  )}

                  {item.type !== "task" && (
                    <p className="text-[10px] text-muted-foreground">{typeLabel(item.type)}</p>
                  )}

                  {/* Goal progress slider */}
                  {item.type === "goal" && (
                    <div className="flex items-center gap-2 mt-1">
                      <Slider
                        className="flex-1"
                        min={0}
                        max={100}
                        step={5}
                        value={[goalProgress[item.id] ?? item.progress ?? 0]}
                        onValueChange={([v]) => setGoalProgress(prev => ({ ...prev, [item.id]: v }))}
                        onValueCommit={([v]) => handleGoalProgressCommit(item.id, v)}
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {goalProgress[item.id] ?? item.progress ?? 0}%
                      </span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
