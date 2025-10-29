import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, PlayCircle } from "lucide-react";

interface StatsCardsProps {
  notStarted: number;
  inProgress: number;
  completed: number;
}

const StatsCards = ({ notStarted, inProgress, completed }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="border-l-4 border-l-muted hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-muted/50">
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Não Iniciadas</p>
              <p className="text-3xl font-bold text-foreground">{notStarted}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-warning hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-warning/10">
              <PlayCircle className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Em Andamento</p>
              <p className="text-3xl font-bold text-foreground">{inProgress}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-success hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-success/10">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Concluídas</p>
              <p className="text-3xl font-bold text-foreground">{completed}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
