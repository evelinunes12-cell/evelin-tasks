import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, SkipForward, RotateCcw, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudyCycle, StudyCycleBlock } from "@/services/studyCycles";
import { registerActivity } from "@/services/activity";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StudyCyclePlayerProps {
  cycle: StudyCycle;
  onClose: () => void;
}

const StudyCyclePlayer = ({ cycle, onClose }: StudyCyclePlayerProps) => {
  const { user } = useAuth();
  const blocks = cycle.blocks || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completedBlocks, setCompletedBlocks] = useState<Set<number>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const currentBlock = blocks[currentIndex];
  const totalSeconds = currentBlock ? currentBlock.allocated_minutes * 60 : 0;

  // Initialize time when block changes
  useEffect(() => {
    if (currentBlock && !isRunning && !isPaused) {
      setTimeRemaining(currentBlock.allocated_minutes * 60);
    }
  }, [currentIndex, currentBlock]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endTimeRef.current = null;
  }, []);

  const handleBlockComplete = useCallback(async () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setCompletedBlocks((prev) => new Set(prev).add(currentIndex));

    // Register activity for streak
    if (user) {
      await registerActivity(user.id);
    }

    const isLast = currentIndex >= blocks.length - 1;
    if (isLast) {
      toast.success("🎉 Ciclo completo! Parabéns!");
    } else {
      toast.success(`✅ ${currentBlock?.subject?.name || "Bloco"} concluído!`);
      // Auto-advance after short delay
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setTimeRemaining(blocks[currentIndex + 1]?.allocated_minutes * 60 || 0);
      }, 1500);
    }
  }, [currentIndex, blocks, currentBlock, user, clearTimer]);

  // Timer tick
  useEffect(() => {
    if (isRunning && endTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTimeRef.current! - now) / 1000));
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          handleBlockComplete();
        }
      }, 250);
    }
    return clearTimer;
  }, [isRunning, handleBlockComplete, clearTimer]);

  const startTimer = () => {
    const now = Date.now();
    endTimeRef.current = now + timeRemaining * 1000;
    setIsRunning(true);
    setIsPaused(false);
  };

  const pauseTimer = () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(true);
  };

  const handlePlayPause = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const handleSkip = () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setCompletedBlocks((prev) => new Set(prev).add(currentIndex));
    if (currentIndex < blocks.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setTimeRemaining(blocks[nextIdx].allocated_minutes * 60);
    } else {
      toast.success("🎉 Ciclo completo!");
    }
  };

  const handleRestart = () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(currentBlock?.allocated_minutes * 60 || 0);
  };

  const goToBlock = (index: number) => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(index);
    setTimeRemaining(blocks[index].allocated_minutes * 60);
  };

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const progress = totalSeconds > 0 ? ((totalSeconds - timeRemaining) / totalSeconds) * 100 : 0;
  const allDone = completedBlocks.size === blocks.length;
  const subjectColor = currentBlock?.subject?.color || "hsl(var(--primary))";

  if (blocks.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-muted-foreground truncate">
            {cycle.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1}/{blocks.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {/* Subject info */}
        <div className="text-center space-y-2">
          <div
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-2"
            style={{ backgroundColor: subjectColor + "22" }}
          >
            <div
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: subjectColor }}
            />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {currentBlock?.subject?.name || "Disciplina"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentBlock?.allocated_minutes} minutos alocados
          </p>
        </div>

        {/* Timer circle */}
        <div className="relative">
          <svg className="w-52 h-52 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
              fill="none"
              className="opacity-30"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke={subjectColor}
              strokeWidth="6"
              fill="none"
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={2 * Math.PI * 54 * (1 - progress / 100)}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "text-4xl font-mono font-bold tracking-tight",
                isRunning && "text-foreground",
                isPaused && "text-warning",
                !isRunning && !isPaused && "text-muted-foreground"
              )}
            >
              {formattedTime}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {isRunning ? "Estudando..." : isPaused ? "Pausado" : allDone ? "Concluído!" : "Pronto"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={handleRestart}
            disabled={allDone}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            className="h-16 w-16 rounded-full shadow-lg"
            style={{ backgroundColor: subjectColor }}
            onClick={handlePlayPause}
            disabled={allDone}
          >
            {isRunning ? (
              <Pause className="h-7 w-7 text-white" />
            ) : (
              <Play className="h-7 w-7 text-white ml-0.5" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={handleSkip}
            disabled={allDone}
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Block list (bottom) */}
      <div className="border-t border-border px-4 py-3 max-h-48 overflow-y-auto">
        <div className="space-y-1">
          {blocks.map((block, idx) => {
            const isDone = completedBlocks.has(idx);
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={block.id}
                onClick={() => goToBlock(idx)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                  isCurrent && "bg-accent",
                  !isCurrent && "hover:bg-accent/50",
                  isDone && !isCurrent && "opacity-50"
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {block.subject?.color && (
                    <span
                      className={cn("h-3 w-3 rounded-full shrink-0", isDone && "opacity-50")}
                      style={{ backgroundColor: block.subject.color }}
                    />
                  )}
                  <span
                    className={cn(
                      "text-sm truncate",
                      isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                      isDone && "line-through"
                    )}
                  >
                    {block.subject?.name || "—"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {block.allocated_minutes}min
                </span>
                {isCurrent && !isDone && (
                  <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                {isDone && (
                  <span className="text-xs text-success shrink-0">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudyCyclePlayer;
