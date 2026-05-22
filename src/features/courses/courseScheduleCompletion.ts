import {
  resolveEnrollmentSessionTimingStatus,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { resolveJoinFromMeeting } from "@/features/enrollment/enrollmentSessionTuition";

/** True when `classEndDate` (date-only or ISO) is before end of that calendar day. */
export function isClassEndDatePassed(classEndDate: string | undefined, nowMs = Date.now()): boolean {
  const raw = classEndDate?.trim();
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  const endOfDay = new Date(d);
  endOfDay.setHours(23, 59, 59, 999);
  return nowMs > endOfDay.getTime();
}

export type CourseScheduleFinishedInput = {
  slots: ReadonlyArray<SessionSlotLike>;
  heldSlotKeys?: ReadonlySet<string>;
  activeSlotKeys?: ReadonlySet<string>;
  classEndDate?: string;
  nowMs?: number;
};

/**
 * Schedule-based class completion (option A): all sessions finished (calendar + attendance)
 * or cohort `classEndDate` has passed. Returns false when there are no slots and no end date.
 */
export function isCourseScheduleFinished({
  slots,
  heldSlotKeys,
  activeSlotKeys,
  classEndDate,
  nowMs = Date.now(),
}: CourseScheduleFinishedInput): boolean {
  const held = heldSlotKeys ?? new Set<string>();
  const active = activeSlotKeys ?? new Set<string>();

  if (slots.length > 0) {
    const timings = slots.map((slot) =>
      resolveEnrollmentSessionTimingStatus(slot, held, active, nowMs),
    );
    const { allSessionsFinished } = resolveJoinFromMeeting(slots.length, timings);
    if (allSessionsFinished) return true;
  }

  if (isClassEndDatePassed(classEndDate, nowMs)) {
    return true;
  }

  return false;
}
