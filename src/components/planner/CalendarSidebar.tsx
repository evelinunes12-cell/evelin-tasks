import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Clock, StickyNote, Target } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CalendarSidebarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  filters: {
    schedules: boolean;
    notes: boolean;
    goals: boolean;
  };
  onFilterChange: (key: "schedules" | "notes" | "goals", value: boolean) => void;
  onCreateNote: () => void;
  onCreateGoal: () => void;
  onCreateSchedule: () => void;
}

export function CalendarSidebar({
  selectedDate,
  onDateSelect,
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

      <div className="rounded-lg border bg-card p-1">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && onDateSelect(d)}
          locale={ptBR}
          className={cn("p-2 pointer-events-auto w-full")}
          classNames={{
            months: "flex flex-col",
            month: "space-y-2",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-xs font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.65rem]",
            row: "flex w-full mt-1",
            cell: "h-8 w-8 text-center text-xs p-0 relative",
            day: "h-8 w-8 p-0 font-normal text-xs hover:bg-accent rounded-full inline-flex items-center justify-center",
            day_range_end: "day-range-end",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
            day_today: "bg-accent text-accent-foreground font-semibold",
            day_outside: "text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-50",
            day_hidden: "invisible",
          }}
        />
      </div>

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
        </div>
      </div>
    </aside>
  );
}
