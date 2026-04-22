import { Button } from "@/components/ui/button";
import { useStudyCyclePlayer } from "@/contexts/StudyCyclePlayerContext";
import { useLocation } from "react-router-dom";
import StudyCyclePlayer from "@/components/StudyCyclePlayer";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders the global cycle player overlay + a floating "resume" pill
 * shown when the player is collapsed and a cycle is active.
 */
const GlobalStudyCyclePlayer = () => {
  const { cycle, isExpanded, isRunning, mode, currentIndex, elapsedSeconds, breakRemaining, expand } = useStudyCyclePlayer();
  const location = useLocation();

  if (!cycle) return null;

  // Hide floating pill on auth/onboarding screens
  const hidePill = location.pathname === "/auth" || location.pathname === "/onboarding";

  const blocks = cycle.blocks || [];
  const currentBlock = blocks[currentIndex];
  const isBreak = mode === "break";
  const subjectColor = isBreak ? "hsl(var(--primary))" : currentBlock?.subject?.color || "hsl(var(--primary))";

  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };
  const timeText = isBreak ? formatTime(breakRemaining) : formatTime(elapsedSeconds);

  return (
    <>
      <StudyCyclePlayer />
      {!isExpanded && !hidePill && (
        <button
          onClick={expand}
          className={cn(
            "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40",
            "flex items-center gap-2 pl-3 pr-4 py-2 rounded-full",
            "bg-card border border-border shadow-lg hover:shadow-xl transition-all",
            "backdrop-blur-md"
          )}
          aria-label="Voltar ao ciclo de estudos"
          title="Voltar ao ciclo de estudos"
        >
          <span
            className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: subjectColor }}
          >
            {isRunning ? (
              <Pause className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 text-white ml-0.5" />
            )}
          </span>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {isBreak ? "Intervalo" : currentBlock?.subject?.name || "Estudo"}
            </span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{timeText}</span>
          </div>
        </button>
      )}
    </>
  );
};

export default GlobalStudyCyclePlayer;
