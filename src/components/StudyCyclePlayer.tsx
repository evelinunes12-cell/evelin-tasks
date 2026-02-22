import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, RotateCcw, X, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudyCycle, saveCycleProgress } from "@/services/studyCycles";
import { registerActivity } from "@/services/activity";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StudyCyclePlayerProps {
  cycle: StudyCycle;
  onClose: () => void;
}

const BREAK_SECONDS = 300; // 5 min

const StudyCyclePlayer = ({ cycle, onClose }: StudyCyclePlayerProps) => {
  const { user } = useAuth();
  const blocks = cycle.blocks || [];

  // Initialize from saved progress
  const savedIndex = Math.min(cycle.current_block_index || 0, Math.max(blocks.length - 1, 0));
  const savedRemaining = cycle.current_block_remaining_seconds;

  const [currentIndex, setCurrentIndex] = useState(savedIndex);
  const [timeRemaining, setTimeRemaining] = useState(
    savedRemaining ?? (blocks[savedIndex]?.allocated_minutes ?? 0) * 60
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completedBlocks, setCompletedBlocks] = useState<Set<number>>(() => {
    const set = new Set<number>();
    for (let i = 0; i < savedIndex; i++) set.add(i);
    return set;
  });
  const [mode, setMode] = useState<"study" | "break">("study");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const currentBlock = blocks[currentIndex];
  const isBreak = mode === "break";
  const totalSeconds = isBreak
    ? BREAK_SECONDS
    : currentBlock
    ? currentBlock.allocated_minutes * 60
    : 0;

  // Save progress to DB
  const persistProgress = useCallback(
    async (blockIdx: number, remaining: number | null) => {
      try {
        await saveCycleProgress(cycle.id, blockIdx, remaining);
      } catch {
        // silent
      }
    },
    [cycle.id]
  );

  // Save on unmount / close
  useEffect(() => {
    return () => {
      if (mode === "study") {
        persistProgress(currentIndex, timeRemaining > 0 ? timeRemaining : null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, timeRemaining, mode]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endTimeRef.current = null;
  }, []);

  const advanceToNextBlock = useCallback(() => {
    const nextIdx = currentIndex + 1 < blocks.length ? currentIndex + 1 : 0;
    setCurrentIndex(nextIdx);
    setTimeRemaining(blocks[nextIdx].allocated_minutes * 60);
    setMode("study");
    setIsRunning(false);
    setIsPaused(false);
    persistProgress(nextIdx, null);
  }, [currentIndex, blocks, persistProgress]);

  const handleStudyComplete = useCallback(async () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setCompletedBlocks((prev) => new Set(prev).add(currentIndex));

    if (user) {
      await registerActivity(user.id);
    }

    toast.success(`✅ ${currentBlock?.subject?.name || "Bloco"} concluído!`);

    // Start break
    setMode("break");
    setTimeRemaining(BREAK_SECONDS);
  }, [currentIndex, currentBlock, user, clearTimer]);

  const handleBreakComplete = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);

    const allDone = completedBlocks.size + 1 >= blocks.length;
    if (allDone && completedBlocks.has(currentIndex)) {
      toast.success("🎉 Ciclo completo! Parabéns!");
      setMode("study");
      persistProgress(0, null);
      return;
    }
    advanceToNextBlock();
  }, [clearTimer, completedBlocks, blocks.length, currentIndex, advanceToNextBlock, persistProgress]);

  // Timer tick
  useEffect(() => {
    if (isRunning && endTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTimeRef.current! - now) / 1000));
        setTimeRemaining(remaining);
      }, 250);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  // Handle completion
  useEffect(() => {
    if (isRunning && timeRemaining <= 0 && endTimeRef.current) {
      if (mode === "study") {
        handleStudyComplete();
      } else {
        handleBreakComplete();
      }
    }
  }, [isRunning, timeRemaining, mode, handleStudyComplete, handleBreakComplete]);

  const startTimer = () => {
    endTimeRef.current = Date.now() + timeRemaining * 1000;
    setIsRunning(true);
    setIsPaused(false);
  };

  const pauseTimer = () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(true);
    if (mode === "study") {
      persistProgress(currentIndex, timeRemaining);
    }
  };

  const handlePlayPause = () => {
    if (isRunning) pauseTimer();
    else startTimer();
  };

  const handleSkip = () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    if (isBreak) {
      advanceToNextBlock();
      return;
    }
    setCompletedBlocks((prev) => new Set(prev).add(currentIndex));
    if (currentIndex < blocks.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setTimeRemaining(blocks[nextIdx].allocated_minutes * 60);
      persistProgress(nextIdx, null);
    } else {
      toast.success("🎉 Ciclo completo!");
      persistProgress(0, null);
    }
  };

  const handleRestart = () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    if (isBreak) {
      setTimeRemaining(BREAK_SECONDS);
    } else {
      setTimeRemaining(currentBlock?.allocated_minutes * 60 || 0);
    }
  };

  const goToBlock = (index: number) => {
    if (isBreak) return;
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(index);
    setTimeRemaining(blocks[index].allocated_minutes * 60);
    persistProgress(index, null);
  };

  const handleClose = () => {
    clearTimer();
    if (mode === "study") {
      persistProgress(currentIndex, timeRemaining > 0 ? timeRemaining : null);
    }
    onClose();
  };

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const progress = totalSeconds > 0 ? ((totalSeconds - timeRemaining) / totalSeconds) * 100 : 0;
  const allDone = completedBlocks.size === blocks.length;
  const subjectColor = isBreak ? "hsl(var(--primary))" : currentBlock?.subject?.color || "hsl(var(--primary))";

  if (blocks.length === 0) return null;

  // Queue: upcoming blocks (next 3 after current)
  const upcomingBlocks = [];
  for (let i = 1; i <= 3; i++) {
    const idx = (currentIndex + i) % blocks.length;
    if (idx !== currentIndex) upcomingBlocks.push({ ...blocks[idx], _idx: idx });
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col transition-colors duration-500",
        isBreak ? "bg-muted" : "bg-background"
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-muted-foreground truncate">
            {cycle.name}
          </span>
          {isBreak ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Coffee className="h-3 w-3" /> Intervalo
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1}/{blocks.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Subject / break info */}
        <div className="text-center space-y-2">
          {isBreak ? (
            <>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-2 bg-primary/10">
                <Coffee className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Hora do Intervalo</h2>
              <p className="text-sm text-muted-foreground">Descanse um pouco antes de continuar</p>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Timer circle */}
        <div className="relative">
          <svg className="w-52 h-52 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r="54"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
              fill="none"
              className="opacity-30"
            />
            <circle
              cx="60" cy="60" r="54"
              stroke={isBreak ? "hsl(var(--primary))" : subjectColor}
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
                isPaused && "text-destructive",
                !isRunning && !isPaused && "text-muted-foreground"
              )}
            >
              {formattedTime}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {isBreak
                ? isRunning
                  ? "Descansando..."
                  : "Intervalo"
                : isRunning
                ? "Estudando..."
                : isPaused
                ? "Pausado"
                : allDone
                ? "Concluído!"
                : "Pronto"}
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
            disabled={allDone && !isBreak}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            className="h-16 w-16 rounded-full shadow-lg"
            style={{ backgroundColor: isBreak ? "hsl(var(--primary))" : subjectColor }}
            onClick={handlePlayPause}
            disabled={allDone && !isBreak}
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
            disabled={allDone && !isBreak}
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        {/* Skip break shortcut */}
        {isBreak && (
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs text-muted-foreground">
            Pular intervalo e ir para a próxima matéria →
          </Button>
        )}
      </div>

      {/* Queue / upcoming blocks (bottom) */}
      <div className="border-t border-border px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          {isBreak ? "Próxima" : "Fila"}
        </p>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {!isBreak && (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {currentBlock?.subject?.color && (
                  <span
                    className="h-3 w-3 rounded-full shrink-0 ring-2 ring-primary/30"
                    style={{ backgroundColor: currentBlock.subject.color }}
                  />
                )}
                <span className="text-sm font-semibold text-foreground truncate">
                  {currentBlock?.subject?.name || "—"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {currentBlock?.allocated_minutes}min
              </span>
              <Badge variant="default" className="text-[10px] h-4 px-1.5">Agora</Badge>
            </div>
          )}
          {upcomingBlocks.map((block, i) => {
            const isDone = completedBlocks.has(block._idx);
            return (
              <button
                key={`${block.id}-${i}`}
                onClick={() => !isBreak && goToBlock(block._idx)}
                disabled={isBreak}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                  !isBreak && "hover:bg-accent/50",
                  isDone && "opacity-40"
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
                      "text-sm truncate text-muted-foreground",
                      isDone && "line-through"
                    )}
                  >
                    {block.subject?.name || "—"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {block.allocated_minutes}min
                </span>
                {isDone && <span className="text-xs text-primary shrink-0">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudyCyclePlayer;
