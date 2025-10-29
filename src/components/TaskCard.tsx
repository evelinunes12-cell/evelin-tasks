import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface TaskCardProps {
  id: string;
  subjectName: string;
  description?: string;
  dueDate: string;
  isGroupWork: boolean;
  status: string;
  onDelete: (id: string) => void;
}

const statusConfig = {
  not_started: {
    label: "Não Iniciada",
    variant: "secondary" as const,
  },
  in_progress: {
    label: "Em Andamento",
    variant: "default" as const,
  },
  completed: {
    label: "Concluída",
    variant: "default" as const,
  },
};

const TaskCard = ({
  id,
  subjectName,
  description,
  dueDate,
  isGroupWork,
  status,
  onDelete,
}: TaskCardProps) => {
  const navigate = useNavigate();
  const statusInfo = statusConfig[status];

  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground mb-1">{subjectName}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
          <Badge 
            variant={statusInfo.variant}
            className={
              status === "completed" 
                ? "bg-success text-success-foreground"
                : status === "in_progress"
                ? "bg-warning text-warning-foreground"
                : ""
            }
          >
            {statusInfo.label}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(dueDate), "dd 'de' MMMM", { locale: ptBR })}</span>
          </div>
          {isGroupWork && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Em grupo</span>
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
