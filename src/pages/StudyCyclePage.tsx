import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Repeat, Plus, BookOpen, Clock, Trash2, Power, PowerOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { fetchSubjects, Subject } from "@/services/subjects";
import {
  fetchStudyCycles,
  createStudyCycle,
  deleteStudyCycle,
  toggleCycleActive,
  StudyCycle,
  NewBlock,
} from "@/services/studyCycles";
import StudyCycleDialog from "@/components/StudyCycleDialog";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const StudyCyclePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<StudyCycle[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cyclesData, subjectsData] = await Promise.all([fetchStudyCycles(), fetchSubjects()]);
      setCycles(cyclesData);
      setSubjects(subjectsData);
    } catch {
      toast.error("Erro ao carregar ciclos.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (name: string, blocks: NewBlock[]) => {
    if (!user) return;
    await createStudyCycle(user.id, name, blocks);
    toast.success("Ciclo criado com sucesso!");
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStudyCycle(deleteId);
      toast.success("Ciclo excluído.");
      setCycles((prev) => prev.filter((c) => c.id !== deleteId));
    } catch {
      toast.error("Erro ao excluir o ciclo.");
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggle = async (cycle: StudyCycle) => {
    try {
      await toggleCycleActive(cycle.id, !cycle.is_active);
      setCycles((prev) =>
        prev.map((c) => (c.id === cycle.id ? { ...c, is_active: !c.is_active } : c))
      );
      toast.success(cycle.is_active ? "Ciclo desativado." : "Ciclo ativado!");
    } catch {
      toast.error("Erro ao alterar status.");
    }
  };

  const getTotalMinutes = (cycle: StudyCycle) =>
    (cycle.blocks || []).reduce((sum, b) => sum + b.allocated_minutes, 0);

  const formatTime = (totalMin: number) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar minimal />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Repeat className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ciclo de Estudos</h1>
              <p className="text-sm text-muted-foreground">Monte seu ciclo como uma playlist</p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Criar Ciclo
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && cycles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-2xl bg-primary/10 mb-6">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum ciclo criado</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Crie seu primeiro ciclo de estudos adicionando suas disciplinas e definindo o tempo dedicado a cada uma.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Criar Primeiro Ciclo
            </Button>
          </div>
        )}

        {/* Cycles List */}
        {!loading && cycles.length > 0 && (
          <div className="space-y-4">
            {cycles.map((cycle) => {
              const blockCount = cycle.blocks?.length || 0;
              const totalMin = getTotalMinutes(cycle);

              return (
                <Card
                  key={cycle.id}
                  className={`transition-all hover:shadow-md ${!cycle.is_active ? "opacity-60" : ""}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-semibold text-foreground truncate">{cycle.name}</h3>
                          <Badge
                            variant={cycle.is_active ? "default" : "secondary"}
                            className="shrink-0 text-[10px] px-1.5 py-0 h-5"
                          >
                            {cycle.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            {blockCount} disciplina{blockCount !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(totalMin)}
                          </span>
                        </div>

                        {/* Block chips */}
                        {cycle.blocks && cycle.blocks.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {cycle.blocks.map((block) => (
                              <span
                                key={block.id}
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                              >
                                {block.subject?.color && (
                                  <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: block.subject.color }}
                                  />
                                )}
                                {block.subject?.name || "—"}
                                <span className="text-muted-foreground">· {block.allocated_minutes}min</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggle(cycle)}
                          title={cycle.is_active ? "Desativar" : "Ativar"}
                        >
                          {cycle.is_active ? (
                            <PowerOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Power className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(cycle.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <StudyCycleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subjects={subjects}
        onSave={handleCreate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ciclo?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Todos os blocos vinculados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudyCyclePage;
