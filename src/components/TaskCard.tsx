import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Eye, Trash2, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface TaskCardProps {
  id: string;
  subjectName: string;
  description?: string;
  dueDate: string | null;
  isGroupWork: boolean;
  status: string;
  checklist?: { text: string; completed: boolean }[];
  onDelete: (id: string) => void;
}

const TaskCard = ({
  id,
  subjectName,
  description,
  dueDate,
  isGroupWork,
  status,
  checklist = [],
  onDelete,
}: TaskCardProps) => {
  const navigate = useNavigate();
  
  // Usa o status como está, sem mapeamento fixo
  const statusInfo = {
    label: status,
    variant: "secondary" as const,
  };
  
  const checklistProgress =
    checklist.length > 0
      ? Math.round((checklist.filter((item) => item.completed).length / checklist.length) * 100)
      : 0;

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
          <Badge variant="secondary">
            {statusInfo.label}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          {dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {format(
                  (() => {
                    const parts = dueDate.split("-");
                    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  })(),
                  "dd 'de' MMMM",
                  { locale: ptBR }
                )}
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
