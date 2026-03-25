import { useState } from "react";
import { PlannerGoal } from "@/services/planner";
import { GoalCard } from "./GoalCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

interface GoalsListViewProps {
  goals: PlannerGoal[];
  onEdit: (goal: PlannerGoal) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onProgressChange: (id: string, progress: number) => void;
  onCreate: () => void;
}

export function GoalsListView({ goals, onEdit, onDelete, onToggleComplete, onProgressChange, onCreate }: GoalsListViewProps) {
  const [search, setSearch] = useState("");

  const filtered = goals.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.description?.toLowerCase().includes(search.toLowerCase())
  );

  const active = filtered.filter((g) => !g.completed);
  const completed = filtered.filter((g) => g.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar metas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onCreate} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Nova Meta
        </Button>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">
          {search ? "Nenhuma meta encontrada." : "Nenhuma meta criada ainda."}
        </p>
      )}

      {active.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ativas</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={onEdit} onDelete={onDelete} onToggleComplete={onToggleComplete} onProgressChange={onProgressChange} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concluídas</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={onEdit} onDelete={onDelete} onToggleComplete={onToggleComplete} onProgressChange={onProgressChange} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
