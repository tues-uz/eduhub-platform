import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { formatPaymentMethodLabel } from "@/features/enrollment/enrollmentDocumentConfig";
import {
  expectedPayNowForEnrollmentRecord,
  payNowMatchesDeclaredForEnrollment,
  tuitionForJoinFromMeeting,
} from "@/features/enrollment/enrollmentSessionTuition";

export function formatEnrollmentMoney(amount: number | undefined, currency = "USD"): string {
  if (amount == null || amount <= 0) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function enrollmentPaymentPlanLabel(plan: EnrollmentApplicationResponse["paymentPlan"]): string {
  if (plan === "FULL") return "Full payment";
  if (plan === "DOWN_PAYMENT") return "Down payment";
  return plan;
}

export function enrollmentScheduleScopeLine(r: EnrollmentApplicationResponse): string | null {
  const total = r.scheduleSessionCount;
  if (total == null || total < 1) return null;
  const join = r.joinFromSessionNumber ?? 1;
  if (join > total) return "All meetings on schedule already finished";
  if (join > 1) {
    return `Joins from meeting ${join} of ${total} (${total - join + 1} meetings charged)`;
  }
  return `Full schedule · ${total} meetings`;
}

export function enrollmentProrationQuote(
  r: EnrollmentApplicationResponse,
  listedTuition: number | undefined,
) {
  const total = r.scheduleSessionCount;
  const join = r.joinFromSessionNumber ?? 1;
  if (listedTuition == null || listedTuition <= 0 || total == null || total < 1) return null;
  return tuitionForJoinFromMeeting(listedTuition, total, join);
}

export type EnrollmentPaymentDisplay = {
  methodLabel: string;
  planLabel: string;
  currency: string;
  declaredAmount: number | null;
  installmentCount: number | null;
  scheduleScope: string | null;
  listedTuition: number | null;
  proratedTuition: number | null;
  expectedTransfer: number | null;
  amountMatches: boolean | null;
};

export function buildEnrollmentPaymentDisplay(
  r: EnrollmentApplicationResponse,
  listedTuition?: number | null,
): EnrollmentPaymentDisplay {
  const currency = r.priceCurrency ?? "USD";
  const quote = enrollmentProrationQuote(r, listedTuition ?? undefined);
  const proratedTuition = quote?.amountDue ?? null;
  const expectedTransfer = expectedPayNowForEnrollmentRecord(r, listedTuition ?? undefined);
  return {
    methodLabel: formatPaymentMethodLabel(r.paymentMethod),
    planLabel: enrollmentPaymentPlanLabel(r.paymentPlan),
    currency,
    declaredAmount: r.downPaymentAmount ?? null,
    installmentCount: r.paymentPlan === "DOWN_PAYMENT" ? (r.installmentCount ?? null) : null,
    scheduleScope: enrollmentScheduleScopeLine(r),
    listedTuition: listedTuition != null && listedTuition > 0 ? listedTuition : null,
    proratedTuition,
    expectedTransfer,
    amountMatches: payNowMatchesDeclaredForEnrollment(r, listedTuition ?? undefined),
  };
}

/** One-line summary for tables (no listed tuition required). */
export function enrollmentPaymentListSummary(r: EnrollmentApplicationResponse): string {
  const cur = r.priceCurrency ?? "USD";
  const parts: string[] = [];
  if (r.paymentMethod) parts.push(formatPaymentMethodLabel(r.paymentMethod));
  parts.push(enrollmentPaymentPlanLabel(r.paymentPlan));
  if (r.downPaymentAmount != null && r.downPaymentAmount > 0) {
    parts.push(formatEnrollmentMoney(r.downPaymentAmount, cur));
  }
  if (r.paymentPlan === "DOWN_PAYMENT" && r.installmentCount != null) {
    parts.push(`${r.installmentCount} instalments`);
  }
  const scope = enrollmentScheduleScopeLine(r);
  if (scope) parts.push(scope);
  return parts.join(" · ");
}
