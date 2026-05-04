import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createThread } from "@/services/environmentThreads";

interface TaskOption {
  id: string;
  subject_name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  environmentId: string;
  tasks: TaskOption[];
  defaultTaskId?: string | null;
  defaultTitle?: string;
  sourceMessageId?: string | null;
  onCreated: (threadId: string) => void;
}

export default function CreateThreadDialog({
  open,
  onOpenChange,
  environmentId,
  tasks,
  defaultTaskId,
  defaultTitle,
  sourceMessageId,
  onCreated,
}: Props) {
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [taskId, setTaskId] = useState<string>(defaultTaskId ?? "none");
  const [saving, setSaving] = useState(false);

  // Reset when opening
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setTitle(defaultTitle ?? "");
      setTaskId(defaultTaskId ?? "none");
    }
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Informe um título para o tópico");
      return;
    }
    setSaving(true);
    try {
      const thread = await createThread({
        environmentId,
        title: trimmed,
        sourceMessageId: sourceMessageId ?? null,
        sourceTaskId: taskId !== "none" ? taskId : null,
      });
      toast.success("Tópico criado");
      onCreated(thread.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar tópico");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar novo tópico</DialogTitle>
            <DialogDescription>
              Tópicos agrupam conversas sobre um assunto ou tarefa específica.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="thread-title">Título do tópico</Label>
              <Input
                id="thread-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Revisão da apresentação"
                maxLength={200}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thread-task">Vincular a uma tarefa (opcional)</Label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger id="thread-task">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Criando..." : "Criar tópico"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
