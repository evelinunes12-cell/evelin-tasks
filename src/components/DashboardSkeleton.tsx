import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface DashboardSkeletonProps {
  viewMode: "list" | "board";
}

const TaskCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="pt-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-full max-w-[200px]" />
        </div>
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
    </CardContent>
    <CardFooter className="flex gap-2 pt-0">
      <Skeleton className="h-8 flex-1" />
      <Skeleton className="h-8 w-10" />
    </CardFooter>
  </Card>
);

const KanbanColumnSkeleton = ({ title, color }: { title: string; color: string }) => (
  <div className="bg-muted/50 rounded-lg p-4">
    <div className="font-semibold text-lg mb-4 flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      {title}
      <Skeleton className="h-5 w-8 ml-auto rounded-full" />
    </div>
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const DashboardSkeleton = ({ viewMode }: DashboardSkeletonProps) => {
  if (viewMode === "list") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <KanbanColumnSkeleton title="A Fazer" color="bg-yellow-500" />
      <KanbanColumnSkeleton title="Em Progresso" color="bg-blue-500" />
      <KanbanColumnSkeleton title="Concluído" color="bg-green-500" />
    </div>
  );
};

export default DashboardSkeleton;
