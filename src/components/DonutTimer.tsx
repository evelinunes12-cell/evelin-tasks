import { cn } from "@/lib/utils";

interface DonutTimerProps {
  timeLeft: string;
  progress: number;
  mode: "study" | "break";
  label: string;
  subjectColor?: string;
  isRunning?: boolean;
  isPaused?: boolean;
  isOvertime?: boolean;
  overtimeText?: string;
}

const RADIUS = 120;
const STROKE = 14;
const SIZE = (RADIUS + STROKE) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const DonutTimer = ({
  timeLeft,
  progress,
  mode,
  label,
  subjectColor,
  isRunning = false,
  isPaused = false,
  isOvertime = false,
  overtimeText,
}: DonutTimerProps) => {
  const clampedProgress = Math.min(progress, 100);
  const strokeDashoffset = CIRCUMFERENCE - (clampedProgress / 100) * CIRCUMFERENCE;

  const progressColor = isOvertime
    ? "hsl(142, 71%, 45%)"
    : mode === "study"
    ? subjectColor || "hsl(var(--primary))"
    : "hsl(142, 71%, 45%)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="transform -rotate-90"
      >
        <defs>
          <filter id="donut-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor={progressColor} floodOpacity="0.45" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={STROKE}
          className="opacity-40"
        />

        {/* Progress */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={progressColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          filter={isRunning ? "url(#donut-glow)" : undefined}
          className="transition-all duration-1000 linear"
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className={cn(
            "text-5xl font-mono font-bold tracking-tighter tabular-nums transition-colors duration-300",
            isOvertime && "text-green-500",
            !isOvertime && isRunning && "text-foreground",
            !isOvertime && isPaused && "text-destructive",
            !isOvertime && !isRunning && !isPaused && "text-muted-foreground"
          )}
        >
          {timeLeft}
        </span>
        <span className="text-sm text-muted-foreground mt-1.5 font-medium truncate max-w-[160px]">
          {label}
        </span>
        {isOvertime && overtimeText && (
          <span className="text-xs text-green-500 font-semibold mt-1 tabular-nums">
            +{overtimeText} excedente
          </span>
        )}
      </div>
    </div>
  );
};
