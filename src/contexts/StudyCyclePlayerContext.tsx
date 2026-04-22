import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { StudyCycle, saveCycleProgress } from "@/services/studyCycles";
import { createFocusSession } from "@/services/focusSessions";
import { registerActivity } from "@/services/activity";
import { logXP, XP } from "@/services/scoring";
import { useAuth } from "@/hooks/useAuth";
import { setCurrentStudyInfo, clearCurrentStudyInfo } from "@/lib/studyPresence";
import { toast } from "sonner";
import { useDocumentPiP } from "@/hooks/useDocumentPiP";

const BREAK_SECONDS = 300;

export type CycleMode = "study" | "break";

interface StudyCyclePlayerContextValue {
  cycle: StudyCycle | null;
  isExpanded: boolean;
  currentIndex: number;
  elapsedSeconds: number;
  breakRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  mode: CycleMode;
  targetReached: boolean;
  completedBlocks: Set<number>;
  pipSupported: boolean;
  pipOpen: boolean;
  pipContainer: HTMLElement | null;

  playCycle: (cycle: StudyCycle) => void;
  collapse: () => void;
  expand: () => void;
  closePlayer: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  togglePlayPause: () => void;
  completeBlock: () => Promise<void>;
  skip: () => void;
  restart: () => void;
  goToBlock: (idx: number) => void;
  setManualLogged: (args: { blockIndex: number; markCompleted: boolean }) => void;
  openPiP: () => Promise<void>;
}

const Ctx = createContext<StudyCyclePlayerContextValue | undefined>(undefined);

