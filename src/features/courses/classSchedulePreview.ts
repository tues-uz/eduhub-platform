import type { CourseResponse, ScheduleProposalResponse } from "@/api/eduhubTypes";
import { scheduleSlotKeyFromParts } from "@/features/teacher/attendance/heldScheduleMeetingsStorage";
import type { TeacherCourse } from "@/features/teacher/types";
import { courseScheduleProposalStore } from "@/features/courses/courseScheduleProposalStore";
import { courseScheduleWorkflowStore } from "@/features/courses/courseScheduleWorkflowStore";
import {
  distributeSessionsIntoMonths,
  distributeSessionsIntoThreeMonths,
  type ScheduleSlotRow,
} from "@/features/courses/scheduleThreeMonthBuckets";
import { isUuid } from "@/api/utils";

export type SessionSlotLike = {
  title?: string;
  sessionDate?: string;
  sessionTime?: string;
  durationMinutes?: number;
};

export type SessionTimingStatus = "upcoming" | "ongoing" | "finished" | "unknown";

const DEFAULT_SESSION_DURATION_MS = 90 * 60 * 1000;

function parseSessionStartMs(sessionDate: string, sessionTime?: string): number | null {
  const dateStr = sessionDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(sessionDate.trim());
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const timeStr = sessionTime?.trim();
  if (timeStr) {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const h = match[1]!.padStart(2, "0");
      const d = new Date(`${dateStr}T${h}:${match[2]}:00`);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    }
  }
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export function sessionStartMs(sessionDate: string, sessionTime?: string): number | null {
  return parseSessionStartMs(sessionDate, sessionTime);
}

/** Whether a session is upcoming, in progress, or finished (by date/time vs now). */
export function resolveSessionTimingStatus(
  slot: Pick<SessionSlotLike, "sessionDate" | "sessionTime" | "durationMinutes">,
  nowMs: number = Date.now(),
): SessionTimingStatus {
  if (!slot.sessionDate?.trim()) return "unknown";
  const start = parseSessionStartMs(slot.sessionDate, slot.sessionTime);
  if (start == null) return "unknown";
  const durationMs =
    typeof slot.durationMinutes === "number" && slot.durationMinutes > 0
      ? slot.durationMinutes * 60 * 1000
      : DEFAULT_SESSION_DURATION_MS;
  const end = start + durationMs;
  if (nowMs < start) return "upcoming";
  if (nowMs <= end) return "ongoing";
  return "finished";
}

/** Enrollment / tuition: attendance QR marks rows held (finished) or active (in progress). */
export function resolveEnrollmentSessionTimingStatus(
  slot: Pick<SessionSlotLike, "sessionDate" | "sessionTime" | "durationMinutes" | "title">,
  heldSlotKeys: ReadonlySet<string>,
  activeSlotKeys: ReadonlySet<string>,
  nowMs: number = Date.now(),
): SessionTimingStatus {
  const slotKey = scheduleSlotKeyFromParts(slot);
  if (heldSlotKeys.has(slotKey)) return "finished";
  if (activeSlotKeys.has(slotKey)) return "ongoing";
  return resolveSessionTimingStatus(slot, nowMs);
}

export const SESSION_TIMING_CHIP: Record<
  Exclude<SessionTimingStatus, "unknown">,
  { label: string; className: string }
> = {
  upcoming: {
    label: "Upcoming",
    className: "bg-sky-50 text-sky-800 ring-sky-200/80",
  },
  ongoing: {
    label: "In progress",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  },
  finished: {
    label: "Finished",
    className: "bg-zinc-100 text-zinc-600 ring-zinc-200/90",
  },
};

export type ScheduleMonthTab = {
  value: string;
  tabLabel: string;
  monthLine: string;
  slots: SessionSlotLike[];
};

export const SCHEDULE_MONTH_TAB_DEFS: readonly { value: string; tabLabel: string }[] = [
  { value: "m1", tabLabel: "1 month" },
  { value: "m2", tabLabel: "2nd month" },
  { value: "m3", tabLabel: "3rd month" },
];

