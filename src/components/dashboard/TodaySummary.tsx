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
    <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
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
