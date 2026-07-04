import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { enrollmentPaymentPlanLabelForRecord } from "@/features/enrollment/enrollmentPaymentDisplay";
import {
  buildScheduleMonthTabs,
  orderSessionSlotsChronologically,
  scheduleMonthSessionCounts,
  scheduleTabToPaymentMonths,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { enrollmentInstallmentPaymentStore } from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import { resolvePaidTuitionMonths } from "@/features/enrollment/enrollmentPaidMonths";
import {
  scheduleMonthOrdinalLabel,
  tuitionAmountForScheduleMonth,
} from "@/features/enrollment/enrollmentInstallmentPayments";
import {
  paidTuitionMonthsFromPaymentFields,
  type TuitionPlanMonths,
} from "@/features/enrollment/enrollmentTuitionThirds";

export type MonthPaymentStatus = "paid" | "pending_review" | "unpaid" | "rejected";

export type EnrollmentMonthPaymentRow = {
  month: TuitionPlanMonths;
  tabLabel: string;
  monthLine: string;
  amount: number | null;
  currency: string;
  status: MonthPaymentStatus;
  submittedAt?: string;
  paymentMethod?: string;
  proofUrl?: string;
  source: "enrollment" | "installment";
};

/** Compact ratio for tables, e.g. `2/2`. */
export function formatMonthsPaidRatio(
  paidMonths: ReadonlySet<TuitionPlanMonths>,
  scheduleMonthCount: number,
): string {
  if (scheduleMonthCount <= 0) return "—";
  let paid = 0;
  for (let m = 1; m <= scheduleMonthCount; m++) {
    if (paidMonths.has(m as TuitionPlanMonths)) paid++;
  }
  return `${paid}/${scheduleMonthCount}`;
}

export function resolvedMonthsPaidLabel(
  paidMonths: ReadonlySet<TuitionPlanMonths>,
  scheduleMonthCount: number,
): string {
  if (scheduleMonthCount <= 0) return "Monthly payment";
  if (paidMonths.size >= scheduleMonthCount || paidMonths.size >= 3) return "Full payment";
  if (paidMonths.size === 1) {
    const m = Math.max(...paidMonths);
    if (m === 1) return "First month";
    if (m === 2) return "Second month";
    if (m === 3) return "Third month";
  }
  return `${paidMonths.size} of ${scheduleMonthCount} months paid`;
}

export type EnrollmentTablePaymentSummary = {
  headline: string;
  sublines: string[];
  pendingInstallmentCount: number;
  hasOutstandingTuition: boolean;
  showCurrentProgress: boolean;
};

/** Estimate schedule month count from enrollment fields when course schedule is not loaded. */
export function estimateScheduleMonthCount(r: EnrollmentApplicationResponse): number {
  if (r.paymentPlan === "FULL") return 3;
  const initialPaid = paidTuitionMonthsFromPaymentFields(r);
  if (!initialPaid?.size) return 3;
  if (r.installmentCount == null) return initialPaid.size;
  return initialPaid.size + r.installmentCount;
}

/** Compact tuition summary for admin enrollment list rows. Pass `scheduleMonthCount` from the class schedule when available. */
export function buildEnrollmentTablePaymentSummary(
  r: EnrollmentApplicationResponse,
  scheduleMonthCount?: number,
): EnrollmentTablePaymentSummary {
  const installments = enrollmentInstallmentPaymentStore.listForApplication(r.id);
  const pending = installments.filter((p) => p.status === "PENDING");
  const pendingInstallmentCount = pending.length;
  const enrollmentPlanLabel = enrollmentPaymentPlanLabelForRecord(r);

  const totalMonths =
    scheduleMonthCount != null && scheduleMonthCount > 0
      ? scheduleMonthCount
      : estimateScheduleMonthCount(r);

  if (r.status !== "APPROVED") {
    const sublines: string[] = [];
    if (r.scheduleSessionCount != null && r.scheduleSessionCount > 0) {
      sublines.push(
        r.joinFromSessionNumber != null && r.joinFromSessionNumber > 1
          ? `From meeting ${r.joinFromSessionNumber} of ${r.scheduleSessionCount}`
          : `${r.scheduleSessionCount} meetings`,
      );
    }
    const initialPaid = paidTuitionMonthsFromPaymentFields(r, totalMonths) ?? new Set<TuitionPlanMonths>();
    const headline =
      totalMonths > 0 ? formatMonthsPaidRatio(initialPaid, totalMonths) : enrollmentPlanLabel;
    return {
      headline,
      sublines,
      pendingInstallmentCount: 0,
      hasOutstandingTuition: false,
      showCurrentProgress: false,
    };
  }

  const paidMonths = resolvePaidTuitionMonths(r, [], r.id) ?? new Set<TuitionPlanMonths>();
  let paidCount = 0;
  for (let m = 1; m <= totalMonths; m++) {
    if (paidMonths.has(m as TuitionPlanMonths)) paidCount++;
  }
  const headline = totalMonths > 0 ? formatMonthsPaidRatio(paidMonths, totalMonths) : enrollmentPlanLabel;
  const hasOutstandingTuition = paidCount < totalMonths;
  const sublines: string[] = [`Enrolled with ${enrollmentPlanLabel.toLowerCase()}`];

  if (pendingInstallmentCount > 0) {
    const label =
      pending.length === 1
        ? `${scheduleMonthOrdinalLabel(pending[0]!.scheduleMonth)} awaiting review`
        : `${pendingInstallmentCount} follow-up payments awaiting review`;
    sublines.push(label);
  } else if (hasOutstandingTuition) {
    const due = totalMonths - paidCount;
    sublines.push(`${due} schedule month${due === 1 ? "" : "s"} still due`);
  }

  return {
    headline,
    sublines,
    pendingInstallmentCount,
    hasOutstandingTuition,
    showCurrentProgress: r.paymentPlan !== "FULL",
  };
}

export function monthPaymentStatusLabel(status: MonthPaymentStatus): string {
  if (status === "paid") return "Paid";
  if (status === "pending_review") return "Awaiting review";
  if (status === "rejected") return "Rejected";
  return "Unpaid";
}

export function buildEnrollmentMonthPaymentHistory(opts: {
  enrollment: EnrollmentApplicationResponse;
  scheduleSlots: SessionSlotLike[];
  listedTuition?: number;
  currency?: string;
}): EnrollmentMonthPaymentRow[] {
  const { enrollment, scheduleSlots, listedTuition, currency = enrollment.priceCurrency ?? "USD" } = opts;
  const ordered = orderSessionSlotsChronologically(scheduleSlots);
  const tabs = buildScheduleMonthTabs(ordered);
  if (!tabs.length) return [];

  const counts = scheduleMonthSessionCounts(ordered);
  const paidMonths = resolvePaidTuitionMonths(enrollment, ordered, enrollment.id) ?? new Set<TuitionPlanMonths>();
  const installments = enrollmentInstallmentPaymentStore.listForApplication(enrollment.id);

  return tabs.map((tab) => {
    const month = scheduleTabToPaymentMonths(tab.value);
    const calculatedAmount =
      listedTuition && listedTuition > 0
        ? tuitionAmountForScheduleMonth(listedTuition, month, counts)
        : null;

    const installment = installments
      .filter((p) => p.scheduleMonth === month)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];

    const isPaid = paidMonths.has(month);

    let status: MonthPaymentStatus = "unpaid";
    if (isPaid) status = "paid";
    else if (installment?.status === "PENDING") status = "pending_review";
    else if (installment?.status === "REJECTED") status = "rejected";

    const source: EnrollmentMonthPaymentRow["source"] =
      installment || month > 1 ? "installment" : "enrollment";

    let amount = calculatedAmount;
    if (installment) amount = installment.amount;
    else if (source === "enrollment" && enrollment.downPaymentAmount != null && enrollment.downPaymentAmount > 0) {
      amount = enrollment.downPaymentAmount;
    }

    return {
      month,
      tabLabel: tab.tabLabel,
      monthLine: tab.monthLine,
      amount,
      currency: installment?.currency ?? currency,
      status,
      submittedAt:
        installment?.submittedAt ??
        (source === "enrollment" && isPaid ? enrollment.submittedAt : undefined),
      paymentMethod: installment?.paymentMethod ?? enrollment.paymentMethod,
      proofUrl: installment?.paymentProofUrl ?? enrollment.paymentProofUrl,
      source,
    };
  });
}
