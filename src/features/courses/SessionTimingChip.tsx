import { cn } from "@/lib/utils";
import { SESSION_TIMING_CHIP, type SessionTimingStatus } from "@/features/courses/classSchedulePreview";

export function SessionTimingChip({ status }: { status: SessionTimingStatus }) {
  if (status === "unknown") return null;
  const chip = SESSION_TIMING_CHIP[status];
  return (
    <span
      className={cn(
        "inline-flex h-4 shrink-0 items-center rounded-full px-1.5 align-middle text-[9px] font-semibold uppercase leading-none tracking-wide ring-1",
        chip.className,
      )}
    >
      {chip.label}
    </span>
  );
}
