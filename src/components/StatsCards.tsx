import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, PlayCircle, Circle } from "lucide-react";
import { useMemo } from "react";

interface StatusData {
  id: string;
  name: string;
  color: string | null;
  order_index: number;
  show_in_dashboard: boolean;
  parent_id: string | null;
  children?: StatusData[];
}

interface Task {
  status: string;
}

interface StatsCardsProps {
  tasks: Task[];
  statuses: StatusData[];
}

// Helper to get icon based on status name
const getStatusIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("conclu") || lowerName.includes("feito") || lowerName.includes("done")) {
    return CheckCircle2;
  }
  if (lowerName.includes("progresso") || lowerName.includes("andamento") || lowerName.includes("progress")) {
    return PlayCircle;
  }
  if (lowerName.includes("fazer") || lowerName.includes("todo") || lowerName.includes("pendente")) {
    return Clock;
  }
  return Circle;
};

// Helper to get semantic color class based on status
const getStatusColorClass = (name: string, colorHex: string | null) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("conclu") || lowerName.includes("feito") || lowerName.includes("done")) {
    return { border: "border-l-success", bg: "bg-success/10", text: "text-success" };
  }
  if (lowerName.includes("progresso") || lowerName.includes("andamento") || lowerName.includes("progress")) {
    return { border: "border-l-warning", bg: "bg-warning/10", text: "text-warning" };
  }
  return { border: "border-l-muted", bg: "bg-muted/50", text: "text-muted-foreground" };
};

const StatsCards = ({ tasks, statuses }: StatsCardsProps) => {
  // Filter statuses that should be shown in dashboard (parent only with show_in_dashboard=true)
  const dashboardStatuses = useMemo(() => {
    return statuses
      .filter(s => !s.parent_id && s.show_in_dashboard)
      .sort((a, b) => a.order_index - b.order_index);
  }, [statuses]);

  // Count tasks per status (including children)
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    dashboardStatuses.forEach(parentStatus => {
      // Collect all status names that belong to this parent (parent + children)
      const statusNames = [
        parentStatus.name,
        ...(parentStatus.children?.map(c => c.name) || [])
      ];
      
      counts[parentStatus.id] = tasks.filter(task => 
        statusNames.includes(task.status)
      ).length;
    });
    
    return counts;
  }, [tasks, dashboardStatuses]);

  if (dashboardStatuses.length === 0) {
    return null;
  }

  // Determine grid columns based on number of statuses
  const gridCols = dashboardStatuses.length <= 3 
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={`grid ${gridCols} gap-4 mb-6`}>
      {dashboardStatuses.map((status) => {
        const Icon = getStatusIcon(status.name);
        const colorClasses = getStatusColorClass(status.name, status.color);
        
        return (
          <Card 
            key={status.id} 
            className={`border-l-4 ${colorClasses.border} hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default`}
            style={status.color ? { borderLeftColor: status.color } : undefined}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div 
                  className={`p-3 rounded-full ${colorClasses.bg}`}
                  style={status.color ? { backgroundColor: `${status.color}20` } : undefined}
                >
                  <Icon 
                    className={`w-6 h-6 ${colorClasses.text}`} 
                    style={status.color ? { color: status.color } : undefined}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{status.name}</p>
                  <p className="text-3xl font-bold text-foreground">{taskCounts[status.id] || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;
