import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/services/tasks";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, Users, GripVertical, Eye, Archive, Trash2 } from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDueDate } from "@/services/tasks";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface KanbanCardProps {
  task: Task;
  availableStatuses: string[];
  completedStatusName: string;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onArchive: (taskId: string) => void;
  onTaskClick?: (taskId: string) => void;
  isDragging?: boolean;
}

export function KanbanCard({
  task,
  onDelete,
  onArchive,
  onTaskClick,
  isDragging = false,
}: KanbanCardProps) {
  const navigate = useNavigate();
  
  const { attributes, listeners, setNodeRef, transform, isDragging: isCurrentlyDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  // Calculate checklist progress
  const checklist = task.checklist || [];
  const completedItems = checklist.filter((item: any) => item.completed).length;
  const totalItems = checklist.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // Check if overdue
  const isOverdue = task.due_date && !task.status.toLowerCase().includes("conclu") && (() => {
    const dueDate = parseDueDate(task.due_date);
    return isPast(dueDate) && !isToday(dueDate);
  })();

  const isDueToday = task.due_date && !task.status.toLowerCase().includes("conclu") && (() => {
    const dueDate = parseDueDate(task.due_date);
    return isToday(dueDate);
  })();

  const formatDueDate = (dateStr: string) => {
    const date = parseDueDate(dateStr);
    return format(date, "dd MMM", { locale: ptBR });
  };

  if (isDragging) {
    // Render a simpler version for the drag overlay
    return (
      <Card className="cursor-grabbing shadow-xl border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-base line-clamp-1">{task.subject_name}</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all duration-200 group cursor-pointer",
        isCurrentlyDragging && "opacity-50 scale-95",
        !isCurrentlyDragging && "hover:shadow-md hover:-translate-y-1"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Arrastar tarefa"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-1">{task.subject_name}</CardTitle>
            
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {task.due_date && (
                <Badge
                  variant={isOverdue ? "destructive" : isDueToday ? "default" : "secondary"}
                  className="text-xs gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  {formatDueDate(task.due_date)}
                </Badge>
              )}
              {task.is_group_work && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Users className="w-3 h-3" />
                  Grupo
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {task.description}
          </p>
        )}

        {/* Checklist Progress */}
        {totalItems > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{completedItems}/{totalItems}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </CardContent>

      {/* Actions - visible on hover (desktop) or always visible (mobile) */}
      <CardFooter className="pt-0 gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTaskClick ? onTaskClick(task.id) : navigate(`/task/${task.id}`)}
          className="flex-1 h-8"
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          Ver
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onArchive(task.id)}
          className="h-8"
        >
          <Archive className="w-3.5 h-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A tarefa "{task.subject_name}" será excluída permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(task.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
