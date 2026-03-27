import { cn } from "@/lib/utils";
import { Clock, StickyNote, Target, ClipboardList } from "lucide-react";

interface CalendarEventPillProps {
  type: "schedule" | "note" | "goal" | "task";
  title: string;
  time?: string;
  color?: string | null;
  completed?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const typeConfig = {
  schedule: {
    bg: "bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    icon: Clock,
  },
  note: {
    bg: "bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    icon: StickyNote,
  },
  goal: {
    bg: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    icon: Target,
  },
  task: {
    bg: "bg-violet-500/15 hover:bg-violet-500/25 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    icon: ClipboardList,
  },
};

export function CalendarEventPill({
  type,
  title,
  time,
  color,
  completed,
  onClick,
}: CalendarEventPillProps) {
  const config = typeConfig[type];

  const customBg = type === "schedule" && color
    ? { backgroundColor: `${color}20`, color }
    : undefined;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight truncate flex items-center gap-1 transition-colors",
        !customBg && config.bg,
        completed && "line-through opacity-60"
      )}
      style={customBg}
      title={title}
    >
      {time && <span className="font-medium shrink-0">{time}</span>}
      <span className="truncate">{title || "Sem título"}</span>
    </button>
  );
}
