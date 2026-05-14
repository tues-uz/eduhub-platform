import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";

export type TuitionPlanMonths = 1 | 2 | 3;

/** Split total into `months` whole amounts that sum exactly to `total` (handles remainder across first months). */
export function splitTuitionEqualMonths(total: number, months: number): number[] | null {
  if (!Number.isFinite(total) || total <= 0 || months < 1) return null;
  const base = Math.floor(total / months);
  const rem = total - base * months;
  return Array.from({ length: months }, (_, i) => base + (i < rem ? 1 : 0));
}

const TUITION_MONTH_PARTS = 3;

/** Partition `total` into exactly three whole amounts that sum to `total`. */
export function tuitionThirds(total: number): [number, number, number] | null {
  const p = splitTuitionEqualMonths(total, TUITION_MONTH_PARTS);
  if (!p || p.length !== TUITION_MONTH_PARTS) return null;
  return [p[0]!, p[1]!, p[2]!];
}

/** Amount due with the application: 1 → first ⅓, 2 → first ⅔, 3 → full tuition. */
export function payNowForPlanMonths(planMonths: TuitionPlanMonths, total: number): number | null {
  const t = tuitionThirds(total);
  if (!t) return null;
  if (planMonths === 1) return t[0];
  if (planMonths === 2) return t[0] + t[1];
  return t[0] + t[1] + t[2];
}

/** Infer 1 / 2 / 3-month tuition schedule from stored payment fields (current enrollment form mapping). */
export type InferredTuitionPlan = TuitionPlanMonths | "other";

export function inferTuitionPlanMonths(r: EnrollmentApplicationResponse): InferredTuitionPlan {
  if (r.paymentPlan === "FULL") return 3;
  if (r.paymentPlan === "DOWN_PAYMENT") {
    if (r.installmentCount === 2) return 1;
    if (r.installmentCount === 1) return 2;
  }
  return "other";
}

export function tuitionPlanTitle(plan: InferredTuitionPlan): string {
  if (plan === 1) return "1 month (⅓ due now)";
  if (plan === 2) return "2 months (⅔ due now)";
  if (plan === 3) return "3 months (full tuition)";
  return "Other / legacy instalment plan";
}

/** Expected first payment for inferred plan; `null` if plan is other or total missing. */
export function expectedPayNowForRecord(
  r: EnrollmentApplicationResponse,
  listedTuition: number | undefined,
): number | null {
  const plan = inferTuitionPlanMonths(r);
  if (plan === "other" || listedTuition == null || listedTuition <= 0) return null;
  return payNowForPlanMonths(plan, listedTuition);
}

/** Whether declared down payment matches expected pay-now for listed tuition (integers). */
export function payNowMatchesDeclared(
  r: EnrollmentApplicationResponse,
  listedTuition: number | undefined,
): boolean | null {
  if (listedTuition == null || listedTuition <= 0) return null;
  const expected = expectedPayNowForRecord(r, listedTuition);
  if (expected == null) return null;
  if (r.paymentPlan === "FULL") {
    return r.downPaymentAmount == null || r.downPaymentAmount === expected;
  }
  const d = r.downPaymentAmount;
  if (d == null) return false;
  return d === expected;
}
