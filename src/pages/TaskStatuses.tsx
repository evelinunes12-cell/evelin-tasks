import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface TaskStatus {
  id: string;
  name: string;
  color: string | null;
  is_default: boolean;
  order_index: number;
}

export default function TaskStatuses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TaskStatus | null>(null);
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState("#3b82f6");

  useEffect(() => {
    if (user) {
      fetchStatuses();
    }
  }, [user]);

  const fetchStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from("task_statuses")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setStatuses(data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar status",
        description: "Não foi possível carregar os status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (status?: TaskStatus) => {
    if (status) {
      setEditingStatus(status);
      setStatusName(status.name);
      setStatusColor(status.color || "#3b82f6");
    } else {
      setEditingStatus(null);
      setStatusName("");
      setStatusColor("#3b82f6");
    }
    setDialogOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!statusName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para o status.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingStatus) {
        const { error } = await supabase
          .from("task_statuses")
          .update({ name: statusName, color: statusColor })
          .eq("id", editingStatus.id);

        if (error) throw error;
        toast({
          title: "Status atualizado",
          description: "O status foi atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("task_statuses")
          .insert({ name: statusName, color: statusColor, user_id: user?.id });

        if (error) throw error;
        toast({
          title: "Status criado",
          description: "O status foi criado com sucesso.",
        });
      }

      setDialogOpen(false);
      fetchStatuses();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar status",
        description: error.message || "Não foi possível salvar o status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStatus = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este status?")) return;

    try {
      const { error } = await supabase.from("task_statuses").delete().eq("id", id);

      if (error) throw error;
      toast({
        title: "Status excluído",
        description: "O status foi excluído com sucesso.",
      });
      fetchStatuses();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir status",
        description: error.message || "Não foi possível excluir o status.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center gap-4 px-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-2xl font-bold">Status de Tarefas</h1>
        </div>
      </header>

      <main className="container py-8 px-4">
        <div className="mb-6">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Status
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statuses.map((status) => (
            <Card key={status.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: status.color || "#3b82f6" }}
                    />
                    <CardTitle className="text-lg">{status.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(status)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!status.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteStatus(status.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {statuses.length === 0 && (
          <p className="text-center text-muted-foreground mt-8">
            Nenhum status cadastrado. Clique em "Novo Status" para começar.
          </p>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "Editar Status" : "Novo Status"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do status abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={statusName}
                onChange={(e) => setStatusName(e.target.value)}
                placeholder="Nome do status"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                type="color"
                value={statusColor}
                onChange={(e) => setStatusColor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStatus}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
