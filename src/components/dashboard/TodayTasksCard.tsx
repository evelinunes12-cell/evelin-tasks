import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Task } from "@/services/tasks";
import { isToday, isPast, parseISO } from "date-fns";

interface TodayTasksCardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  completedStatusName: string;
}

export function TodayTasksCard({ tasks, onStatusChange, completedStatusName }: TodayTasksCardProps) {
  const navigate = useNavigate();

  const urgentTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.due_date) return false;
      const isCompleted = t.status.toLowerCase().includes("conclu");
      if (isCompleted) return false;
      const d = parseISO(t.due_date);
      return isToday(d) || isPast(d);
    }).sort((a, b) => {
      const da = a.due_date ? parseISO(a.due_date).getTime() : Infinity;
      const db = b.due_date ? parseISO(b.due_date).getTime() : Infinity;
      return da - db;
    });
  }, [tasks]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Prioridades & Entregas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {urgentTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary/50" />
            <p className="text-sm text-muted-foreground">Nenhuma entrega urgente. Bom trabalho! 🎉</p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {urgentTasks.slice(0, 8).map(task => {
              const overdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
              return (
                <li key={task.id} className="flex items-start gap-2 group">
                  <Checkbox
                    className="mt-0.5"
                    onCheckedChange={() => onStatusChange(task.id, completedStatusName)}
                  />
                  <button
                    onClick={() => navigate(`/task/${task.id}`)}
                    className="text-left flex-1 min-w-0"
                  >
                    <p className="text-sm font-medium truncate group-hover:underline">{task.subject_name}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                    )}
                  </button>
                  {overdue && (
                    <span className="text-[10px] text-destructive font-medium shrink-0 mt-0.5">Atrasada</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
