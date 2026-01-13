import { useState } from "react";
import { useFocusTimer } from "@/contexts/FocusTimerContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Play, Pause, RotateCcw, Timer, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

export const FocusTimer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { timeRemaining, isRunning, isPaused, isBreak, start, pause, resume, reset, totalTime, isCompleted } = useFocusTimer();

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const progress = ((totalTime - timeRemaining) / totalTime) * 100;
  const hasStarted = isRunning || isPaused || timeRemaining < totalTime;

  const handlePlayPause = () => {
    if (isRunning) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      start();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative flex items-center gap-2 rounded-full px-3 py-2 transition-all",
            isRunning && !isBreak && "bg-primary/10 text-primary animate-pulse",
            isRunning && isBreak && "bg-green-500/10 text-green-600 animate-pulse",
            isPaused && "bg-yellow-500/10 text-yellow-600",
            isCompleted && "bg-green-500/10 text-green-600"
          )}
        >
          <div className="relative">
            {isBreak ? <Coffee className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
            {hasStarted && (
              <span
                className={cn(
                  "absolute -top-1 -right-1 w-2 h-2 rounded-full",
                  isRunning && !isBreak && "bg-primary",
                  isRunning && isBreak && "bg-green-500",
                  isPaused && "bg-yellow-500",
                  isCompleted && "bg-green-500"
                )}
              />
            )}
          </div>
          {hasStarted && (
            <span className="text-sm font-mono font-medium hidden sm:inline">
              {formattedTime}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">
              {isBreak ? "☕ Pausa Curta" : "🍅 Modo Foco"}
            </h3>
            <div className="relative">
              {/* Circular Progress */}
              <svg className="w-28 h-28 mx-auto transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="50"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted/20"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="50"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - progress / 100)}
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-1000",
                    isRunning && !isBreak && "text-primary",
                    isRunning && isBreak && "text-green-500",
                    isPaused && "text-yellow-500",
                    isCompleted && "text-green-500",
                    !hasStarted && "text-muted-foreground"
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn(
                  "text-2xl font-mono font-bold",
                  isRunning && !isBreak && "text-primary",
                  isRunning && isBreak && "text-green-600",
                  isPaused && "text-yellow-600",
                  isCompleted && "text-green-600"
                )}>
                  {formattedTime}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePlayPause}
              className="h-10 w-10 rounded-full"
            >
              {isRunning ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={reset}
              className="h-10 w-10 rounded-full"
              disabled={!hasStarted && timeRemaining === totalTime}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {isCompleted && !isRunning && (
            <p className="text-center text-sm text-green-600 font-medium">
              🎉 Ciclo concluído! {isBreak ? "Hora de focar!" : "Hora do descanso!"}
            </p>
          )}

          <p className="text-center text-xs text-muted-foreground">
            {isRunning && !isBreak && "Focando..."}
            {isRunning && isBreak && "Descansando..."}
            {isPaused && "Pausado"}
            {!hasStarted && "Clique play para iniciar"}
          </p>

          <p className="text-center text-xs text-muted-foreground border-t pt-3">
            Concluir um ciclo conta para sua ofensiva 🔥
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
