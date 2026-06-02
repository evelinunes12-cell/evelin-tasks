import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, StickyNote, Pencil, Trash2, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Subject } from "@/services/subjects";
import { StudyCycle } from "@/services/studyCycles";
import {
  StudyCycleNote,
  fetchCycleNotes,
  deleteCycleNote,
} from "@/services/studyCycleNotes";
import CycleNoteDialog from "@/components/study-cycle/CycleNoteDialog";
import { toast } from "sonner";

interface CycleNotesSectionProps {
  userId: string;
  cycles: StudyCycle[];
  subjects: Subject[];
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const CycleNotesSection = ({ userId, cycles, subjects }: CycleNotesSectionProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StudyCycleNote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["cycle-notes", userId],
    queryFn: fetchCycleNotes,
    enabled: !!userId,
  });

  const reload = () => queryClient.invalidateQueries({ queryKey: ["cycle-notes", userId] });

  const handleOpenCreate = () => {
    setEditingNote(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (note: StudyCycleNote) => {
    setEditingNote(note);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCycleNote(deleteId);
      toast.success("Anotação excluída.");
      reload();
    } catch {
      toast.error("Erro ao excluir a anotação.");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {notes.length} {notes.length === 1 ? "anotação" : "anotações"}
        </p>
        <Button onClick={handleOpenCreate} size="sm" className="gap-1.5" disabled={cycles.length === 0}>
          <Plus className="h-4 w-4" />
          Nova Anotação
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && cycles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-2xl bg-primary/10 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground max-w-sm px-4">
            Crie um ciclo de estudos primeiro para começar a fazer anotações.
          </p>
        </div>
      )}

      {!isLoading && cycles.length > 0 && notes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-2xl bg-primary/10 mb-4">
            <StickyNote className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Nenhuma anotação</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm px-4">
            Registre resumos, dúvidas e insights enquanto estuda. Suas anotações ficam todas aqui.
          </p>
          <Button onClick={handleOpenCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Criar Primeira Anotação
          </Button>
        </div>
      )}

      {!isLoading && notes.length > 0 && (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} className="transition-all hover:shadow-md">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground break-words">
                      {note.title}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      {note.cycle?.name && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{note.cycle.name}</span>
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 gap-1"
                      >
                        {note.subject?.color && (
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: note.subject.color }}
                          />
                        )}
                        {note.subject?.name || "Geral"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{formatDate(note.updated_at)}</span>
                    </div>
                    {note.content && (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none mt-2 text-sm text-muted-foreground line-clamp-3 break-words [&_*]:!my-0.5"
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenEdit(note)}
                      aria-label="Editar anotação"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(note.id)}
                      aria-label="Excluir anotação"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CycleNoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
        cycles={cycles}
        subjects={subjects}
        noteToEdit={editingNote}
        onSaved={reload}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anotação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
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

export default CycleNotesSection;
