import { useDraggable } from "@dnd-kit/core";
import { CalendarEventPill } from "./CalendarEventPill";

interface DraggableEventPillProps {
  id: string;
  type: "schedule" | "note" | "goal" | "task";
  title: string;
  time?: string;
  color?: string | null;
  completed?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function DraggableEventPill({ id, type, ...rest }: DraggableEventPillProps) {
  const isDraggable = type === "note" || type === "goal";

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${type}-${id}`,
    data: { type, id },
    disabled: !isDraggable,
  });

  return (
    <div
      ref={isDraggable ? setNodeRef : undefined}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: "none" }}
    >
      <CalendarEventPill type={type} {...rest} />
    </div>
  );
}
