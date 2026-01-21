import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

const PRESETS = [
  { label: "Últimos 7 dias", value: "7d" },
  { label: "Últimos 30 dias", value: "30d" },
  { label: "Últimos 90 dias", value: "90d" },
  { label: "Este mês", value: "this-month" },
  { label: "Mês passado", value: "last-month" },
  { label: "Personalizado", value: "custom" },
];

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState("30d");

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    const today = new Date();

    switch (value) {
      case "7d":
        onDateRangeChange({ from: subDays(today, 7), to: today });
        break;
      case "30d":
        onDateRangeChange({ from: subDays(today, 30), to: today });
        break;
      case "90d":
        onDateRangeChange({ from: subDays(today, 90), to: today });
        break;
      case "this-month":
        onDateRangeChange({ from: startOfMonth(today), to: today });
        break;
      case "last-month": {
        const lastMonth = subMonths(today, 1);
        onDateRangeChange({
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        });
        break;
      }
      case "custom":
        // Keep current range for custom selection
        break;
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setSelectedPreset("custom");
    onDateRangeChange(range);
  };

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2", className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full sm:w-auto justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecione as datas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
