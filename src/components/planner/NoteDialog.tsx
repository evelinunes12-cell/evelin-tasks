import { useState, useEffect } from "react";
import { PlannerNote } from "@/services/planner";
import { Subject } from "@/services/subjects";
import { supabase } from "@/integrations/supabase/client";
import { stripHtml } from "@/utils/sanitize";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/RichTextEditor";
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
import { CalendarIcon, X, LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";

interface TaskOption {
  id: string;
  subject_name: string;
  description: string | null;
}

const formatContentForEditor = (text?: string | null) => {
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return `<p>${text.replace(/\n/g, "<br/>")}</p>`;
};

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: PlannerNote | null;
  subjects: Subject[];
  prefilledTaskId?: string | null;
  prefilledSubjectId?: string | null;
  onSave: (data: {
    title: string;
    content: string;
    subject_id: string | null;
    task_id: string | null;
    planned_date: string | null;
  }) => void;
}

export function NoteDialog({ open, onOpenChange, note, subjects, prefilledTaskId, prefilledSubjectId, onSave }: NoteDialogProps) {
  const defaultValues = {
    title: "",
    content: "",
    subject_id: null as string | null,
    task_id: null as string | null,
    planned_date: undefined as Date | undefined,
  };
  const form = useForm({ defaultValues });
  const subjectId = form.watch("subject_id");
  const taskId = form.watch("task_id");
  const plannedDate = form.watch("planned_date");
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    if (note && open) {
      form.reset({
        title: note.title,
        content: formatContentForEditor(note.content),
        subject_id: note.subject_id || prefilledSubjectId || null,
        task_id: note.task_id || prefilledTaskId || null,
        planned_date: note.planned_date ? new Date(note.planned_date + "T12:00:00") : undefined,
      });
    } else if (open) {
      form.reset({
        ...defaultValues,
        subject_id: prefilledSubjectId || null,
        task_id: prefilledTaskId || null,
      });
    } else {
      form.reset(defaultValues);
    }
  }, [note, open, prefilledTaskId, prefilledSubjectId, form]);

  // Fetch open tasks when subject changes
  useEffect(() => {
    if (!open || !subjectId) {
      setTasks([]);
      if (!subjectId) form.setValue("task_id", null);
      return;
    }

    const selectedSubject = subjects.find((s) => s.id === subjectId);
    if (!selectedSubject) {
      setTasks([]);
      return;
    }

    const fetchTasks = async () => {
      setLoadingTasks(true);
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("id, subject_name, description")
          .eq("subject_name", selectedSubject.name)
          .eq("is_archived", false)
          .not("status", "ilike", "%conclu%")
          .order("due_date", { ascending: true, nullsFirst: false });

        if (!error && data) {
          setTasks(data as TaskOption[]);
        }
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchTasks();
  }, [open, subjectId, subjects]);

  // Clear task when subject changes and task doesn't match
  useEffect(() => {
    if (taskId && tasks.length > 0 && !tasks.find((t) => t.id === taskId)) {
      form.setValue("task_id", null);
  }
  }, [tasks, taskId, form]);

  const handleSave = () => {
    const values = form.getValues();
    onSave({
      title: values.title,
      content: values.content,
      subject_id: values.subject_id,
      task_id: values.task_id,
      planned_date: values.planned_date ? format(values.planned_date, "yyyy-MM-dd") : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{note ? "Editar Anotação" : "Nova Anotação"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
        <div className="space-y-4" key={note?.id || "new_note"}>
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={form.watch("title")} onChange={(e) => form.setValue("title", e.target.value)} placeholder="Título da anotação" />
          </div>

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <Label>Conteúdo</Label>
                <FormControl>
                  <RichTextEditor
                    key={note?.id || "new_note"}
                    content={field.value}
                    onChange={field.onChange}
                    placeholder="Escreva sua anotação..."
                    minHeight="180px"
                    className="w-full"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select
                value={subjectId || "none"}
                onValueChange={(v) => form.setValue("subject_id", v === "none" ? null : v)}
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
                      onSelect={(value) => form.setValue("planned_date", value)}
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {plannedDate && (
                  <Button variant="ghost" size="icon" onClick={() => form.setValue("planned_date", undefined)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {subjectId && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" />
                Vincular a uma tarefa
              </Label>
              <Select
                value={taskId || "none"}
                onValueChange={(v) => form.setValue("task_id", v === "none" ? null : v)}
                disabled={loadingTasks}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingTasks ? "Carregando..." : "Nenhuma tarefa"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma tarefa</SelectItem>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.subject_name}
                      {stripHtml(t.description) ? ` — ${stripHtml(t.description).substring(0, 40)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tasks.length === 0 && !loadingTasks && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma tarefa em aberto para esta disciplina.
                </p>
              )}
            </div>
          )}
        </div>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
