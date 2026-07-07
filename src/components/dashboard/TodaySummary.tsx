import { Task } from "@/services/tasks";
import { TodayScheduleCard } from "./TodayScheduleCard";
import { TodayTasksCard } from "./TodayTasksCard";

interface TodaySummaryProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  completedStatusName: string;
}

export function TodaySummary({ tasks, onStatusChange, completedStatusName }: TodaySummaryProps) {
  return (
    <div className="mb-8 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section aria-label="O que merece sua atenção hoje">
        <TodayTasksCard
          tasks={tasks}
          onStatusChange={onStatusChange}
          completedStatusName={completedStatusName}
        />
      </section>
      <section aria-label="Planejamento do dia">
        <TodayScheduleCard />
      </section>
    </div>
  );
}
