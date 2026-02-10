import { PlannerNote } from "@/services/planner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pin, PinOff, Pencil, Trash2, Calendar, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NoteCardProps {
  note: PlannerNote;
  onEdit: (note: PlannerNote) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
}

export function NoteCard({ note, onEdit, onDelete, onTogglePin, onToggleComplete }: NoteCardProps) {
  return (
    <Card
      className={cn(
        "group relative transition-all hover:shadow-md",
        note.pinned && "ring-1 ring-primary/30",
        note.completed && "opacity-70"
      )}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn("font-semibold text-sm leading-tight line-clamp-2 flex-1", note.completed && "line-through text-muted-foreground")}>
            {note.title || "Sem título"}
          </h3>
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onToggleComplete(note.id, !note.completed)}
              title={note.completed ? "Reabrir nota" : "Concluir nota"}
              aria-label={note.completed ? "Reabrir nota" : "Concluir nota"}
            >
              {note.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Circle className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onTogglePin(note.id, !note.pinned)}
              aria-label={note.pinned ? "Desafixar nota" : "Fixar nota"}
            >
              {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(note)}
              aria-label="Editar nota"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => onDelete(note.id)}
              aria-label="Excluir nota"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {note.content && (
          <p className={cn("text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap", note.completed && "line-through")}>
            {note.content}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap pt-1">
          {note.subject && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
              style={note.subject.color ? { borderColor: note.subject.color, color: note.subject.color } : undefined}
            >
              {note.subject.name}
            </Badge>
          )}
          {note.planned_date && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="h-3 w-3" />
              {format(new Date(note.planned_date + "T12:00:00"), "dd/MM", { locale: ptBR })}
            </span>
          )}
          {note.completed && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Concluída</Badge>
          )}
          {note.pinned && (
            <Pin className="h-3 w-3 text-primary" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
