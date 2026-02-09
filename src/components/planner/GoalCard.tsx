import { PlannerGoal } from "@/services/planner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, Circle, Pencil, Trash2, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  goal: PlannerGoal;
  onEdit: (goal: PlannerGoal) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onProgressChange: (id: string, progress: number) => void;
}

export function GoalCard({ goal, onEdit, onDelete, onToggleComplete, onProgressChange }: GoalCardProps) {
  const isOverdue = goal.target_date && !goal.completed && new Date(goal.target_date + "T23:59:59") < new Date();

  return (
    <Card className={cn(
      "group transition-all hover:shadow-md",
      goal.completed && "opacity-60"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <button
              onClick={() => onToggleComplete(goal.id, !goal.completed)}
              className="mt-0.5 shrink-0"
            >
              {goal.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-semibold text-sm leading-tight",
                goal.completed && "line-through text-muted-foreground"
              )}>
                {goal.title}
              </h3>
              {goal.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {goal.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(goal.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {!goal.completed && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{goal.progress}%</span>
            </div>
            <Slider
              value={[goal.progress]}
              onValueCommit={(value) => onProgressChange(goal.id, value[0])}
              max={100}
              step={5}
              className="cursor-pointer"
            />
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {goal.subject && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
              style={goal.subject.color ? { borderColor: goal.subject.color, color: goal.subject.color } : undefined}
            >
              {goal.subject.name}
            </Badge>
          )}
          {goal.target_date && (
            <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
              <Target className="h-3 w-3 mr-0.5" />
              {format(new Date(goal.target_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
