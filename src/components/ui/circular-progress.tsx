import { cn } from "@/lib/utils";

export type CircularProgressProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
};

export function CircularProgress({
  value,
  size = 72,
  strokeWidth = 5,
  className,
  trackClassName,
  indicatorClassName,
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progress ${Math.round(clamped)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          className={cn("text-zinc-200/90", trackClassName)}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          r={r}
          cx={cx}
          cy={cy}
        />
        <circle
          className={cn("text-[#3954d0] transition-[stroke-dashoffset] duration-500 ease-out", indicatorClassName)}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          r={r}
          cx={cx}
          cy={cy}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className={cn(
          "pointer-events-none absolute font-bold tabular-nums text-zinc-900",
          size <= 52 ? "text-[11px] leading-none" : "text-sm",
        )}
      >
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
