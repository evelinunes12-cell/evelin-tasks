import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, RotateCcw, X, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudyCycle, saveCycleProgress } from "@/services/studyCycles";
import { createFocusSession } from "@/services/focusSessions";
import { registerActivity } from "@/services/activity";
import { logXP, XP } from "@/services/scoring";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StudyCyclePlayerProps {
  cycle: StudyCycle;
  onClose: () => void;
}

const BREAK_SECONDS = 300; // 5 min

// ─── Animated Donut Ring ───────────────────────────────────────────
const RING_SIZE = 300;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface DonutRingProps {
  progress: number; // 0-100
  color: string;
  isRunning: boolean;
}

const DonutRing = ({ progress, color, isRunning }: DonutRingProps) => {
  const offset = RING_CIRCUMFERENCE * (1 - progress / 100);
  const glowId = "ring-glow";

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="transform -rotate-90"
    >
      <defs>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feFlood floodColor={color} floodOpacity="0.45" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={RING_STROKE}
        className="opacity-40"
      />

      {/* Progress */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        filter={isRunning ? `url(#${glowId})` : undefined}
        className="transition-all duration-1000 linear"
      />
    </svg>
  );
};

// ─── Queue Block Chip ──────────────────────────────────────────────
interface QueueChipProps {
  name: string;
  color: string | null;
  minutes: number;
  isDone: boolean;
  isCurrent?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const QueueChip = ({ name, color, minutes, isDone, isCurrent, onClick, disabled }: QueueChipProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 text-left w-full",
      isCurrent
        ? "bg-primary/10 border border-primary/20 shadow-sm"
        : "bg-card/60 backdrop-blur-sm border border-border/40 hover:bg-card/80 hover:border-border/60",
      isDone && "opacity-35",
      disabled && "cursor-default"
    )}
  >
    <span
      className={cn("h-2.5 w-2.5 rounded-full shrink-0", isCurrent && "ring-2 ring-primary/30 ring-offset-1 ring-offset-background")}
      style={{ backgroundColor: color || "hsl(var(--muted-foreground))" }}
    />
    <span className={cn("text-sm truncate flex-1", isCurrent ? "font-semibold text-foreground" : "text-muted-foreground", isDone && "line-through")}>
      {name || "—"}
    </span>
    <span className="text-xs text-muted-foreground/70 tabular-nums shrink-0">{minutes}min</span>
    {isCurrent && (
      <Badge variant="default" className="text-[10px] h-4 px-1.5 shrink-0">Agora</Badge>
    )}
    {isDone && !isCurrent && <span className="text-xs text-primary shrink-0">✓</span>}
  </button>
);

