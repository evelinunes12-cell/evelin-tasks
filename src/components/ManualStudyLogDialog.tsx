import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudyCycle, StudyCycleBlock } from "@/services/studyCycles";
import { createFocusSession } from "@/services/focusSessions";
import { registerActivity } from "@/services/activity";
import { logXP, XP } from "@/services/scoring";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ManualStudyLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle: StudyCycle;
  defaultBlockIndex?: number;
  onLogged?: (params: { blockIndex: number; markCompleted: boolean }) => void;
}

const ManualStudyLogDialog = ({
  open,
  onOpenChange,
  cycle,
  defaultBlockIndex,
  onLogged,
}: ManualStudyLogDialogProps) => {
  const { user } = useAuth();
  const blocks = cycle.blocks || [];

  const [selectedBlockId, setSelectedBlockId] = useState<string>("");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [studiedAt, setStudiedAt] = useState("");
  const [markCompleted, setMarkCompleted] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const defaultBlock =
        defaultBlockIndex != null && blocks[defaultBlockIndex]
          ? blocks[defaultBlockIndex]
          : blocks[0];
      setSelectedBlockId(defaultBlock?.id || "");
      setHours("0");
      setMinutes("30");
      // Datetime-local format for "now"
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      setStudiedAt(new Date(now.getTime() - offset).toISOString().slice(0, 16));
      setMarkCompleted(true);
    }
  }, [open, defaultBlockIndex, blocks]);

  const handleSave = async () => {
    if (!user) return;
    const block = blocks.find((b) => b.id === selectedBlockId);
    if (!block) {
      toast.error("Selecione uma disciplina.");
      return;
    }
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const totalMinutes = h * 60 + m;
    if (totalMinutes <= 0) {
      toast.error("Informe um tempo maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const startedAt = studiedAt ? new Date(studiedAt) : new Date();
      const endedAt = new Date(startedAt.getTime() + totalMinutes * 60 * 1000);
      if (endedAt > new Date()) {
        toast.error("A data/hora não pode ficar no futuro.");
        setSaving(false);
        return;
      }

      await createFocusSession(user.id, startedAt, totalMinutes, block.subject_id, cycle.id);
      await registerActivity(user.id);
      logXP(user.id, "study_block_completed", XP.STUDY_BLOCK_COMPLETED);

      toast.success(`Registrado: ${block.subject?.name || "Disciplina"} (${totalMinutes}min)`);

      const blockIndex = blocks.findIndex((b) => b.id === selectedBlockId);
      onLogged?.({ blockIndex, markCompleted });
      onOpenChange(false);
    } catch (e) {
      toast.error("Erro ao registrar estudo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar estudo manual</DialogTitle>
          <DialogDescription>
            Lance manualmente uma sessão de estudo de uma disciplina deste ciclo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Disciplina</Label>
            <Select value={selectedBlockId} onValueChange={setSelectedBlockId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma disciplina" />
              </SelectTrigger>
              <SelectContent>
                {blocks.map((b: StudyCycleBlock) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="flex items-center gap-2">
                      {b.subject?.color && (
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: b.subject.color }}
                        />
                      )}
                      {b.subject?.name || "—"}
                      <span className="text-xs text-muted-foreground">
                        ({b.allocated_minutes}min)
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tempo estudado</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="0"
                />
                <p className="text-[11px] text-muted-foreground mt-1 text-center">horas</p>
              </div>
              <span className="text-muted-foreground pb-5">:</span>
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="30"
                />
                <p className="text-[11px] text-muted-foreground mt-1 text-center">minutos</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="studied-at">Quando estudou</Label>
            <Input
              id="studied-at"
              type="datetime-local"
              value={studiedAt}
              onChange={(e) => setStudiedAt(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="mark-completed"
              checked={markCompleted}
              onCheckedChange={(checked) => setMarkCompleted(!!checked)}
            />
            <div className="grid gap-0.5 leading-none">
              <Label htmlFor="mark-completed" className="cursor-pointer">
                Marcar bloco como concluído
              </Label>
              <p className="text-xs text-muted-foreground">
                Avança o ciclo para o próximo bloco automaticamente.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualStudyLogDialog;
