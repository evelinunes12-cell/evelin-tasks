import { useState, useEffect } from "react";
import { PlannerNote } from "@/services/planner";
import { Subject } from "@/services/subjects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: PlannerNote | null;
  subjects: Subject[];
  onSave: (data: {
    title: string;
    content: string;
    subject_id: string | null;
    planned_date: string | null;
  }) => void;
}

export function NoteDialog({ open, onOpenChange, note, subjects, onSave }: NoteDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [plannedDate, setPlannedDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open) {
      setTitle(note?.title || "");
      setContent(note?.content || "");
      setSubjectId(note?.subject_id || null);
      setPlannedDate(note?.planned_date ? new Date(note.planned_date + "T12:00:00") : undefined);
    }
  }, [open, note]);

  const handleSave = () => {
    onSave({
      title,
      content,
      subject_id: subjectId,
      planned_date: plannedDate ? format(plannedDate, "yyyy-MM-dd") : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{note ? "Editar Anotação" : "Nova Anotação"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da anotação" />
          </div>

          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva sua anotação..."
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select
                value={subjectId || "none"}
                onValueChange={(v) => setSubjectId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data planejada</Label>
              <div className="flex gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !plannedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {plannedDate ? format(plannedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={plannedDate}
                      onSelect={setPlannedDate}
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {plannedDate && (
                  <Button variant="ghost" size="icon" onClick={() => setPlannedDate(undefined)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
