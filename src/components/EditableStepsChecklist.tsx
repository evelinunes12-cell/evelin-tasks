import { useState, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/logger";
import { cn } from "@/lib/utils";

export interface EditableStep {
  id: string;
  title: string;
  status: string;
  order_index: number;
}

interface Props {
  taskId: string;
  steps: EditableStep[];
  onStepsChange: (steps: EditableStep[]) => void;
}

const DONE = "Concluído";
const TODO = "Não Iniciado";

export default function EditableStepsChecklist({ taskId, steps, onStepsChange }: Props) {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const sorted = [...steps].sort((a, b) => a.order_index - b.order_index);
  const completed = sorted.filter((s) => s.status === DONE).length;

  const toggle = async (step: EditableStep) => {
    const newStatus = step.status === DONE ? TODO : DONE;
    const prev = steps;
    onStepsChange(steps.map((s) => (s.id === step.id ? { ...s, status: newStatus } : s)));
    try {
      const { error } = await supabase
        .from("task_steps")
        .update({ status: newStatus })
        .eq("id", step.id);
      if (error) throw error;
    } catch (err) {
      logError("toggle step", err);
      onStepsChange(prev);
      toast({ variant: "destructive", title: "Erro ao atualizar etapa" });
    }
  };

  const saveTitle = async (step: EditableStep) => {
    const title = editDraft.trim();
    if (!title || title === step.title) {
      setEditingId(null);
      return;
    }
    setSavingId(step.id);
    const prev = steps;
    onStepsChange(steps.map((s) => (s.id === step.id ? { ...s, title } : s)));
    try {
      const { error } = await supabase.from("task_steps").update({ title }).eq("id", step.id);
      if (error) throw error;
      setEditingId(null);
    } catch (err) {
      logError("edit step", err);
      onStepsChange(prev);
      toast({ variant: "destructive", title: "Erro ao renomear etapa" });
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (step: EditableStep) => {
    const prev = steps;
    onStepsChange(steps.filter((s) => s.id !== step.id));
    try {
      const { error } = await supabase.from("task_steps").delete().eq("id", step.id);
      if (error) throw error;
    } catch (err) {
      logError("delete step", err);
      onStepsChange(prev);
      toast({ variant: "destructive", title: "Erro ao excluir etapa" });
    }
  };

  const addStep = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setIsAdding(true);
    try {
      const nextIndex = sorted.length ? Math.max(...sorted.map((s) => s.order_index)) + 1 : 0;
      const { data, error } = await supabase
        .from("task_steps")
        .insert({
          task_id: taskId,
          title,
          status: TODO,
          order_index: nextIndex,
        })
        .select()
        .single();
      if (error) throw error;
      onStepsChange([
        ...steps,
        { id: data.id, title: data.title, status: data.status, order_index: data.order_index },
      ]);
      setNewTitle("");
    } catch (err) {
      logError("add step", err);
      toast({ variant: "destructive", title: "Erro ao criar etapa" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditKey = (e: KeyboardEvent<HTMLInputElement>, step: EditableStep) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTitle(step);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          Etapas {sorted.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({completed}/{sorted.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma etapa. Adicione a primeira abaixo.</p>
        )}

        {sorted.map((step) => {
          const isDone = step.status === DONE;
          const isEditing = editingId === step.id;
          return (
            <div
              key={step.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={isDone}
                onCheckedChange={() => toggle(step)}
                aria-label={`Marcar etapa ${step.title}`}
              />
              {isEditing ? (
                <Input
                  autoFocus
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={() => saveTitle(step)}
                  onKeyDown={(e) => handleEditKey(e, step)}
                  disabled={savingId === step.id}
                  className="h-8 flex-1"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(step.id);
                    setEditDraft(step.title);
                  }}
                  className={cn(
                    "flex-1 text-left text-sm break-words [overflow-wrap:anywhere] cursor-text",
                    isDone && "line-through text-muted-foreground"
                  )}
                >
                  {step.title}
                </button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={() => remove(step)}
                aria-label="Excluir etapa"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}

        <div className="flex items-center gap-2 pt-1">
          <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Adicionar nova etapa..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addStep();
              }
            }}
            disabled={isAdding}
            className="h-8"
          />
          <Button size="sm" onClick={addStep} disabled={isAdding || !newTitle.trim()}>
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
