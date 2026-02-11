import { useState, useEffect } from "react";
import { logError } from "@/lib/logger";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Task, parseDueDate } from "@/services/tasks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTaskDialog } from "./ResponsiveTaskDialog";
import {
  Calendar,
  Users,
  ExternalLink,
  Edit,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskQuickViewProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  availableStatuses?: string[];
}

export function TaskQuickView({
  taskId,
  open,
  onOpenChange,
  onStatusChange,
  availableStatuses = [],
}: TaskQuickViewProps) {
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (taskId && open) {
      fetchTask();
    }
  }, [taskId, open]);

  const fetchTask = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (error) throw error;
      setTask(data as unknown as Task);
    } catch (error) {
      logError("Error fetching task", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDueDate = (dateStr: string) => {
    const date = parseDueDate(dateStr);
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const isOverdue =
    task?.due_date &&
    !task.status.toLowerCase().includes("conclu") &&
    (() => {
      const dueDate = parseDueDate(task.due_date);
      return isPast(dueDate) && !isToday(dueDate);
    })();

  const isDueToday =
    task?.due_date &&
    !task.status.toLowerCase().includes("conclu") &&
    (() => {
      const dueDate = parseDueDate(task.due_date);
      return isToday(dueDate);
    })();

  const isCompleted = task?.status.toLowerCase().includes("conclu");

  // Calculate checklist progress
  const checklist = (task?.checklist as any[]) || [];
  const completedItems = checklist.filter((item: any) => item.completed).length;
  const totalItems = checklist.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const handleViewFull = () => {
    onOpenChange(false);
    navigate(`/task/${taskId}`);
  };

  const handleEdit = () => {
    onOpenChange(false);
    navigate(`/task/edit/${taskId}`);
  };

  const handleQuickComplete = () => {
    if (!task || !onStatusChange) return;
    const completedStatus =
      availableStatuses.find((s) => s.toLowerCase().includes("conclu")) ||
      "Concluído";
    onStatusChange(task.id, completedStatus);
    onOpenChange(false);
  };

  return (
    <ResponsiveTaskDialog
      open={open}
      onOpenChange={onOpenChange}
      title={loading ? "Carregando..." : task?.subject_name || "Detalhes da Tarefa"}
      description={loading ? "" : task?.description || undefined}
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : task ? (
        <div className="space-y-6">
          {/* Status & Meta Info */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                isCompleted
                  ? "default"
                  : isOverdue
                  ? "destructive"
                  : "secondary"
              }
              className="gap-1"
            >
              {isCompleted ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : isOverdue ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              {task.status}
            </Badge>

            {task.due_date && (
              <Badge
                variant={isOverdue ? "destructive" : isDueToday ? "default" : "outline"}
                className="gap-1"
              >
                <Calendar className="w-3 h-3" />
                {formatDueDate(task.due_date)}
              </Badge>
            )}

            {task.is_group_work && (
              <Badge variant="outline" className="gap-1">
                <Users className="w-3 h-3" />
                Trabalho em Grupo
              </Badge>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Descrição
              </h4>
              <p className="text-sm">{task.description}</p>
            </div>
          )}

          {/* Group Members */}
          {task.is_group_work && task.group_members && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Membros do Grupo
              </h4>
              <p className="text-sm">{task.group_members}</p>
            </div>
          )}

          {/* Checklist Progress */}
          {totalItems > 0 && (
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Progresso do Checklist</span>
                <span className="text-muted-foreground">
                  {completedItems}/{totalItems} itens
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* External Links */}
          {(task.google_docs_link || task.canva_link) && (
            <div className="flex flex-wrap gap-2">
              {task.google_docs_link && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(task.google_docs_link!, "_blank")}
                  className="gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Google Docs
                </Button>
              )}
              {task.canva_link && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(task.canva_link!, "_blank")}
                  className="gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Canva
                </Button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            {!isCompleted && onStatusChange && (
              <Button
                onClick={handleQuickComplete}
                className="flex-1 gap-2"
                variant="default"
              >
                <CheckCircle2 className="w-4 h-4" />
                Marcar como Concluída
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex-1 gap-2"
            >
              <Edit className="w-4 h-4" />
              Editar
            </Button>
            <Button
              variant="ghost"
              onClick={handleViewFull}
              className="flex-1 gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Ver Completo
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          Tarefa não encontrada.
        </p>
      )}
    </ResponsiveTaskDialog>
  );
}
