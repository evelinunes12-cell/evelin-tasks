import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface DroppableDayCellProps {
  dateStr: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DroppableDayCell({ dateStr, children, className, onClick }: DroppableDayCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dateStr}`,
    data: { dateStr },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "ring-2 ring-primary/40 bg-primary/5"
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
