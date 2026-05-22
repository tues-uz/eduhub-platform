import { cn } from "@/lib/utils";
import { SESSION_TIMING_CHIP, type SessionTimingStatus } from "@/features/courses/classSchedulePreview";

export function SessionTimingChip({ status }: { status: SessionTimingStatus }) {
  if (status === "unknown") return null;
  const chip = SESSION_TIMING_CHIP[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
        chip.className,
      )}
    >
      {chip.label}
    </span>
  );
}
