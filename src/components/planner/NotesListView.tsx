import { useState } from "react";
import { PlannerNote } from "@/services/planner";
import { NoteCard } from "./NoteCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

interface NotesListViewProps {
  notes: PlannerNote[];
  onEdit: (note: PlannerNote) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onCreate: () => void;
}

export function NotesListView({ notes, onEdit, onDelete, onTogglePin, onToggleComplete, onCreate }: NotesListViewProps) {
  const [search, setSearch] = useState("");

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter((n) => n.pinned && !n.completed);
  const active = filtered.filter((n) => !n.pinned && !n.completed);
  const completed = filtered.filter((n) => n.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar anotações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onCreate} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Nova Anotação
        </Button>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">
          {search ? "Nenhuma anotação encontrada." : "Nenhuma anotação criada ainda."}
        </p>
      )}

      {pinned.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fixadas</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map((n) => (
              <NoteCard key={n.id} note={n} onEdit={onEdit} onDelete={onDelete} onTogglePin={onTogglePin} onToggleComplete={onToggleComplete} />
            ))}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section className="space-y-2">
          {pinned.length > 0 && <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outras</h3>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((n) => (
              <NoteCard key={n.id} note={n} onEdit={onEdit} onDelete={onDelete} onTogglePin={onTogglePin} onToggleComplete={onToggleComplete} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concluídas</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((n) => (
              <NoteCard key={n.id} note={n} onEdit={onEdit} onDelete={onDelete} onTogglePin={onTogglePin} onToggleComplete={onToggleComplete} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
