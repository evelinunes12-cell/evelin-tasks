import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakCardProps {
  streak: number;
  completedToday: boolean;
}

export const StreakCard = ({ streak, completedToday }: StreakCardProps) => {
  const isActive = streak > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300",
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
  );
};

export default StreakCard;
