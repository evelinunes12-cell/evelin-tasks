import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, RotateCcw, X, Coffee, CheckCircle2, ClipboardEdit, PictureInPicture2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DonutTimer } from "@/components/DonutTimer";
import { StudyCycle, saveCycleProgress } from "@/services/studyCycles";
import { createFocusSession } from "@/services/focusSessions";
import { registerActivity } from "@/services/activity";
import { logXP, XP } from "@/services/scoring";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ManualStudyLogDialog from "@/components/ManualStudyLogDialog";
import { useDocumentPiP } from "@/hooks/useDocumentPiP";
import { setCurrentStudyInfo, clearCurrentStudyInfo } from "@/lib/studyPresence";

interface StudyCyclePlayerProps {
  cycle: StudyCycle;
  onClose: () => void;
}

const BREAK_SECONDS = 300; // 5 min

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

// ─── Main Player (Count-Up Timer) ──────────────────────────────────
const StudyCyclePlayer = ({ cycle, onClose }: StudyCyclePlayerProps) => {
  const { user } = useAuth();
  const blocks = cycle.blocks || [];

  const savedIndex = Math.min(cycle.current_block_index || 0, Math.max(blocks.length - 1, 0));

  const [currentIndex, setCurrentIndex] = useState(savedIndex);
  // Count-up: elapsed seconds
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completedBlocks, setCompletedBlocks] = useState<Set<number>>(() => {
    const set = new Set<number>();
    for (let i = 0; i < savedIndex; i++) set.add(i);
    return set;
  });
  const [mode, setMode] = useState<"study" | "break">("study");
  const [targetReached, setTargetReached] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedAtStartRef = useRef(0);

  // Break mode uses countdown
  const [breakRemaining, setBreakRemaining] = useState(BREAK_SECONDS);
  const breakEndTimeRef = useRef<number | null>(null);

  const [manualLogOpen, setManualLogOpen] = useState(false);
  const { open: openPiP, isOpen: pipOpen, pipContainer, isSupported: pipSupported } = useDocumentPiP({ width: 280, height: 320 });

  const handleTogglePiP = async () => {
    try {
      await openPiP();
    } catch {
      toast.error("Seu navegador não suporta janela flutuante. Tente Chrome ou Edge.");
    }
  };

  const currentBlock = blocks[currentIndex];
  const isBreak = mode === "break";
  const targetSeconds = currentBlock ? currentBlock.allocated_minutes * 60 : 0;

  const isOvertime = !isBreak && elapsedSeconds > targetSeconds && targetSeconds > 0;

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
        persistProgress(currentIndex, null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, mode]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
    breakEndTimeRef.current = null;
  }, []);

  const handleManualLogged = useCallback(
    ({ blockIndex, markCompleted }: { blockIndex: number; markCompleted: boolean }) => {
      if (!markCompleted || blockIndex < 0) return;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      startTimeRef.current = null;
      setIsRunning(false);
      setIsPaused(false);
      setCompletedBlocks((prev) => new Set(prev).add(blockIndex));
      if (blockIndex === currentIndex) {
        const nextIdx = currentIndex + 1 < blocks.length ? currentIndex + 1 : 0;
        setCurrentIndex(nextIdx);
        setElapsedSeconds(0);
        setTargetReached(false);
        setMode("study");
        saveCycleProgress(cycle.id, nextIdx, null).catch(() => {});
      }
    },
    [currentIndex, blocks.length, cycle.id]
  );

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

  // ── Complete block (manual) ──────────────────────────────────────
  const handleCompleteBlock = useCallback(async () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    clearCurrentStudyInfo();
    setCompletedBlocks((prev) => new Set(prev).add(currentIndex));

    const realElapsed = elapsedSeconds;
    const realMinutes = Math.max(1, Math.round(realElapsed / 60));

    if (user) {
      await registerActivity(user.id);
      logXP(user.id, "study_block_completed", XP.STUDY_BLOCK_COMPLETED);
      const block = blocks[currentIndex];
      if (block) {
        const startedAt = new Date(Date.now() - realElapsed * 1000);
        await createFocusSession(user.id, startedAt, realMinutes, block.subject_id, cycle.id);
      }
    }

    toast.success(`✅ ${currentBlock?.subject?.name || "Bloco"} concluído! (${realMinutes}min)`);

    // Go to break
    setMode("break");
    setBreakRemaining(BREAK_SECONDS);
    setElapsedSeconds(0);
    setTargetReached(false);
  }, [currentIndex, currentBlock, blocks, user, clearTimer, cycle.id, elapsedSeconds]);

  const advanceToNextBlock = useCallback(() => {
    const nextIdx = currentIndex + 1 < blocks.length ? currentIndex + 1 : 0;
    setCurrentIndex(nextIdx);
    setElapsedSeconds(0);
    setTargetReached(false);
    setMode("study");
    setIsRunning(false);
    setIsPaused(false);
    persistProgress(nextIdx, null);
  }, [currentIndex, blocks, persistProgress]);

  const handleBreakComplete = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    playAlarm();
    const allDone = completedBlocks.size >= blocks.length;
    if (allDone) {
      toast.success("🎉 Ciclo completo! Parabéns!");
      setMode("study");
      persistProgress(0, null);
      return;
    }
    advanceToNextBlock();
  }, [clearTimer, completedBlocks, blocks.length, advanceToNextBlock, persistProgress, playAlarm]);

  // Timer tick - study mode (count up)
  useEffect(() => {
    if (isRunning && !isBreak && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = elapsedAtStartRef.current + Math.floor((now - startTimeRef.current!) / 1000);
        setElapsedSeconds(elapsed);
      }, 250);
    }
    return () => {
      if (intervalRef.current && !isBreak) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isBreak]);

  // Timer tick - break mode (countdown)
  useEffect(() => {
    if (isRunning && isBreak && breakEndTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((breakEndTimeRef.current! - now) / 1000));
        setBreakRemaining(remaining);
      }, 250);
    }
    return () => {
      if (intervalRef.current && isBreak) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isBreak]);

  // Target reached alarm (study mode) - fires once
  useEffect(() => {
    if (!isBreak && elapsedSeconds >= targetSeconds && targetSeconds > 0 && !targetReached && isRunning) {
      setTargetReached(true);
      playAlarm();
      toast.success("⏰ Tempo planejado concluído! Você está no tempo extra.");
    }
  }, [elapsedSeconds, targetSeconds, targetReached, isBreak, isRunning, playAlarm]);

  // Break completion
  useEffect(() => {
    if (isRunning && isBreak && breakRemaining <= 0 && breakEndTimeRef.current) {
      handleBreakComplete();
    }
  }, [isRunning, isBreak, breakRemaining, handleBreakComplete]);

  const startTimer = () => {
    if (isBreak) {
      breakEndTimeRef.current = Date.now() + breakRemaining * 1000;
      clearCurrentStudyInfo();
    } else {
      startTimeRef.current = Date.now();
      elapsedAtStartRef.current = elapsedSeconds;
      const subjName = currentBlock?.subject?.name?.trim();
      if (subjName) {
        setCurrentStudyInfo({
          source: "cycle",
          subject: subjName,
          startedAt: Date.now() - elapsedSeconds * 1000,
        });
      }
    }
    setIsRunning(true);
    setIsPaused(false);
  };

  const pauseTimer = () => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(true);
    clearCurrentStudyInfo();
    if (mode === "study") {
      persistProgress(currentIndex, null);
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
    // Skip study block without saving
    setCompletedBlocks((prev) => new Set(prev).add(currentIndex));
    if (currentIndex < blocks.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setElapsedSeconds(0);
      setTargetReached(false);
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
    setTargetReached(false);
    if (isBreak) {
      setBreakRemaining(BREAK_SECONDS);
    } else {
      setElapsedSeconds(0);
    }
  };

  const goToBlock = (index: number) => {
    if (isBreak) return;
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(index);
    setElapsedSeconds(0);
    setTargetReached(false);
    persistProgress(index, null);
  };

  const handleClose = () => {
    clearTimer();
    clearCurrentStudyInfo();
    if (mode === "study") {
      persistProgress(currentIndex, null);
    }
    onClose();
  };

  // ── Derived UI values ────────────────────────────────────────────
  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formattedTime = isBreak ? formatTime(breakRemaining) : formatTime(elapsedSeconds);
  const progress = isBreak
    ? ((BREAK_SECONDS - breakRemaining) / BREAK_SECONDS) * 100
    : targetSeconds > 0
    ? (elapsedSeconds / targetSeconds) * 100
    : 0;

  const overtimeSeconds = !isBreak && elapsedSeconds > targetSeconds ? elapsedSeconds - targetSeconds : 0;
  const overtimeText = overtimeSeconds > 0 ? formatTime(overtimeSeconds) : undefined;

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
    ? isOvertime ? "Tempo extra!" : "Estudando..."
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
        <div className="flex items-center gap-1">
          {pipSupported && !isBreak && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleTogglePiP}
              title={pipOpen ? "Janela flutuante ativa" : "Abrir janela flutuante"}
              disabled={pipOpen}
            >
              <PictureInPicture2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 max-w-lg mx-auto w-full">

        {/* Donut Timer */}
        <DonutTimer
          timeLeft={formattedTime}
          progress={progress}
          mode={isBreak ? "break" : "study"}
          label={isBreak ? "Intervalo" : (currentBlock?.subject?.name || "Disciplina")}
          subjectColor={subjectColor}
          isRunning={isRunning}
          isPaused={isPaused}
          isOvertime={isOvertime}
          overtimeText={overtimeText}
        />

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

          {!isBreak ? (
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full border-border/50",
                (isRunning || isPaused) && "border-primary/50 text-primary hover:bg-primary/10"
              )}
              onClick={handleCompleteBlock}
              disabled={allDone || (!isRunning && !isPaused && elapsedSeconds === 0)}
              title="Concluir bloco"
            >
              <CheckCircle2 className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-border/50"
              onClick={handleSkip}
              disabled={allDone}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Complete block hint */}
        {!isBreak && (isRunning || isPaused) && (
          <p className="text-xs text-muted-foreground text-center">
            Clique em <CheckCircle2 className="h-3.5 w-3.5 inline -mt-0.5" /> para concluir e salvar o tempo estudado
          </p>
        )}

        {/* Manual log */}
        {!isBreak && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setManualLogOpen(true)}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ClipboardEdit className="h-3.5 w-3.5" />
            Registrar estudo manualmente
          </Button>
        )}

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

      <ManualStudyLogDialog
        open={manualLogOpen}
        onOpenChange={setManualLogOpen}
        cycle={cycle}
        defaultBlockIndex={currentIndex}
        onLogged={handleManualLogged}
      />

      {pipContainer && createPortal(
        <div className="flex flex-col items-center justify-center gap-4 h-screen w-screen p-4 bg-background text-foreground">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground/70 truncate max-w-full text-center px-2">
            {currentBlock?.subject?.name || "Disciplina"}
          </div>
          <div
            className="text-5xl font-bold tabular-nums"
            style={{ color: isOvertime ? "hsl(var(--destructive))" : subjectColor }}
          >
            {formattedTime}
          </div>
          {isOvertime && overtimeText && (
            <div className="text-xs text-destructive">+{overtimeText}</div>
          )}
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            style={{ backgroundColor: subjectColor }}
            onClick={handlePlayPause}
            disabled={allDone && !isBreak}
          >
            {isRunning ? (
              <Pause className="h-6 w-6 text-white" />
            ) : (
              <Play className="h-6 w-6 text-white ml-0.5" />
            )}
          </Button>
          <div className="text-[10px] text-muted-foreground/60">
            {isBreak ? "Intervalo" : isRunning ? "Estudando" : isPaused ? "Pausado" : "Pronto"}
          </div>
        </div>,
        pipContainer
      )}
    </div>
  );
};

export default StudyCyclePlayer;