export const StudyCyclePlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cycle, setCycle] = useState<StudyCycle | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState<CycleMode>("study");
  const [targetReached, setTargetReached] = useState(false);
  const [completedBlocks, setCompletedBlocks] = useState<Set<number>>(new Set());
  const [breakRemaining, setBreakRemaining] = useState(BREAK_SECONDS);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedAtStartRef = useRef(0);
  const breakEndTimeRef = useRef<number | null>(null);

  const { open: openPiPHook, isOpen: pipOpen, pipContainer, isSupported: pipSupported } = useDocumentPiP({ width: 280, height: 320 });

  const blocks = cycle?.blocks || [];
  const currentBlock = blocks[currentIndex];
  const isBreak = mode === "break";
  const targetSeconds = currentBlock ? currentBlock.allocated_minutes * 60 : 0;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
    breakEndTimeRef.current = null;
  }, []);

  const persistProgress = useCallback(async (cycleId: string, blockIdx: number) => {
    try {
      await saveCycleProgress(cycleId, blockIdx, null);
    } catch {
      // silent
    }
  }, []);

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
      // silent
    }
  }, []);

  const playCycle = useCallback((newCycle: StudyCycle) => {
    clearTimer();
    const savedIndex = Math.min(newCycle.current_block_index || 0, Math.max((newCycle.blocks?.length || 1) - 1, 0));
    const set = new Set<number>();
    for (let i = 0; i < savedIndex; i++) set.add(i);
    setCycle(newCycle);
    setCurrentIndex(savedIndex);
    setCompletedBlocks(set);
    setElapsedSeconds(0);
    setBreakRemaining(BREAK_SECONDS);
    setMode("study");
    setIsRunning(false);
    setIsPaused(false);
    setTargetReached(false);
    setIsExpanded(true);
  }, [clearTimer]);

  const collapse = useCallback(() => setIsExpanded(false), []);
  const expand = useCallback(() => setIsExpanded(true), []);

  const closePlayer = useCallback(() => {
    clearTimer();
    clearCurrentStudyInfo();
    if (cycle && mode === "study") {
      persistProgress(cycle.id, currentIndex);
    }
    setIsExpanded(false);
    setCycle(null);
    setIsRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setMode("study");
  }, [clearTimer, cycle, mode, currentIndex, persistProgress]);

  const startTimer = useCallback(() => {
    if (!cycle) return;
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
  }, [cycle, isBreak, breakRemaining, elapsedSeconds, currentBlock]);

  const pauseTimer = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(true);
    clearCurrentStudyInfo();
    if (cycle && mode === "study") {
      persistProgress(cycle.id, currentIndex);
    }
  }, [clearTimer, cycle, mode, currentIndex, persistProgress]);

  const togglePlayPause = useCallback(() => {
    if (isRunning) pauseTimer();
    else startTimer();
  }, [isRunning, pauseTimer, startTimer]);

  const advanceToNextBlock = useCallback(() => {
    if (!cycle) return;
    const nextIdx = currentIndex + 1 < blocks.length ? currentIndex + 1 : 0;
    setCurrentIndex(nextIdx);
    setElapsedSeconds(0);
    setTargetReached(false);
    setMode("study");
    setIsRunning(false);
    setIsPaused(false);
    persistProgress(cycle.id, nextIdx);
  }, [cycle, currentIndex, blocks.length, persistProgress]);

  const completeBlock = useCallback(async () => {
    if (!cycle) return;
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

    setMode("break");
    setBreakRemaining(BREAK_SECONDS);
    setElapsedSeconds(0);
    setTargetReached(false);
  }, [cycle, currentIndex, elapsedSeconds, user, blocks, currentBlock, clearTimer]);

  const handleBreakComplete = useCallback(() => {
    if (!cycle) return;
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    playAlarm();
    if (completedBlocks.size >= blocks.length) {
      toast.success("🎉 Ciclo completo! Parabéns!");
      setMode("study");
      persistProgress(cycle.id, 0);
      return;
    }
    advanceToNextBlock();
  }, [cycle, clearTimer, completedBlocks, blocks.length, advanceToNextBlock, persistProgress, playAlarm]);

  const skip = useCallback(() => {
    if (!cycle) return;
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
      setElapsedSeconds(0);
      setTargetReached(false);
      persistProgress(cycle.id, nextIdx);
    } else {
      toast.success("🎉 Ciclo completo!");
      persistProgress(cycle.id, 0);
    }
  }, [cycle, clearTimer, isBreak, advanceToNextBlock, currentIndex, blocks.length, persistProgress]);

  const restart = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setTargetReached(false);
    if (isBreak) setBreakRemaining(BREAK_SECONDS);
    else setElapsedSeconds(0);
  }, [clearTimer, isBreak]);

  const goToBlock = useCallback((index: number) => {
    if (!cycle || isBreak) return;
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(index);
    setElapsedSeconds(0);
    setTargetReached(false);
    persistProgress(cycle.id, index);
  }, [cycle, isBreak, clearTimer, persistProgress]);

  const setManualLogged = useCallback(({ blockIndex, markCompleted }: { blockIndex: number; markCompleted: boolean }) => {
    if (!cycle || !markCompleted || blockIndex < 0) return;
    clearTimer();
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
  }, [cycle, currentIndex, blocks.length, clearTimer]);

  // Study tick
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

  // Break tick
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

  // Target reached
  useEffect(() => {
    if (!isBreak && elapsedSeconds >= targetSeconds && targetSeconds > 0 && !targetReached && isRunning) {
      setTargetReached(true);
      playAlarm();
      toast.success("⏰ Tempo planejado concluído! Você está no tempo extra.");
    }
  }, [elapsedSeconds, targetSeconds, targetReached, isBreak, isRunning, playAlarm]);

  // Break complete
  useEffect(() => {
    if (isRunning && isBreak && breakRemaining <= 0 && breakEndTimeRef.current) {
      handleBreakComplete();
    }
  }, [isRunning, isBreak, breakRemaining, handleBreakComplete]);

  const openPiP = useCallback(async () => {
    try {
      await openPiPHook();
    } catch {
      toast.error("Seu navegador não suporta janela flutuante. Tente Chrome ou Edge.");
    }
  }, [openPiPHook]);

  const value: StudyCyclePlayerContextValue = {
    cycle,
    isExpanded,
    currentIndex,
    elapsedSeconds,
    breakRemaining,
    isRunning,
    isPaused,
    mode,
    targetReached,
    completedBlocks,
    pipSupported,
    pipOpen,
    pipContainer,
    playCycle,
    collapse,
    expand,
    closePlayer,
    startTimer,
    pauseTimer,
    togglePlayPause,
    completeBlock,
    skip,
    restart,
    goToBlock,
    setManualLogged,
    openPiP,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useStudyCyclePlayer = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStudyCyclePlayer must be used within StudyCyclePlayerProvider");
  return ctx;
};
