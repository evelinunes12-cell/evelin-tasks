import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, PlayCircle } from "lucide-react";

interface StatsCardsProps {
  aFazer: number;
  emProgresso: number;
  concluido: number;
}

const StatsCards = ({ aFazer, emProgresso, concluido }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-6">
      <Card className="border-l-4 border-l-muted hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-muted/50">
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">A Fazer</p>
              <p className="text-3xl font-bold text-foreground">{aFazer}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-warning hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-warning/10">
              <PlayCircle className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Em Progresso</p>
              <p className="text-3xl font-bold text-foreground">{emProgresso}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-success hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-default">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-success/10">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Concluído</p>
              <p className="text-3xl font-bold text-foreground">{concluido}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
