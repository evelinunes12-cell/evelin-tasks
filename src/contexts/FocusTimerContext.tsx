import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { registerActivity, incrementPomodoroCount } from "@/services/activity";
import { toast } from "sonner";

interface FocusTimerContextType {
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  isBreak: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  totalTime: number;
  isCompleted: boolean;
}

const FocusTimerContext = createContext<FocusTimerContextType | undefined>(undefined);

const STORAGE_KEY = "focus_timer_state";
const DEFAULT_TIME = 25 * 60; // 25 minutes in seconds
const BREAK_TIME = 5 * 60; // 5 minutes break

interface StoredTimerState {
  endTime: number | null;
  pausedTimeRemaining: number | null;
  isRunning: boolean;
  isPaused: boolean;
  isBreak: boolean;
}

export const FocusTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);

  // Load state from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const state: StoredTimerState = JSON.parse(stored);
        setIsBreak(state.isBreak || false);
        
        if (state.isRunning && state.endTime) {
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((state.endTime - now) / 1000));
          if (remaining > 0) {
            setTimeRemaining(remaining);
            setEndTime(state.endTime);
            setIsRunning(true);
            setIsPaused(false);
          } else {
            // Timer expired while away - handle completion
            handleTimerComplete(state.isBreak || false);
          }
        } else if (state.isPaused && state.pausedTimeRemaining !== null) {
          setTimeRemaining(state.pausedTimeRemaining);
          setIsRunning(false);
          setIsPaused(true);
        }
      } catch {
        // Invalid stored state, use defaults
      }
    }
  }, []);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    const state: StoredTimerState = {
      endTime: isRunning ? endTime : null,
      pausedTimeRemaining: isPaused ? timeRemaining : null,
      isRunning,
      isPaused,
      isBreak,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isRunning, isPaused, endTime, timeRemaining, isBreak]);

  const handleTimerComplete = useCallback(async (wasBreak: boolean) => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    setIsRunning(false);
    setIsPaused(false);
    setIsCompleted(true);

    if (!wasBreak && user) {
      // Registra atividade para a ofensiva
      await registerActivity(user.id);
      // Incrementa contador de Pomodoros para onboarding
      await incrementPomodoroCount(user.id);
      // Invalida os caches para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['user-streak', user.id] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', user.id] });
      toast.success("🍅 Ciclo Pomodoro concluído! +1 para sua ofensiva.");
    }

    // Alterna para pausa ou foco
    if (!wasBreak) {
      toast("☕ Hora do descanso! (5 min)");
      setTimeRemaining(BREAK_TIME);
      setIsBreak(true);
    } else {
      toast("🍅 Voltar ao trabalho! (25 min)");
      setTimeRemaining(DEFAULT_TIME);
      setIsBreak(false);
    }

    hasCompletedRef.current = false;
  }, [user, queryClient]);

  // Timer tick effect
  useEffect(() => {
    if (isRunning && endTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          handleTimerComplete(isBreak);
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, endTime, isBreak, handleTimerComplete]);

  const start = useCallback(() => {
    const now = Date.now();
    const duration = isBreak ? BREAK_TIME : DEFAULT_TIME;
    const newEndTime = now + duration * 1000;
    setEndTime(newEndTime);
    setTimeRemaining(duration);
    setIsRunning(true);
    setIsPaused(false);
    setIsCompleted(false);
  }, [isBreak]);

  const pause = useCallback(() => {
    setIsRunning(false);
    setIsPaused(true);
    setEndTime(null);
  }, []);

  const resume = useCallback(() => {
    const now = Date.now();
    const newEndTime = now + timeRemaining * 1000;
    setEndTime(newEndTime);
    setIsRunning(true);
    setIsPaused(false);
  }, [timeRemaining]);

  const reset = useCallback(() => {
    setTimeRemaining(DEFAULT_TIME);
    setIsRunning(false);
    setIsPaused(false);
    setIsBreak(false);
    setIsCompleted(false);
    setEndTime(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const totalTime = isBreak ? BREAK_TIME : DEFAULT_TIME;

  return (
    <FocusTimerContext.Provider
      value={{
        timeRemaining,
        isRunning,
        isPaused,
        isBreak,
        start,
        pause,
        resume,
        reset,
        totalTime,
        isCompleted,
      }}
    >
      {children}
    </FocusTimerContext.Provider>
  );
};

export const useFocusTimer = () => {
  const context = useContext(FocusTimerContext);
  if (context === undefined) {
    throw new Error("useFocusTimer must be used within a FocusTimerProvider");
  }
  return context;
};
