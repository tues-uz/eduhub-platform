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

export type TuitionMonthWeights = readonly [number, number, number];

/** Split tuition across three months by session counts (or other weights); whole amounts sum to `total`. */
export function splitTuitionByMonthWeights(
  total: number,
  weights: TuitionMonthWeights,
): [number, number, number] | null {
  const [w0, w1, w2] = weights;
  const sum = w0 + w1 + w2;
  if (!Number.isFinite(total) || total <= 0 || sum <= 0) return null;

  const raw = [w0, w1, w2].map((w) => (total * w) / sum);
  const floors = raw.map((x) => Math.floor(x)) as [number, number, number];
  const remainder = total - floors[0] - floors[1] - floors[2];
  const order = raw
    .map((x, i) => ({ i, frac: x - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const parts: [number, number, number] = [...floors];
  for (let k = 0; k < remainder; k++) {
    parts[order[k % 3]!.i]++;
  }
  return parts;
}

/** Three month tuition shares: by schedule session counts when provided, else equal thirds. */
export function tuitionPartsForSchedule(
  total: number,
  scheduleMonthSessionCounts?: TuitionMonthWeights,
): { parts: [number, number, number]; usesScheduleSplit: boolean } | null {
  const counts = scheduleMonthSessionCounts;
  const sessionTotal = counts ? counts[0] + counts[1] + counts[2] : 0;
  if (counts && sessionTotal > 0) {
    const parts = splitTuitionByMonthWeights(total, counts);
    if (parts) return { parts, usesScheduleSplit: true };
  }
  const parts = tuitionThirds(total);
  if (!parts) return null;
  return { parts, usesScheduleSplit: false };
}

/** Sum schedule-month shares for individually selected months (1, 2, and/or 3). */
export function payNowForSelectedCalendarMonths(
  total: number,
  selectedMonths: ReadonlySet<TuitionPlanMonths> | Iterable<TuitionPlanMonths>,
  scheduleMonthSessionCounts?: TuitionMonthWeights,
): { payNow: number; parts: [number, number, number] } | null {
  const split = tuitionPartsForSchedule(total, scheduleMonthSessionCounts);
  if (!split) return null;
  const { parts } = split;
  let payNow = 0;
  for (const m of selectedMonths) {
    if (m === 1) payNow += parts[0];
    else if (m === 2) payNow += parts[1];
    else if (m === 3) payNow += parts[2];
  }
  return { payNow, parts };
}

/** Count of schedule months that have at least one session (matches payment tab count). */
export function activeScheduleMonthCount(counts: TuitionMonthWeights): number {
  return counts.filter((n) => n > 0).length;
}

/** Amount due now: sum of month 1 (and 2, 3) shares — schedule-weighted when counts are provided. */
export function payNowForPlanMonths(
  planMonths: TuitionPlanMonths,
  total: number,
  scheduleMonthSessionCounts?: TuitionMonthWeights,
): number | null {
  const split = tuitionPartsForSchedule(total, scheduleMonthSessionCounts);
  if (!split) return null;
  const [a, b, c] = split.parts;
  if (planMonths === 1) return a;
  if (planMonths === 2) return a + b;
  return a + b + c;
}

/** Infer 1 / 2 / 3-month tuition schedule from stored payment fields (current enrollment form mapping). */
export type InferredTuitionPlan = TuitionPlanMonths | "other";

export type EnrollmentPaymentFields = {
  paymentPlan?: EnrollmentApplicationResponse["paymentPlan"];
  installmentCount?: EnrollmentApplicationResponse["installmentCount"];
};

export function inferTuitionPlanMonths(
  r: EnrollmentApplicationResponse | EnrollmentPaymentFields,
  scheduleMonthCount?: number,
): InferredTuitionPlan {
  if (r.paymentPlan === "FULL") return 3;
  if (r.paymentPlan === "DOWN_PAYMENT") {
    if (r.installmentCount === 2) return 1;
    if (r.installmentCount === 1) {
      const active = scheduleMonthCount ?? 3;
      return active >= 3 ? 2 : 1;
    }
  }
  return "other";
}

/** Calendar months (1–3) covered by an approved enrollment's first payment plan. */
export function paidTuitionMonthsFromPaymentFields(
  r: EnrollmentPaymentFields | undefined | null,
  scheduleMonthCount?: number,
): Set<TuitionPlanMonths> | null {
  if (!r) return null;
  const plan = inferTuitionPlanMonths(r, scheduleMonthCount);
  if (plan === 3) return new Set([1, 2, 3]);
  if (plan === 2) return new Set([1, 2]);
  if (plan === 1) return new Set([1]);
  return new Set([1, 2, 3]);
}

export function isTuitionMonthPaid(
  month: TuitionPlanMonths,
  paidMonths: ReadonlySet<TuitionPlanMonths> | null | undefined,
): boolean {
  if (!paidMonths) return false;
  return paidMonths.has(month);
}

export function tuitionPlanTitle(plan: InferredTuitionPlan): string {
  if (plan === 1) return "First month";
  if (plan === 2) return "Second month";
  if (plan === 3) return "Full payment";
  return "Monthly payment";
}

/** Human plan label: First month / Second month / Third month / Full payment. */
export function enrollmentMonthsPaidLabel(
  r: EnrollmentPaymentFields & { paymentPlan?: EnrollmentApplicationResponse["paymentPlan"] },
  scheduleMonthCount?: number,
): string {
  if (r.paymentPlan === "FULL") return "Full payment";
  const paid = paidTuitionMonthsFromPaymentFields(r, scheduleMonthCount);
  if (!paid?.size) return "Monthly payment";
  const activeMonths = scheduleMonthCount && scheduleMonthCount > 0 ? scheduleMonthCount : paid.size;
  if (paid.size >= activeMonths || paid.size >= 3) return "Full payment";
  const highest = Math.max(...paid);
  if (highest === 1) return "First month";
  if (highest === 2) return "Second month";
  if (highest === 3) return "Third month";
  return "Full payment";
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
