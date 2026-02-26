import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import type { StudySchedule } from "@/services/studySchedules";

const DAYS = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

const COLORS = [
  "#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    title: string;
    type: "fixed" | "variable";
    days: number[];
    start_time: string;
    end_time: string;
    color: string;
  }) => void;
  onUpdate?: (id: string, data: {
    title: string;
    type: "fixed" | "variable";
    day_of_week: number;
    start_time: string;
    end_time: string;
    color: string;
  }) => void;
  editingBlock?: StudySchedule | null;
}

export function ScheduleBlockDialog({ open, onOpenChange, onSave, onUpdate, editingBlock }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"fixed" | "variable">("fixed");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (editingBlock) {
      setTitle(editingBlock.title);
      setType(editingBlock.type);
      setSelectedDays([editingBlock.day_of_week]);
      setStartTime(editingBlock.start_time.slice(0, 5));
      setEndTime(editingBlock.end_time.slice(0, 5));
      setColor(editingBlock.color || COLORS[0]);
    } else {
      setTitle("");
      setType("fixed");
      setSelectedDays([]);
      setStartTime("08:00");
      setEndTime("09:00");
      setColor(COLORS[0]);
    }
  }, [editingBlock, open]);

  const toggleDay = (day: number) => {
    if (editingBlock) {
      setSelectedDays([day]);
      return;
    }
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = () => {
    if (!title.trim() || selectedDays.length === 0 || !startTime || !endTime) return;

    if (editingBlock && onUpdate) {
      onUpdate(editingBlock.id, {
        title: title.trim(),
        type,
        day_of_week: selectedDays[0],
        start_time: startTime,
        end_time: endTime,
        color,
      });
    } else {
      onSave({
        title: title.trim(),
        type,
        days: selectedDays.sort((a, b) => a - b),
        start_time: startTime,
        end_time: endTime,
        color,
      });
    }
  };

  const isValid = title.trim() && title.trim().length <= 255 && selectedDays.length > 0 && startTime && endTime && startTime < endTime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingBlock ? "Editar Horário" : "Novo Horário"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              placeholder="Ex: Aula de Cálculo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as "fixed" | "variable")} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="cursor-pointer font-normal">Fixo (Aula/Trabalho)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="variable" id="variable" />
                <Label htmlFor="variable" className="cursor-pointer font-normal">Variável (Estudo Livre)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>{editingBlock ? "Dia da Semana" : "Dias da Semana"}</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    selectedDays.includes(day.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  {day.short}
                </button>
              ))}
            </div>
            {!editingBlock && (
              <p className="text-xs text-muted-foreground">Selecione vários dias para repetir o horário.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {startTime && endTime && startTime >= endTime && (
            <p className="text-xs text-destructive">O horário de fim deve ser após o início.</p>
          )}

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            {editingBlock ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
