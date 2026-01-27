import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { useState } from "react";
import { Task } from "@/services/tasks";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";

interface KanbanBoardProps {
  tasks: Task[];
  availableStatuses: string[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onDelete: (taskId: string) => void;
  onArchive: (taskId: string) => void;
}

// Status column configuration
const COLUMNS = [
  {
    id: "a-fazer",
    title: "A Fazer",
    color: "bg-yellow-500",
    matcher: (status: string) =>
      status.toLowerCase().includes("não") ||
      status.toLowerCase().includes("nao") ||
      status.toLowerCase().includes("fazer"),
    targetStatus: "A Fazer",
  },
  {
    id: "em-progresso",
    title: "Em Progresso",
    color: "bg-blue-500",
    matcher: (status: string) =>
      status.toLowerCase().includes("progresso") ||
      status.toLowerCase().includes("andamento"),
    targetStatus: "Em Progresso",
  },
  {
    id: "concluido",
    title: "Concluído",
    color: "bg-green-500",
    matcher: (status: string) => status.toLowerCase().includes("conclu"),
    targetStatus: "Concluído",
  },
];

export function KanbanBoard({
  tasks,
  availableStatuses,
  onStatusChange,
  onDelete,
  onArchive,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configure sensors for both pointer and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    COLUMNS.forEach((col) => {
      grouped[col.id] = tasks.filter((task) => col.matcher(task.status));
    });
    
    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = COLUMNS.find((col) => col.id === overId);
    
    if (targetColumn) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && !targetColumn.matcher(task.status)) {
        onStatusChange(taskId, targetColumn.targetStatus);
      }
    }
  };

  const completedStatusName =
    availableStatuses.find((s) => s.toLowerCase().includes("conclu")) ||
    "Concluído";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto snap-x snap-mandatory touch-pan-x pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            tasks={tasksByColumn[column.id] || []}
            availableStatuses={availableStatuses}
            completedStatusName={completedStatusName}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onArchive={onArchive}
          />
        ))}
      </div>

      {/* Drag Overlay - shows the card being dragged */}
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 rotate-3 scale-105">
            <KanbanCard
              task={activeTask}
              availableStatuses={availableStatuses}
              completedStatusName={completedStatusName}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onArchive={onArchive}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
