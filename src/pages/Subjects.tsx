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

interface Subject {
  id: string;
  name: string;
  color: string | null;
}

export default function Subjects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("#3b82f6");

  useEffect(() => {
    if (user) {
      fetchSubjects();
    }
  }, [user]);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar disciplinas",
        description: "Não foi possível carregar as disciplinas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setSubjectName(subject.name);
      setSubjectColor(subject.color || "#3b82f6");
    } else {
      setEditingSubject(null);
      setSubjectName("");
      setSubjectColor("#3b82f6");
    }
    setDialogOpen(true);
  };

  const handleSaveSubject = async () => {
    if (!subjectName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para a disciplina.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingSubject) {
        const { error } = await supabase
          .from("subjects")
          .update({ name: subjectName, color: subjectColor })
          .eq("id", editingSubject.id);

        if (error) throw error;
        toast({
          title: "Disciplina atualizada",
          description: "A disciplina foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("subjects")
          .insert({ name: subjectName, color: subjectColor, user_id: user?.id });

        if (error) throw error;
        toast({
          title: "Disciplina criada",
          description: "A disciplina foi criada com sucesso.",
        });
      }

      setDialogOpen(false);
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar disciplina",
        description: error.message || "Não foi possível salvar a disciplina.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta disciplina?")) return;

    try {
      const { error } = await supabase.from("subjects").delete().eq("id", id);

      if (error) throw error;
      toast({
        title: "Disciplina excluída",
        description: "A disciplina foi excluída com sucesso.",
      });
      fetchSubjects();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir disciplina",
        description: error.message || "Não foi possível excluir a disciplina.",
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
          <h1 className="text-2xl font-bold">Disciplinas</h1>
        </div>
      </header>

      <main className="container py-8 px-4">
        <div className="mb-6">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Disciplina
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: subject.color || "#3b82f6" }}
                    />
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(subject)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSubject(subject.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {subjects.length === 0 && (
          <p className="text-center text-muted-foreground mt-8">
            Nenhuma disciplina cadastrada. Clique em "Nova Disciplina" para
            começar.
          </p>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? "Editar Disciplina" : "Nova Disciplina"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da disciplina abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Nome da disciplina"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                type="color"
                value={subjectColor}
                onChange={(e) => setSubjectColor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSubject}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
