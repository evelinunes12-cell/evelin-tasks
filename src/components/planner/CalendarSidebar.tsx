import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Clock, StickyNote, Target, ClipboardList } from "lucide-react";

interface CalendarSidebarProps {
  filters: {
    schedules: boolean;
    notes: boolean;
    goals: boolean;
    tasks: boolean;
  };
  onFilterChange: (key: "schedules" | "notes" | "goals" | "tasks", value: boolean) => void;
  onCreateNote: () => void;
  onCreateGoal: () => void;
  onCreateSchedule: () => void;
}

export function CalendarSidebar({
  filters,
  onFilterChange,
  onCreateNote,
  onCreateGoal,
  onCreateSchedule,
}: CalendarSidebarProps) {
  return (
    <aside className="space-y-5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="w-full gap-2" size="lg">
            <Plus className="h-4 w-4" />
            Criar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onClick={onCreateNote} className="gap-2 cursor-pointer">
            <StickyNote className="h-4 w-4 text-amber-500" />
            Nova Anotação
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCreateGoal} className="gap-2 cursor-pointer">
            <Target className="h-4 w-4 text-emerald-500" />
            Nova Meta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCreateSchedule} className="gap-2 cursor-pointer">
            <Clock className="h-4 w-4 text-blue-500" />
            Novo Horário
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Meus Calendários
        </h3>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <Label htmlFor="f-schedules" className="text-sm font-normal cursor-pointer">
                Horários da Grade
              </Label>
            </div>
            <Switch
              id="f-schedules"
              checked={filters.schedules}
              onCheckedChange={(v) => onFilterChange("schedules", v)}
              className="scale-75"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <Label htmlFor="f-notes" className="text-sm font-normal cursor-pointer">
                Anotações
              </Label>
            </div>
            <Switch
              id="f-notes"
              checked={filters.notes}
              onCheckedChange={(v) => onFilterChange("notes", v)}
              className="scale-75"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <Label htmlFor="f-goals" className="text-sm font-normal cursor-pointer">
                Metas
              </Label>
            </div>
            <Switch
              id="f-goals"
              checked={filters.goals}
              onCheckedChange={(v) => onFilterChange("goals", v)}
              className="scale-75"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              <Label htmlFor="f-tasks" className="text-sm font-normal cursor-pointer">
                Tarefas
              </Label>
            </div>
            <Switch
              id="f-tasks"
              checked={filters.tasks}
              onCheckedChange={(v) => onFilterChange("tasks", v)}
              className="scale-75"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
