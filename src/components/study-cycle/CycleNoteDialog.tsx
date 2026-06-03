import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RichTextEditor from "@/components/RichTextEditor";
import { StickyNote } from "lucide-react";
import { Subject } from "@/services/subjects";
import { StudyCycle } from "@/services/studyCycles";
import {
  StudyCycleNote,
  createCycleNote,
  updateCycleNote,
} from "@/services/studyCycleNotes";
import { toast } from "sonner";

const GENERAL_VALUE = "__general__";

interface CycleNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  cycles: StudyCycle[];
  subjects: Subject[];
  noteToEdit?: StudyCycleNote | null;
  defaultCycleId?: string | null;
  defaultSubjectId?: string | null;
  lockCycle?: boolean;
  onSaved?: () => void;
}

const CycleNoteDialog = ({
  open,
  onOpenChange,
  userId,
  cycles,
  subjects,
  noteToEdit,
  defaultCycleId,
  defaultSubjectId,
  lockCycle,
  onSaved,
}: CycleNoteDialogProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [cycleId, setCycleId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>(GENERAL_VALUE);
  const [saving, setSaving] = useState(false);

  const isEditing = !!noteToEdit;

  // Disciplinas filtradas pelo ciclo selecionado
  const filteredSubjects = (() => {
    const cycle = cycles.find((c) => c.id === cycleId);
    if (!cycle) return [];
    const cycleSubjectIds = new Set(
      (cycle.blocks || []).map((b) => b.subject_id)
    );
    return subjects.filter((s) => cycleSubjectIds.has(s.id));
  })();

  useEffect(() => {
    if (!open) return;
    if (noteToEdit) {
      setTitle(noteToEdit.title);
      setContent(noteToEdit.content);
      setCycleId(noteToEdit.cycle_id);
      setSubjectId(noteToEdit.subject_id || GENERAL_VALUE);
    } else {
      setTitle("");
      setContent("");
      setCycleId(defaultCycleId || cycles[0]?.id || "");
      setSubjectId(defaultSubjectId || GENERAL_VALUE);
    }
  }, [open, noteToEdit, defaultCycleId, defaultSubjectId, cycles]);

  // Ao trocar de ciclo, limpa a disciplina caso ela não pertença ao novo ciclo
  const handleCycleChange = (newCycleId: string) => {
    setCycleId(newCycleId);
    const cycle = cycles.find((c) => c.id === newCycleId);
    const cycleSubjectIds = new Set(
      (cycle?.blocks || []).map((b) => b.subject_id)
    );
    if (subjectId !== GENERAL_VALUE && !cycleSubjectIds.has(subjectId)) {
      setSubjectId(GENERAL_VALUE);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Dê um título para a anotação.");
      return;
    }
    if (!cycleId) {
      toast.error("Selecione um ciclo.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        cycle_id: cycleId,
        subject_id: subjectId === GENERAL_VALUE ? null : subjectId,
        title: title.trim(),
        content,
      };
      if (isEditing && noteToEdit) {
        await updateCycleNote(noteToEdit.id, payload);
        toast.success("Anotação atualizada!");
      } else {
        await createCycleNote(userId, payload);
        toast.success("Anotação criada!");
      }
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar a anotação.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Anotação" : "Nova Anotação"}
          </DialogTitle>
          <DialogDescription>
            Registre suas anotações do ciclo de estudos. Vincule a uma disciplina ou deixe como anotação geral.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Resumo de Direito Constitucional"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ciclo</Label>
              <Select value={cycleId} onValueChange={handleCycleChange} disabled={lockCycle}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ciclo" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Disciplina</Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={!cycleId}>
                <SelectTrigger>
                  <SelectValue placeholder={cycleId ? "Geral do ciclo" : "Selecione um ciclo"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL_VALUE}>Geral do ciclo</SelectItem>
                  {filteredSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Conteúdo</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Escreva sua anotação..."
              minHeight="160px"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar Anotação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CycleNoteDialog;
