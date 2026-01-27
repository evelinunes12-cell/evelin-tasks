import { useDroppable } from "@dnd-kit/core";
import { Task } from "@/services/tasks";
import { KanbanCard } from "./KanbanCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  availableStatuses: string[];
  completedStatusName: string;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onArchive: (taskId: string) => void;
}

export function KanbanColumn({
  id,
  title,
  color,
  tasks,
  availableStatuses,
  completedStatusName,
  onDelete,
  onStatusChange,
  onArchive,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-muted/50 rounded-lg p-4 min-w-[85vw] md:min-w-0 snap-center flex-shrink-0 transition-all duration-200",
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background bg-muted/80"
      )}
    >
      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <span className={cn("w-3 h-3 rounded-full", color)} />
        {title}
        <Badge variant="secondary" className="ml-auto">
          {tasks.length}
        </Badge>
      </h3>
      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              availableStatuses={availableStatuses}
              completedStatusName={completedStatusName}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onArchive={onArchive}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Arraste tarefas para cá
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
