import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

interface FocusTimerContextType {
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  totalTime: number;
}

const FocusTimerContext = createContext<FocusTimerContextType | undefined>(undefined);

const STORAGE_KEY = "focus_timer_state";
const DEFAULT_TIME = 25 * 60; // 25 minutes in seconds

interface StoredTimerState {
  endTime: number | null;
  pausedTimeRemaining: number | null;
  isRunning: boolean;
  isPaused: boolean;
}

export const FocusTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load state from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const state: StoredTimerState = JSON.parse(stored);
        if (state.isRunning && state.endTime) {
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((state.endTime - now) / 1000));
          if (remaining > 0) {
            setTimeRemaining(remaining);
            setEndTime(state.endTime);
            setIsRunning(true);
            setIsPaused(false);
          } else {
            // Timer expired while away
            setTimeRemaining(0);
            setIsRunning(false);
            setIsPaused(false);
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
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isRunning, isPaused, endTime, timeRemaining]);

  // Timer tick effect
  useEffect(() => {
    if (isRunning && endTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          setIsRunning(false);
          setIsPaused(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, endTime]);

  const start = useCallback(() => {
    const now = Date.now();
    const newEndTime = now + DEFAULT_TIME * 1000;
    setEndTime(newEndTime);
    setTimeRemaining(DEFAULT_TIME);
    setIsRunning(true);
    setIsPaused(false);
  }, []);

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
    setEndTime(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  return (
    <FocusTimerContext.Provider
      value={{
        timeRemaining,
        isRunning,
        isPaused,
        start,
        pause,
        resume,
        reset,
        totalTime: DEFAULT_TIME,
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
