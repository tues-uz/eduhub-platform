import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import {
  resolveEnrollmentSessionTimingStatus,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { getScheduleAttendanceState } from "@/features/teacher/attendance/heldScheduleMeetingsStorage";
import {
  resolveJoinFromMeeting,
  tuitionForJoinFromMeeting,
  type SessionTuitionQuote,
} from "@/features/enrollment/enrollmentSessionTuition";
import {
  formatReceiptAmount,
  tuitionLineDescription,
} from "@/features/enrollment/eduHubReceiptPdfLayout";
import {
  formatPaymentMethodLabelLocalized,
  getReceiptPdfCopy,
  type ReceiptPdfLocale,
} from "@/features/enrollment/enrollmentReceiptPdfI18n";

/** Resolve session count + join point for invoice/receipt (stored enrollment fields win). */
export function resolveEnrollmentSessionBounds(
  app: EnrollmentApplicationResponse,
  slots?: SessionSlotLike[],
): { scheduleSessionCount: number; joinFromSessionNumber: number } | null {
  const total = app.scheduleSessionCount ?? slots?.length ?? 0;
  if (total < 1) return null;

  if (app.joinFromSessionNumber != null && app.joinFromSessionNumber >= 1) {
    return {
      scheduleSessionCount: total,
      joinFromSessionNumber: Math.min(app.joinFromSessionNumber, total),
    };
  }

  if (slots && slots.length > 0) {
    const { heldSlotKeys, activeSlotKeys } = getScheduleAttendanceState(app.courseId);
    const timings = slots.map((slot) =>
      resolveEnrollmentSessionTimingStatus(slot, heldSlotKeys, activeSlotKeys),
    );
    const { joinFromMeeting } = resolveJoinFromMeeting(slots.length, timings);
    return {
      scheduleSessionCount: total,
      joinFromSessionNumber: Math.min(joinFromMeeting, total),
    };
  }

  return { scheduleSessionCount: total, joinFromSessionNumber: 1 };
}

export function resolveEnrollmentTuitionQuote(
  app: EnrollmentApplicationResponse,
  listedTuition: number,
  slots?: SessionSlotLike[],
): SessionTuitionQuote | null {
  if (!Number.isFinite(listedTuition) || listedTuition <= 0) return null;
  const bounds = resolveEnrollmentSessionBounds(app, slots);
  if (!bounds) return null;
  return tuitionForJoinFromMeeting(
    listedTuition,
    bounds.scheduleSessionCount,
    bounds.joinFromSessionNumber,
  );
}

/** Amount on official receipt — prorated tuition, not full listed price when joining mid-schedule. */
export function computeReceiptAmountPaid(
  app: EnrollmentApplicationResponse,
  listedTuition?: number,
  slots?: SessionSlotLike[],
): number {
  const quote =
    listedTuition != null && listedTuition > 0
      ? resolveEnrollmentTuitionQuote(app, listedTuition, slots)
      : null;

  if (quote && quote.amountDue > 0) {
    if (app.paymentPlan === "DOWN_PAYMENT") {
      if (app.downPaymentAmount != null && app.downPaymentAmount > 0) {
        return app.downPaymentAmount;
      }
    }
    return quote.amountDue;
  }

  if (app.downPaymentAmount != null && app.downPaymentAmount > 0) {
    return app.downPaymentAmount;
  }

  if (app.amountPaid != null && app.amountPaid > 0) {
    return app.amountPaid;
  }

  return 0;
}

export function tuitionLineDescriptionForQuote(
  issuedAtIso: string,
  quote: SessionTuitionQuote | null,
  locale: ReceiptPdfLocale = "en",
): string {
  const copy = getReceiptPdfCopy(locale);
  const base = tuitionLineDescription(issuedAtIso, locale);
  if (!quote || quote.sessionsIncluded <= 0) return base;
  if (quote.joinFromMeeting > 1 && quote.sessionsIncluded < quote.totalSessions) {
    return `${base} · ${copy.meetingsOf} ${quote.joinFromMeeting}–${quote.totalSessions} ${copy.of} ${quote.totalSessions}`;
  }
  return base;
}

/** Multi-line DESCRIPTION column for official receipt PDFs. */
export function buildReceiptDescriptionLines(params: {
  issuedAtIso: string;
  courseTitle: string;
  quote: SessionTuitionQuote | null;
  paymentPlan?: "FULL" | "DOWN_PAYMENT";
  paymentMethod?: string;
  amountPaid: number;
  currency: string;
  locale?: ReceiptPdfLocale;
}): string[] {
  const locale = params.locale ?? "en";
  const copy = getReceiptPdfCopy(locale);
  const lines: string[] = [];
  lines.push(tuitionLineDescription(params.issuedAtIso, locale));

  const course = params.courseTitle.trim();
  if (course) {
    lines.push(`${copy.classPrefix}: ${course.toUpperCase()}`);
  }

  const quote = params.quote;
  if (quote && quote.totalSessions > 0) {
    const listedStr = formatReceiptAmount(quote.listedTotal, params.currency);
    lines.push(
      `${copy.listedTuition}: ${listedStr} · ${quote.totalSessions} ${copy.classSessions}`,
    );
    if (quote.joinFromMeeting > 1 || quote.sessionsIncluded < quote.totalSessions) {
      lines.push(
        `${copy.proratedBilling}: ${copy.meetingsOf} ${quote.joinFromMeeting}–${quote.totalSessions} ${copy.of} ${quote.totalSessions} (${quote.sessionsIncluded} ${copy.included})`,
      );
    } else {
      lines.push(`${copy.fullSchedule}: ${copy.allSessions} ${quote.totalSessions} ${copy.classSessions}`);
    }
  }

  const plan = params.paymentPlan ?? "FULL";
  if (plan === "DOWN_PAYMENT") {
    lines.push(copy.paymentPlanDown);
    lines.push(copy.paymentPlanRemaining);
  } else {
    lines.push(copy.paymentPlanFull);
  }

  if (params.paymentMethod) {
    lines.push(
      `${copy.methodPrefix}: ${formatPaymentMethodLabelLocalized(params.paymentMethod, locale).toUpperCase()}`,
    );
  }

  lines.push(
    `${copy.amountOnReceipt}: ${formatReceiptAmount(params.amountPaid, params.currency)}`,
  );
  return lines;
}
