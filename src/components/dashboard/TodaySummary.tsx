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
    <section className="mb-8">
      <h3 className="text-xl font-semibold text-foreground mb-4">O Teu Dia</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TodayScheduleCard />
        <TodayTasksCard
          tasks={tasks}
          onStatusChange={onStatusChange}
          completedStatusName={completedStatusName}
        />
      </div>
    </section>
  );
}
