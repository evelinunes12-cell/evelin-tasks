import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Music } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Subject } from "@/services/subjects";
import { NewBlock } from "@/services/studyCycles";
import { toast } from "sonner";

interface StudyCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  onSave: (name: string, blocks: NewBlock[]) => Promise<void>;
}

interface BlockRow {
  id: string;
  subject_id: string;
  allocated_minutes: number;
}

const generateId = () => Math.random().toString(36).slice(2, 9);

const StudyCycleDialog = ({ open, onOpenChange, subjects, onSave }: StudyCycleDialogProps) => {
  const [name, setName] = useState("");
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setBlocks([{ id: generateId(), subject_id: "", allocated_minutes: 60 }]);
    }
  }, [open]);

  const addBlock = () => {
    setBlocks((prev) => [...prev, { id: generateId(), subject_id: "", allocated_minutes: 60 }]);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBlock = (id: string, field: keyof BlockRow, value: string | number) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const totalMinutes = blocks.reduce((sum, b) => sum + (b.allocated_minutes || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Dê um nome ao seu ciclo.");
      return;
    }

    const validBlocks = blocks.filter((b) => b.subject_id);
    if (validBlocks.length === 0) {
      toast.error("Adicione pelo menos uma disciplina ao ciclo.");
      return;
    }

    setSaving(true);
    try {
      await onSave(
        name.trim(),
        validBlocks.map((b) => ({ subject_id: b.subject_id, allocated_minutes: b.allocated_minutes }))
      );
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar o ciclo.");
    } finally {
      setSaving(false);
    }
  };

  const usedSubjectIds = blocks.map((b) => b.subject_id).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Criar Novo Ciclo
          </DialogTitle>
          <DialogDescription>
            Monte seu ciclo como uma playlist: adicione disciplinas e defina o tempo de cada uma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Cycle Name */}
          <div className="space-y-2">
            <Label htmlFor="cycle-name">Nome do Ciclo</Label>
            <Input
              id="cycle-name"
              placeholder="Ex: Ciclo Semanal, Revisão Final..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Blocks */}
          <div className="space-y-2">
            <Label>Disciplinas do Ciclo</Label>
            <div className="space-y-2">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  className="flex items-center gap-2 rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground font-medium w-5 shrink-0">
                    {index + 1}.
                  </span>

                  <Select
                    value={block.subject_id}
                    onValueChange={(val) => updateBlock(block.id, "subject_id", val)}
                  >
                    <SelectTrigger className="flex-1 min-w-0">
                      <SelectValue placeholder="Selecione a matéria" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          disabled={usedSubjectIds.includes(s.id) && block.subject_id !== s.id}
                        >
                          <span className="flex items-center gap-2">
                            {s.color && (
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: s.color }}
                              />
                            )}
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      value={block.allocated_minutes}
                      onChange={(e) =>
                        updateBlock(block.id, "allocated_minutes", Math.max(5, parseInt(e.target.value) || 5))
                      }
                      className="w-20 text-center"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeBlock(block.id)}
                    disabled={blocks.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addBlock} className="w-full mt-2">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Disciplina
            </Button>
          </div>

          {/* Summary */}
          {blocks.some((b) => b.subject_id) && (
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm text-center">
              <span className="font-semibold text-primary">
                {blocks.filter((b) => b.subject_id).length} disciplina(s)
              </span>
              {" · "}
              <span className="text-muted-foreground">
                Tempo total: {hours > 0 ? `${hours}h ` : ""}{mins > 0 ? `${mins}min` : hours > 0 ? "" : "0min"}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Ciclo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudyCycleDialog;
