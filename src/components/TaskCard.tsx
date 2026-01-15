import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Eye, Trash2, CheckSquare, AlertTriangle, ChevronDown } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { registerActivity } from "@/services/activity";

interface TaskCardProps {
  id: string;
  subjectName: string;
  description?: string;
  dueDate: string | null;
  isGroupWork: boolean;
  status: string;
  checklist?: { text: string; completed: boolean }[];
  availableStatuses?: string[];
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
}

const TaskCard = ({
  id,
  subjectName,
  description,
  dueDate,
  isGroupWork,
  status,
  checklist = [],
  availableStatuses = [],
  onDelete,
  onStatusChange,
}: TaskCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStatusChangeWithActivity = (id: string, newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(id, newStatus);
      // Registra atividade para a ofensiva
      if (user) {
        registerActivity(user.id);
      }
    }
  };
  
  const checklistProgress =
    checklist.length > 0
      ? Math.round((checklist.filter((item) => item.completed).length / checklist.length) * 100)
      : 0;

  // Parse date compensating for timezone (dates are stored as YYYY-MM-DD)
  const parseDueDate = (dateStr: string) => {
    const parts = dateStr.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  };

  // Format date with timezone compensation for display
  const formatDateDisplay = (date: Date) => {
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  const dueDateObj = dueDate ? parseDueDate(dueDate) : null;
  const isOverdue = dueDateObj && isPast(dueDateObj) && !isToday(dueDateObj) && !status.toLowerCase().includes("conclu");
  const isDueToday = dueDateObj && isToday(dueDateObj);
  const isDueTomorrow = dueDateObj && isTomorrow(dueDateObj);

  const getDateBadgeStyle = () => {
    if (isOverdue) return "bg-destructive/10 text-destructive border-destructive/30";
    if (isDueToday) return "bg-warning/10 text-warning border-warning/30";
    if (isDueTomorrow) return "bg-primary/10 text-primary border-primary/30";
    return "";
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card 
      className={cn(
        "hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden",
        isOverdue && "border-destructive/50 shadow-destructive/10"
      )}
    >
      {isOverdue && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-destructive animate-pulse" />
      )}
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-foreground">{subjectName}</h3>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Atrasada
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
          
          {/* Quick Status Dropdown */}
          {onStatusChange && availableStatuses.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={handleStatusClick}>
                <Button variant="secondary" size="sm" className="h-6 gap-1 text-xs px-2">
                  {status}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                {availableStatuses.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusChangeWithActivity(id, s)}
                    className={cn(
                      "cursor-pointer",
                      s === status && "bg-accent font-medium"
                    )}
                  >
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Badge variant="secondary">{status}</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          {dueDate && dueDateObj && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full border",
              getDateBadgeStyle()
            )}>
              <Calendar className="w-4 h-4" />
              <span>
                {isDueToday ? "Hoje" : isDueTomorrow ? "Amanhã" : formatDateDisplay(dueDateObj)}
              </span>
            </div>
          )}
          {isGroupWork && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Em grupo</span>
            </div>
          )}
          {checklist.length > 0 && (
            <div className="flex items-center gap-1">
              <CheckSquare className="w-4 h-4" />
              <span>Checklist: {checklistProgress}%</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/task/${id}`)}
          className="flex-1 gap-2"
        >
          <Eye className="w-4 h-4" />
          Ver detalhes
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(id)}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TaskCard;
