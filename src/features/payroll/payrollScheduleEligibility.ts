import type { CourseResponse, CourseSummaryResponse, ScheduleProposalResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import {
  buildScheduleMonthTabs,
  orderSessionSlotsChronologically,
  resolveEnrollmentSessionTimingStatus,
  resolvePreviewSessionSlots,
  scheduleTabToPaymentMonths,
  yearMonthKey,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { courseScheduleProposalStore } from "@/features/courses/courseScheduleProposalStore";
import { getScheduleAttendanceState } from "@/features/teacher/attendance/heldScheduleMeetingsStorage";

const MONTH_ALIASES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function monthTokenToNumber(token: string): number | null {
  const key = token.trim().toLowerCase();
  if (!key) return null;
  if (MONTH_ALIASES[key] != null) return MONTH_ALIASES[key];
  const short = key.slice(0, 3);
  return MONTH_ALIASES[short] ?? null;
}

/** Parse instructor period label (e.g. "May" or "May 2026") to `YYYY-MM`. */
export function parsePayrollPeriodYearMonth(periodLabel: string, referenceIso: string): string | null {
  const label = periodLabel.trim();
  const ref = new Date(referenceIso);
  if (!label) {
    return Number.isNaN(ref.getTime()) ? null : yearMonthKey(referenceIso);
  }

  const isoMatch = label.match(/^(\d{4})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  const namedWithYear = label.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (namedWithYear) {
    const monthNum = monthTokenToNumber(namedWithYear[1]!);
    if (monthNum) return `${namedWithYear[2]}-${String(monthNum).padStart(2, "0")}`;
  }

  const monthOnly = label.match(/^([A-Za-z]+)$/);
  if (monthOnly && !Number.isNaN(ref.getTime())) {
    const monthNum = monthTokenToNumber(monthOnly[1]!);
    if (monthNum) return `${ref.getFullYear()}-${String(monthNum).padStart(2, "0")}`;
  }

  return null;
}

export function formatPayrollYearMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  const year = Number(y);
  const month = Number(m);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return yearMonth;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function normalizePayrollMatchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Score how well a catalog course matches payroll class section + course title. */
export function scorePayrollCourseMatch(
  course: Pick<CourseSummaryResponse, "title">,
  classSection: string,
  courseTitle: string,
): number {
  const ct = normalizePayrollMatchText(course.title);
  const sec = normalizePayrollMatchText(classSection);
  const tit = normalizePayrollMatchText(courseTitle);
  if (!ct || (!sec && !tit)) return 0;

  if (ct === tit || ct === sec) return 100;
  if (tit && (tit.includes(ct) || ct.includes(tit))) return 85;
  if (sec && (sec.includes(ct) || ct.includes(sec))) return 75;

  const sectionToken = sec.match(/\b([a-z]{2,3}-[a-z0-9]+)\b/i)?.[1]?.toLowerCase();
  if (sectionToken && ct.replace(/\s+/g, "").includes(sectionToken.replace(/-/g, ""))) return 60;
  if (sectionToken && ct.includes(sectionToken.split("-")[0] ?? "")) return 45;

  return 0;
}

export function pickBestPayrollCourseMatch(
  courses: CourseSummaryResponse[],
  classSection: string,
  courseTitle: string,
): CourseSummaryResponse | null {
  let best: CourseSummaryResponse | null = null;
  let bestScore = 0;
  for (const course of courses) {
    const score = scorePayrollCourseMatch(course, classSection, courseTitle);
    if (score > bestScore) {
      bestScore = score;
      best = course;
    }
  }
  return bestScore >= 45 ? best : null;
}

export function resolvePayrollScheduleSlots(
  courseId: string,
  apiCourse: CourseResponse | null,
  scheduleProposal: ScheduleProposalResponse | null,
): SessionSlotLike[] {
  const isApiCourse = isUuid(courseId);
  const raw = resolvePreviewSessionSlots(courseId, apiCourse, scheduleProposal, isApiCourse, null);
  const ordered = orderSessionSlotsChronologically(raw);
  if (ordered.length > 0) return ordered;

  if (isApiCourse && courseId) {
    const localProposal = courseScheduleProposalStore.get(courseId);
    if (localProposal?.classMeetingSlots?.length) {
      return orderSessionSlotsChronologically(
        localProposal.classMeetingSlots.map((s) => ({
          title: s.title ?? "",
          sessionDate: s.sessionDate ?? "",
          sessionTime: s.sessionTime ?? "",
        })),
      );
    }
  }

  return [];
}

export type PayrollMonthCompletion = {
  periodYearMonth: string | null;
  periodLabel: string | null;
  totalInPeriod: number;
  finishedInPeriod: number;
  eligible: boolean;
  viewingMonth: 1 | 2 | 3;
};

export type PayrollPeriodOption = {
  /** Primary `YYYY-MM` key for the schedule month (first dated session in the tab). */
  id: string;
  periodLabel: string;
  /** Matches class schedule tabs, e.g. "1 month", "2nd month". */
  scheduleTabLabel?: string;
  sessionCount: number;
  finishedCount: number;
  sessionsTaught: string;
  eligible: boolean;
};

export type TeacherPayrollFormFields = {
  schedulePeriodKey: string;
  periodLabel: string;
  sessionsTaught: string;
  requestedPayout: string;
  payoutDetails: string;
  instructorNotes: string;
};

/** Three schedule-month periods (same buckets as class schedule tabs) — for instructor payroll picker. */
export function buildPayrollPeriodOptions(slots: SessionSlotLike[], courseId: string): PayrollPeriodOption[] {
  if (!slots.length || !courseId) return [];

  const tabs = buildScheduleMonthTabs(slots);
  const { heldSlotKeys, activeSlotKeys } = getScheduleAttendanceState(courseId);

  return tabs
    .map((tab): PayrollPeriodOption | null => {
      if (tab.slots.length === 0) return null;

      let finishedCount = 0;
      for (const slot of tab.slots) {
        const status = resolveEnrollmentSessionTimingStatus(slot, heldSlotKeys, activeSlotKeys);
        if (status === "finished") finishedCount += 1;
      }

      const sessionCount = tab.slots.length;
      const periodYearMonth =
        tab.slots.map((slot) => yearMonthKey(slot.sessionDate)).find((ym): ym is string => Boolean(ym)) ?? tab.value;

      return {
        id: periodYearMonth,
        periodLabel: formatPayrollYearMonthLabel(periodYearMonth),
        scheduleTabLabel: tab.tabLabel,
        sessionCount,
        finishedCount,
        sessionsTaught: `${finishedCount}/${sessionCount}`,
        eligible: sessionCount > 0 && finishedCount === sessionCount,
      };
    })
    .filter((option): option is PayrollPeriodOption => option != null);
}

/** Payroll for a month is blocked until every scheduled meeting in that month is completed (attendance held). */
export function validatePayrollMonthEligibility(
  slots: SessionSlotLike[],
  courseId: string,
  schedulePeriodKey: string,
): { ok: true } | { ok: false; reason: string } {
  const option = buildPayrollPeriodOptions(slots, courseId).find((item) => item.id === schedulePeriodKey);
  if (!option) {
    return { ok: false, reason: "Choose a schedule month from the approved class schedule." };
  }
  if (option.eligible) return { ok: true };
  return {
    ok: false,
    reason: `Complete all ${option.sessionCount} scheduled meetings in ${option.periodLabel} before submitting payroll (${option.finishedCount}/${option.sessionCount} done).`,
  };
}

export function pickDefaultPayrollPeriodOption(options: PayrollPeriodOption[]): PayrollPeriodOption | null {
  if (!options.length) return null;
  return options.find((o) => o.eligible) ?? null;
}

export function formatPayrollSchedulePeriodLabel(
  option: Pick<PayrollPeriodOption, "periodLabel" | "scheduleTabLabel">,
): string {
  return option.scheduleTabLabel ? `${option.scheduleTabLabel} · ${option.periodLabel}` : option.periodLabel;
}

export function applyPayrollPeriodOption(
  option: PayrollPeriodOption,
): Pick<TeacherPayrollFormFields, "schedulePeriodKey" | "periodLabel" | "sessionsTaught"> {
  return {
    schedulePeriodKey: option.id,
    periodLabel: option.periodLabel,
    sessionsTaught: option.sessionsTaught,
  };
}

export function emptyTeacherPayrollForm(suggestedPayout = ""): TeacherPayrollFormFields {
  return {
    schedulePeriodKey: "",
    periodLabel: "",
    sessionsTaught: "",
    requestedPayout: suggestedPayout,
    payoutDetails: "",
    instructorNotes: "",
  };
}

export function evaluatePayrollMonthCompletion(
  slots: SessionSlotLike[],
  periodLabel: string,
  submittedAtIso: string,
  courseId: string,
): PayrollMonthCompletion {
  const periodYearMonth = parsePayrollPeriodYearMonth(periodLabel, submittedAtIso);
  if (!periodYearMonth || slots.length === 0) {
    return {
      periodYearMonth,
      periodLabel: periodYearMonth ? formatPayrollYearMonthLabel(periodYearMonth) : null,
      totalInPeriod: 0,
      finishedInPeriod: 0,
      eligible: false,
      viewingMonth: 1,
    };
  }

  const { heldSlotKeys, activeSlotKeys } = getScheduleAttendanceState(courseId);
  const inPeriod = slots.filter((slot) => yearMonthKey(slot.sessionDate) === periodYearMonth);
  let finishedInPeriod = 0;
  for (const slot of inPeriod) {
    const status = resolveEnrollmentSessionTimingStatus(slot, heldSlotKeys, activeSlotKeys);
    if (status === "finished") finishedInPeriod += 1;
  }

  const tabs = buildScheduleMonthTabs(slots);
  let viewingMonth: 1 | 2 | 3 = 1;
  for (const tab of tabs) {
    if (tab.slots.some((slot) => yearMonthKey(slot.sessionDate) === periodYearMonth)) {
      viewingMonth = scheduleTabToPaymentMonths(tab.value);
      break;
    }
  }

  return {
    periodYearMonth,
    periodLabel: formatPayrollYearMonthLabel(periodYearMonth),
    totalInPeriod: inPeriod.length,
    finishedInPeriod,
    eligible: inPeriod.length > 0 && finishedInPeriod === inPeriod.length,
    viewingMonth,
  };
}

export type PayrollResolvedCourse = {
  courseId: string;
  apiCourse: CourseResponse | null;
  scheduleProposal: ScheduleProposalResponse | null;
};

export function buildPayrollResolvedCourse(
  courseId: string,
  apiCourse: CourseResponse | null,
  scheduleProposal: ScheduleProposalResponse | null,
): PayrollResolvedCourse {
  return { courseId, apiCourse, scheduleProposal };
}
