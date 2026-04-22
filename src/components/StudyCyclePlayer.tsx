import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipForward, RotateCcw, X, Coffee, CheckCircle2, ClipboardEdit, PictureInPicture2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { DonutTimer } from "@/components/DonutTimer";
import { toast } from "sonner";
import ManualStudyLogDialog from "@/components/ManualStudyLogDialog";
import { useStudyCyclePlayer } from "@/contexts/StudyCyclePlayerContext";

const BREAK_SECONDS = 300;

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

const StudyCyclePlayer = () => {
  const {
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
    collapse,
    closePlayer,
    togglePlayPause,
    completeBlock,
    skip,
    restart,
    goToBlock,
    setManualLogged,
    openPiP,
  } = useStudyCyclePlayer();

  const [manualLogOpen, setManualLogOpen] = useState(false);

  if (!cycle) return null;

  const blocks = cycle.blocks || [];
  if (blocks.length === 0) return null;

  const currentBlock = blocks[currentIndex];
  const isBreak = mode === "break";
  const targetSeconds = currentBlock ? currentBlock.allocated_minutes * 60 : 0;
  const isOvertime = !isBreak && elapsedSeconds > targetSeconds && targetSeconds > 0;

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

  const upcomingBlocks: Array<typeof blocks[number] & { _idx: number }> = [];
  for (let i = 1; i <= 3; i++) {
    const idx = (currentIndex + i) % blocks.length;
    if (idx !== currentIndex) upcomingBlocks.push({ ...blocks[idx], _idx: idx });
  }

  const handleBack = async () => {
    // Try to open PiP automatically so user keeps seeing the timer
    if (pipSupported && !pipOpen && !isBreak) {
      try {
        await openPiP();
      } catch {
        // ignore
      }
    } else if (!pipSupported) {
      toast.info("Estudo continua em segundo plano.");
    }
    collapse();
  };

  return (
    <>
      {/* PiP portal — always available when pipContainer exists */}
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
            onClick={togglePlayPause}
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

      {/* Fullscreen overlay — only when expanded */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background transition-colors duration-500">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 backdrop-blur-sm bg-background/80">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleBack}
                title="Voltar (continua estudando)"
                aria-label="Voltar e continuar estudando em segundo plano"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
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
                  onClick={openPiP}
                  title={pipOpen ? "Janela flutuante ativa" : "Abrir janela flutuante"}
                  disabled={pipOpen}
                >
                  <PictureInPicture2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={closePlayer} title="Encerrar ciclo">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 max-w-lg mx-auto w-full">
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

            <div className="flex items-center gap-5">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full border-border/50"
                onClick={restart}
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
                onClick={togglePlayPause}
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
                  onClick={completeBlock}
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
                  onClick={skip}
                  disabled={allDone}
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              )}
            </div>

            {!isBreak && (isRunning || isPaused) && (
              <p className="text-xs text-muted-foreground text-center">
                Clique em <CheckCircle2 className="h-3.5 w-3.5 inline -mt-0.5" /> para concluir e salvar o tempo estudado
              </p>
            )}

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

            {isBreak && (
              <Button variant="ghost" size="sm" onClick={skip} className="text-xs text-muted-foreground hover:text-foreground">
                Pular intervalo e ir para a próxima matéria →
              </Button>
            )}
          </div>

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
            onLogged={setManualLogged}
          />
        </div>
      )}
    </>
  );
};

export default StudyCyclePlayer;
