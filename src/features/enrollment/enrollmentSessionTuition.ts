import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import type { SessionTimingStatus } from "@/features/courses/classSchedulePreview";
import { splitTuitionEqualMonths } from "@/features/enrollment/enrollmentTuitionThirds";
import { expectedPayNowForRecord } from "@/features/enrollment/enrollmentTuitionThirds";

export type SessionTuitionQuote = {
  /** Listed class tuition before proration. */
  listedTotal: number;
  totalSessions: number;
  /** 1-based meeting number the student joins from (inclusive). */
  joinFromMeeting: number;
  sessionsIncluded: number;
  /** Whole amount due for included sessions (sums exactly to fair share of listed total). */
  amountDue: number;
  /** Average per included session (for display; may not × count exactly due to rounding). */
  perSessionDisplay: number;
};

/** Split `listedTotal` across `totalSessions` whole shares, then sum shares from `joinFromMeeting` onward. */
export function tuitionForJoinFromMeeting(
  listedTotal: number,
  totalSessions: number,
  joinFromMeeting: number,
): SessionTuitionQuote | null {
  if (!Number.isFinite(listedTotal) || listedTotal <= 0 || totalSessions < 1) return null;

  const joinRequested = Math.floor(joinFromMeeting);
  if (joinRequested > totalSessions) {
    return {
      listedTotal,
      totalSessions,
      joinFromMeeting: totalSessions + 1,
      sessionsIncluded: 0,
      amountDue: 0,
      perSessionDisplay: 0,
    };
  }

  const shares = splitTuitionEqualMonths(listedTotal, totalSessions);
  if (!shares || shares.length !== totalSessions) return null;

  const join = Math.max(1, Math.min(Math.floor(joinFromMeeting), totalSessions));
  const sessionsIncluded = totalSessions - join + 1;
  const amountDue = shares.slice(join - 1).reduce((sum, n) => sum + n, 0);
  const perSessionDisplay =
    sessionsIncluded > 0 ? Math.round(amountDue / sessionsIncluded) : 0;

  return {
    listedTotal,
    totalSessions,
    joinFromMeeting: join,
    sessionsIncluded,
    amountDue,
    perSessionDisplay,
  };
}

/** First upcoming/ongoing meeting (1-based). Held or calendar-finished meetings are skipped. */
export function resolveJoinFromMeeting(
  totalSessions: number,
  sessionTiming: ReadonlyArray<SessionTimingStatus>,
): { joinFromMeeting: number; allSessionsFinished: boolean } {
  if (totalSessions < 1) {
    return { joinFromMeeting: 1, allSessionsFinished: false };
  }
  if (sessionTiming.length === totalSessions) {
    const nextIdx = sessionTiming.findIndex((s) => s === "upcoming" || s === "ongoing");
    if (nextIdx >= 0) {
      return { joinFromMeeting: nextIdx + 1, allSessionsFinished: false };
    }
    if (sessionTiming.every((s) => s === "finished")) {
      return { joinFromMeeting: totalSessions + 1, allSessionsFinished: true };
    }
  }
  return { joinFromMeeting: 1, allSessionsFinished: false };
}

/** Prorated tuition due now for an application (session-based when counts are stored, else legacy month split). */
export function expectedPayNowForEnrollmentRecord(
  r: EnrollmentApplicationResponse,
  listedTuition: number | undefined,
): number | null {
  if (listedTuition == null || listedTuition <= 0) return null;
  const totalSessions = r.scheduleSessionCount;
  const join = r.joinFromSessionNumber ?? 1;
  if (totalSessions != null && totalSessions > 0) {
    const quote = tuitionForJoinFromMeeting(listedTuition, totalSessions, join);
    if (!quote) return null;
    if (r.paymentPlan === "FULL") return quote.amountDue;
    if (r.paymentPlan === "DOWN_PAYMENT") {
      if (r.downPaymentAmount != null && r.downPaymentAmount > 0) return r.downPaymentAmount;
      return null;
    }
  }
  return expectedPayNowForRecord(r, listedTuition);
}

export function payNowMatchesDeclaredForEnrollment(
  r: EnrollmentApplicationResponse,
  listedTuition: number | undefined,
): boolean | null {
  if (listedTuition == null || listedTuition <= 0) return null;
  const expected = expectedPayNowForEnrollmentRecord(r, listedTuition);
  if (expected == null) return null;
  if (r.paymentPlan === "FULL") {
    return r.downPaymentAmount == null || r.downPaymentAmount === expected;
  }
  const d = r.downPaymentAmount;
  if (d == null) return false;
  return d === expected;
}
