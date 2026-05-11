import { useEffect, useState } from "react";
import { FocusTimer } from "@/components/FocusTimer";
import { useFocusTimer } from "@/contexts/FocusTimerContext";
import { Button } from "@/components/ui/button";
import { Flame, Target, Zap, Maximize2, Minimize2, Play, Pause, RotateCcw, Coffee, Timer } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const motivationalTips = [
  { icon: Flame, text: "Mantenha o foco por 25 minutos e descanse. Seu cérebro agradece!" },
  { icon: Target, text: "Defina uma meta clara antes de cada sessão de foco." },
  { icon: Zap, text: "Elimine distrações: silencie notificações e feche abas desnecessárias." },
];

const PomodoroPage = () => {
  const { timeRemaining, isRunning, isPaused, isBreak, totalTime, isCompleted, start, pause, resume, reset } = useFocusTimer();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const hasStarted = isRunning || isPaused || timeRemaining < totalTime;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const progress = ((totalTime - timeRemaining) / totalTime) * 100;

  // Auto-exit fullscreen if timer fully reset
  useEffect(() => {
    if (!hasStarted && isFullscreen) setIsFullscreen(false);
  }, [hasStarted, isFullscreen]);

  // ESC to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const handlePlayPause = () => {
    if (isRunning) pause();
    else if (isPaused) resume();
    else start();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-lg font-bold text-foreground">Modo Foco</h1>
      </header>
      <div className="flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <h1 className="text-3xl font-bold text-foreground mb-2">Modo Foco</h1>
        <p className="text-muted-foreground mb-10 text-center max-w-md">
          Use o timer Pomodoro para manter a concentração e aumentar sua produtividade.
        </p>

        <div className="mb-6 scale-150">
          <FocusTimer />
        </div>

        {hasStarted && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(true)}
            className="mb-10 gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            Tela cheia
          </Button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mt-4">
          {motivationalTips.map((tip, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center shadow-sm"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <tip.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full"
            aria-label="Sair da tela cheia"
          >
            <Minimize2 className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2 mb-8 text-muted-foreground">
            {isBreak ? <Coffee className="w-5 h-5" /> : <Timer className="w-5 h-5" />}
            <span className="text-sm uppercase tracking-widest">
              {isBreak ? "Pausa Curta" : "Modo Foco"}
            </span>
          </div>

          <div className="relative">
            <svg className="w-[min(80vw,80vh)] h-[min(80vw,80vh)] transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="46%"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="50%"
                cy="50%"
                r="46%"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset={100 - progress}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-1000",
                  isRunning && !isBreak && "text-primary",
                  isRunning && isBreak && "text-success",
                  isPaused && "text-warning",
                  isCompleted && "text-success",
                  !hasStarted && "text-muted-foreground"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={cn(
                  "font-mono font-bold tabular-nums text-[clamp(3rem,18vw,12rem)]",
                  isRunning && !isBreak && "text-primary",
                  isRunning && isBreak && "text-success",
                  isPaused && "text-warning",
                  isCompleted && "text-success"
                )}
              >
                {formattedTime}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-10">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePlayPause}
              className="h-14 w-14 rounded-full"
            >
              {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={reset}
              className="h-14 w-14 rounded-full"
              disabled={!hasStarted && timeRemaining === totalTime}
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            {isRunning && !isBreak && "Focando..."}
            {isRunning && isBreak && "Descansando..."}
            {isPaused && "Pausado"}
            {isCompleted && "🎉 Ciclo concluído!"}
          </p>
        </div>
      )}
    </div>
  );
};

export default PomodoroPage;
