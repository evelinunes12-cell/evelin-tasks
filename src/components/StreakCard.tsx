import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StreakCardProps {
  streak: number;
  completedToday: boolean;
}

export const StreakCard = ({ streak, completedToday }: StreakCardProps) => {
  const isActive = streak > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 cursor-help",
              isActive 
                ? "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400" 
                : "bg-muted/50 border-border text-muted-foreground"
            )}
          >
            <Flame 
              className={cn(
                "w-5 h-5 transition-all",
                isActive && "animate-pulse text-orange-500"
              )} 
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-none">{streak}</span>
              <span className="text-xs opacity-75">
                {streak === 1 ? 'dia' : 'dias'}
              </span>
            </div>
            {completedToday && isActive && (
              <span className="text-xs bg-orange-500/20 px-1.5 py-0.5 rounded-full ml-1">
                🔥
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-semibold">Sequência de uso do sistema 🔥</p>
          <p className="text-sm text-muted-foreground">
            Realize ações diárias para manter a chama acesa!
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default StreakCard;