// ─── Main Player ───────────────────────────────────────────────────
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const currentBlock = blocks[currentIndex];
  const isBreak = mode === "break";
  const totalSeconds = isBreak
    ? BREAK_SECONDS
    : currentBlock
    ? currentBlock.allocated_minutes * 60
    : 0;

  // ── Persistence ──────────────────────────────────────────────────
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

  const playAlarm = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // silent fallback
    }
  }, []);

  const handleStudyComplete = useCallback(async () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setCompletedBlocks((prev) => new Set(prev).add(currentIndex));
    playAlarm();
    if (user) {
      await registerActivity(user.id);
      logXP(user.id, "study_block_completed", XP.STUDY_BLOCK_COMPLETED);
      const block = blocks[currentIndex];
      if (block) {
        const startedAt = new Date(Date.now() - block.allocated_minutes * 60 * 1000);
        await createFocusSession(user.id, startedAt, block.allocated_minutes, block.subject_id, cycle.id);
      }
    }
    toast.success(`✅ ${currentBlock?.subject?.name || "Bloco"} concluído!`);
    setMode("break");
    setTimeRemaining(BREAK_SECONDS);
  }, [currentIndex, currentBlock, blocks, user, clearTimer, playAlarm, cycle.id]);

  const handleBreakComplete = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    playAlarm();
    const allDone = completedBlocks.size + 1 >= blocks.length;
    if (allDone && completedBlocks.has(currentIndex)) {
      toast.success("🎉 Ciclo completo! Parabéns!");
      setMode("study");
      persistProgress(0, null);
      return;
    }
    advanceToNextBlock();
  }, [clearTimer, completedBlocks, blocks.length, currentIndex, advanceToNextBlock, persistProgress, playAlarm]);

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

  // ── Derived UI values ────────────────────────────────────────────
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

  const statusLabel = isBreak
    ? isRunning ? "Descansando..." : "Intervalo"
    : isRunning
    ? "Estudando..."
    : isPaused
    ? "Pausado"
    : allDone
    ? "Concluído!"
    : "Pronto";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background transition-colors duration-500">
      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-sm font-medium text-muted-foreground truncate tracking-wide">
            {cycle.name}
          </span>
          {isBreak ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Coffee className="h-3 w-3" /> Intervalo
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 tabular-nums font-medium">
              {currentIndex + 1} / {blocks.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Main content ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 max-w-lg mx-auto w-full">

        {/* Donut ring + center info */}
        <div className="relative flex items-center justify-center">
          <DonutRing progress={progress} color={subjectColor} isRunning={isRunning} />

          {/* Center overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Time */}
            <span
              className={cn(
                "text-5xl font-mono font-bold tracking-tighter tabular-nums transition-colors duration-300",
                isRunning && "text-foreground",
                isPaused && "text-destructive",
                !isRunning && !isPaused && "text-muted-foreground"
              )}
            >
              {formattedTime}
            </span>

            {/* Mode label */}
            <span className="text-sm text-muted-foreground mt-1.5 font-medium">
              {statusLabel}
            </span>

            {/* Subject / break icon */}
            <div className="mt-3 flex items-center gap-2">
              {isBreak ? (
                <Coffee className="h-4 w-4 text-primary" />
              ) : (
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: subjectColor }}
                />
              )}
              <span className="text-xs font-semibold text-foreground/80 truncate max-w-[140px]">
                {isBreak ? "Hora do Intervalo" : currentBlock?.subject?.name || "Disciplina"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Controls ───────────────────────────────────────────── */}
        <div className="flex items-center gap-5">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-border/50"
            onClick={handleRestart}
            disabled={allDone && !isBreak}
          >
            <RotateCcw className="h-5 w-5" />
          </Button>

          <Button
            size="icon"
            className="h-16 w-16 rounded-full shadow-lg transition-shadow duration-300"
            style={{
              backgroundColor: subjectColor,
              boxShadow: isRunning ? `0 0 30px ${subjectColor}44, 0 4px 20px ${subjectColor}33` : undefined,
            }}
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
            className="h-12 w-12 rounded-full border-border/50"
            onClick={handleSkip}
            disabled={allDone && !isBreak}
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        {/* Skip break shortcut */}
        {isBreak && (
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs text-muted-foreground hover:text-foreground">
            Pular intervalo e ir para a próxima matéria →
          </Button>
        )}
      </div>

      {/* ── Queue ──────────────────────────────────────────────────── */}
      <div className="border-t border-border/40 px-5 py-4 bg-muted/30 backdrop-blur-sm">
        <p className="text-[11px] font-semibold text-muted-foreground/60 mb-2.5 uppercase tracking-widest">
          {isBreak ? "Próxima" : "Fila"}
        </p>
        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {!isBreak && (
            <QueueChip
              name={currentBlock?.subject?.name || "—"}
              color={currentBlock?.subject?.color || null}
              minutes={currentBlock?.allocated_minutes || 0}
              isDone={false}
              isCurrent
              disabled
            />
          )}
          {upcomingBlocks.map((block, i) => {
            const isDone = completedBlocks.has(block._idx);
            return (
              <QueueChip
                key={`${block.id}-${i}`}
                name={block.subject?.name || "—"}
                color={block.subject?.color || null}
                minutes={block.allocated_minutes}
                isDone={isDone}
                onClick={() => !isBreak && goToBlock(block._idx)}
                disabled={isBreak}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudyCyclePlayer;