export function paymentMonthsToScheduleTab(months: 1 | 2 | 3): "m1" | "m2" | "m3" {
  if (months === 1) return "m1";
  if (months === 2) return "m2";
  return "m3";
}

export function scheduleTabToPaymentMonths(tab: string): 1 | 2 | 3 {
  const match = tab.match(/^m(\d+)$/);
  const n = match ? Number(match[1]) : 1;
  if (!Number.isFinite(n) || n <= 1) return 1;
  if (n === 2) return 2;
  return 3;
}

export function sessionDateMs(iso: string | undefined): number {
  if (!iso?.trim()) return NaN;
  const t = new Date(iso.trim()).getTime();
  return Number.isNaN(t) ? NaN : t;
}

export function yearMonthKey(sessionDate: string | undefined): string | null {
  if (!sessionDate?.trim()) return null;
  const d = new Date(sessionDate.trim());
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatClassDateLabel(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** `HH:mm` or `HH:mm:ss` from API → compact 12h label (e.g. 10:00 AM). */
export function formatSessionTimeLabel(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  const match = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return t;
  const h = parseInt(match[1], 10);
  if (!Number.isFinite(h) || h < 0 || h > 23) return t;
  const m = match[2];
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

function formatMonthHeading(ymKey: string): string {
  const [y, m] = ymKey.split("-").map(Number);
  if (!y || !m) return ymKey;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

function scheduleMonthTabLabel(index: number): string {
  if (index === 0) return "1 month";
  if (index === 1) return "2nd month";
  if (index === 2) return "3rd month";
  return `${index + 1}th month`;
}

function slotHasContent(slot: SessionSlotLike): boolean {
  return Boolean(slot.title?.trim() || slot.sessionDate?.trim() || slot.sessionTime?.trim());
}

function toScheduleSlotRow(slot: SessionSlotLike): ScheduleSlotRow {
  return {
    title: slot.title,
    sessionDate: slot.sessionDate,
    sessionTime: slot.sessionTime,
    durationMinutes: slot.durationMinutes,
  };
}

function calendarMonthLineForBucket(bucket: SessionSlotLike[]): string {
  for (const slot of bucket) {
    const key = yearMonthKey(slot.sessionDate);
    if (key) return formatMonthHeading(key);
  }
  return "Dates to be confirmed";
}

/** One tab per schedule month — same calendar-month buckets as the admin schedule editor. */
export function buildScheduleMonthTabs(slots: SessionSlotLike[]): ScheduleMonthTab[] {
  if (!slots.length) return [];

  const rows = slots.map(toScheduleSlotRow);
  const { buckets } = distributeSessionsIntoMonths(rows);

  return buckets
    .map((bucket, index) => {
      const sessionSlots = bucket
        .map((row) => ({
          title: row.title ?? "",
          sessionDate: row.sessionDate ?? "",
          sessionTime: row.sessionTime ?? "",
          durationMinutes: row.durationMinutes,
        }))
        .filter(slotHasContent);
      return {
        value: `m${index + 1}`,
        tabLabel: scheduleMonthTabLabel(index),
        monthLine: calendarMonthLineForBucket(sessionSlots),
        slots: sessionSlots,
      };
    })
    .filter((tab) => tab.slots.length > 0);
}

/** Session counts in each of the three tuition buckets (legacy payment split). */
export function scheduleMonthSessionCounts(slots: SessionSlotLike[]): [number, number, number] {
  if (!slots.length) return [0, 0, 0];
  return distributeSessionsIntoThreeMonths(slots.map(toScheduleSlotRow)).counts;
}

/**
 * Session counts per 3-month bucket, counting only sessions that are NOT finished.
 * Tuition weights should use these so a month with already-held meetings is charged
 * for its remaining classes only (per-class proration), never the whole month.
 */
export function scheduleMonthRemainingSessionCounts(
  slots: SessionSlotLike[],
  heldSlotKeys: ReadonlySet<string>,
  activeSlotKeys: ReadonlySet<string>,
  nowMs: number = Date.now(),
): [number, number, number] {
  if (!slots.length) return [0, 0, 0];
  const { buckets } = distributeSessionsIntoThreeMonths(slots.map(toScheduleSlotRow));
  const counts = buckets.map((bucket) =>
    bucket.reduce((n, row) => {
      if (!slotHasContent(row)) return n;
      const timing = resolveEnrollmentSessionTimingStatus(row, heldSlotKeys, activeSlotKeys, nowMs);
      return timing === "finished" ? n : n + 1;
    }, 0),
  );
  return [counts[0] ?? 0, counts[1] ?? 0, counts[2] ?? 0];
}

/** Same date order as `ClassSchedulePreviewPanel` meeting numbers. */
export function orderSessionSlotsChronologically(slots: SessionSlotLike[]): SessionSlotLike[] {
  const decorated = slots.map((slot, i) => ({ slot, i, ms: sessionDateMs(slot.sessionDate) }));
  decorated.sort((a, b) => {
    const na = Number.isNaN(a.ms) ? Infinity : a.ms;
    const nb = Number.isNaN(b.ms) ? Infinity : b.ms;
    if (na !== nb) return na - nb;
    return a.i - b.i;
  });
  return decorated.map((x) => x.slot);
}

export function resolvePreviewSessionSlots(
  courseId: string,
  apiDetail: CourseResponse | null,
  scheduleProposal: ScheduleProposalResponse | null,
  isApiCourse: boolean,
  tc: TeacherCourse | null,
): SessionSlotLike[] {
  if (isApiCourse && apiDetail) {
    if (scheduleProposal?.sessions.length) {
      return scheduleProposal.sessions.map((s) => ({
        title: s.title,
        sessionDate: s.sessionDate ?? "",
        sessionTime: s.sessionTime ?? "",
        durationMinutes: s.durationMinutes,
      }));
    }
    const wf = courseScheduleWorkflowStore.get(courseId);
    const useProposal = wf?.status === "approved";
    if (useProposal) {
      const p = courseScheduleProposalStore.get(courseId);
      if (p?.classMeetingSlots?.length) {
        return p.classMeetingSlots.map((s) => ({
          title: s.title ?? "",
          sessionDate: s.sessionDate ?? "",
          sessionTime: s.sessionTime ?? "",
        }));
      }
    }
    if (apiDetail.classMeetingSlots?.length) {
      return apiDetail.classMeetingSlots.map((s) => ({
        title: s.title ?? "",
        sessionDate: s.sessionDate ?? "",
        sessionTime: s.sessionTime ?? "",
      }));
    }
    return [];
  }
  if (tc?.classMeetingSlots?.length) {
    return tc.classMeetingSlots.map((s) => ({
      title: s.title ?? "",
      sessionDate: s.sessionDate ?? "",
      sessionTime: s.sessionTime ?? "",
    }));
  }
  return [];
}

export function classScheduleStatusHint(
  courseId: string | undefined,
  isApiCourse: boolean,
  scheduleProposal: ScheduleProposalResponse | null,
  hasSlots: boolean,
): string | null {
  if (!courseId || !isApiCourse || !isUuid(courseId)) {
    return hasSlots ? "Planned class sessions for this course." : null;
  }
  if (scheduleProposal?.sessions.length) {
    return "Schedule proposed by the school and shared for enrollment.";
  }
  const wf = courseScheduleWorkflowStore.get(courseId);
  if (wf?.status === "pending_instructor") {
    return "A schedule is being reviewed by the instructor—session dates may change.";
  }
  if (wf?.status === "instructor_rejected") {
    return "The school is revising the schedule; dates shown may be updated.";
  }
  if (wf?.status === "approved" && hasSlots) {
    return "Instructor-approved class schedule.";
  }
  return hasSlots ? "Planned class sessions." : null;
}
