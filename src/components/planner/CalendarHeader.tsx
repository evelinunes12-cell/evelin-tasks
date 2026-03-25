import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalendarHeaderProps {
  currentDate: Date;
  view: "month" | "week";
  onViewChange: (view: "month" | "week") => void;
  onDateChange: (date: Date) => void;
  onToday: () => void;
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onDateChange,
  onToday,
}: CalendarHeaderProps) {
  const label =
    view === "month"
      ? format(currentDate, "MMMM yyyy", { locale: ptBR })
      : format(currentDate, "MMMM yyyy", { locale: ptBR });

  const prev = () =>
    onDateChange(view === "month" ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  const next = () =>
    onDateChange(view === "month" ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));

  return (
    <div className="flex items-center justify-between pb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday}>
          Hoje
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold capitalize">{label}</h2>
      </div>

      <div className="flex rounded-lg border bg-muted p-0.5">
        <button
          onClick={() => onViewChange("month")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            view === "month"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mês
        </button>
        <button
          onClick={() => onViewChange("week")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            view === "week"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Semana
        </button>
      </div>
    </div>
  );
}
