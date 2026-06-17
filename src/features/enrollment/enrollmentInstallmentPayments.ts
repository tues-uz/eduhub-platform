import { adminEnrollmentPaidMonthsStore } from "@/features/admin/data/adminEnrollmentPaidMonthsStore";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import {
  buildScheduleMonthTabs,
  orderSessionSlotsChronologically,
  scheduleMonthSessionCounts,
  scheduleTabToPaymentMonths,
  type ScheduleMonthTab,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import {
  enrollmentInstallmentPaymentStore,
  type EnrollmentInstallmentPayment,
} from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import { resolvePaidTuitionMonths } from "@/features/enrollment/enrollmentPaidMonths";
import {
  tuitionPartsForSchedule,
  type TuitionPlanMonths,
} from "@/features/enrollment/enrollmentTuitionThirds";

export type PayableScheduleMonth = {
  month: TuitionPlanMonths;
  tabLabel: string;
  monthLine: string;
  sessionCount: number;
  amount: number;
  currency: string;
  state: "payable" | "pending_review" | "paid";
  pendingPayment?: EnrollmentInstallmentPayment;
};

export function tuitionAmountForScheduleMonth(
  listedTuition: number,
  month: TuitionPlanMonths,
  scheduleMonthCounts: [number, number, number],
): number | null {
  const split = tuitionPartsForSchedule(listedTuition, scheduleMonthCounts);
  if (!split) return null;
  return split.parts[month - 1] ?? null;
}

export function buildPayableScheduleMonths(opts: {
  enrollment: EnrollmentApplicationResponse;
  scheduleSlots: SessionSlotLike[];
  listedTuition: number | undefined;
  currency: string;
}): PayableScheduleMonth[] {
  const { enrollment, scheduleSlots, listedTuition, currency } = opts;
  const ordered = orderSessionSlotsChronologically(scheduleSlots);
  const tabs = buildScheduleMonthTabs(ordered);
  const counts = scheduleMonthSessionCounts(ordered);
  const paidMonths = resolvePaidTuitionMonths(enrollment, ordered, enrollment.id) ?? new Set<TuitionPlanMonths>();
  const installments = enrollmentInstallmentPaymentStore.listForApplication(enrollment.id);

  if (!listedTuition || listedTuition <= 0) return [];

  return tabs
    .map((tab) => {
      const month = scheduleTabToPaymentMonths(tab.value);
      const amount = tuitionAmountForScheduleMonth(listedTuition, month, counts);
      if (amount == null || amount <= 0) return null;

      const pending = installments.find((p) => p.scheduleMonth === month && p.status === "PENDING");
      const paid = paidMonths.has(month);

      let state: PayableScheduleMonth["state"] = "payable";
      if (paid) state = "paid";
      else if (pending) state = "pending_review";

      return {
        month,
        tabLabel: tab.tabLabel,
        monthLine: tab.monthLine,
        sessionCount: tab.slots.length,
        amount,
        currency,
        state,
        ...(pending ? { pendingPayment: pending } : {}),
      };
    })
    .filter((row): row is PayableScheduleMonth => row != null);
}

export function unpaidPayableMonths(months: PayableScheduleMonth[]): PayableScheduleMonth[] {
  return months.filter((m) => m.state === "payable" || m.state === "pending_review");
}

export function hasOutstandingTuition(months: PayableScheduleMonth[]): boolean {
  return months.some((m) => m.state !== "paid");
}

export function scheduleMonthProgressLabel(
  months: PayableScheduleMonth[],
  scheduleTabs: ScheduleMonthTab[],
): string {
  const paidCount = months.filter((m) => m.state === "paid").length;
  const total = scheduleTabs.length || months.length;
  if (total <= 0) return "Schedule months";
  if (paidCount >= total) return `All ${total} schedule month${total === 1 ? "" : "s"} paid`;
  return `${paidCount} of ${total} schedule months paid`;
}

export function approveInstallmentPayment(
  paymentId: string,
  reviewedByCode?: string,
): EnrollmentInstallmentPayment | null {
  const payment = enrollmentInstallmentPaymentStore.getSnapshot().find((p) => p.id === paymentId);
  if (!payment || payment.status !== "PENDING") return null;

  const updated = enrollmentInstallmentPaymentStore.update(paymentId, {
    status: "APPROVED",
    reviewedAt: new Date().toISOString(),
    reviewedByCode,
  });
  if (!updated) return null;

  const existing =
    adminEnrollmentPaidMonthsStore.get(payment.enrollmentApplicationId) ??
    new Set<TuitionPlanMonths>([1]);
  const next = new Set(existing);
  next.add(payment.scheduleMonth);
  adminEnrollmentPaidMonthsStore.set(payment.enrollmentApplicationId, next, {
    courseId: payment.courseId,
    studentEmailNorm: payment.studentEmailNorm,
  });

  return updated;
}

export function rejectInstallmentPayment(
  paymentId: string,
  adminNote?: string,
  reviewedByCode?: string,
): EnrollmentInstallmentPayment | null {
  return enrollmentInstallmentPaymentStore.update(paymentId, {
    status: "REJECTED",
    reviewedAt: new Date().toISOString(),
    adminNote: adminNote?.trim() || undefined,
    reviewedByCode,
  });
}

export function installmentPaymentPath(applicationId: string, month?: TuitionPlanMonths): string {
  const base = `/dashboard/payment/remaining/${encodeURIComponent(applicationId)}`;
  if (month == null) return base;
  return `${base}?month=${month}`;
}
