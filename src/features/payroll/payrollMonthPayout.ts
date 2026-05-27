import {
  buildScheduleMonthTabs,
  scheduleMonthSessionCounts,
  scheduleTabToPaymentMonths,
  yearMonthKey,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { tuitionPartsForSchedule } from "@/features/enrollment/enrollmentTuitionThirds";
import {
  INSTRUCTOR_REVENUE_SHARE,
  formatMoney,
} from "@/features/payroll/classPayrollAggregate";

export type PayrollMonthPayoutQuote = {
  amount: number;
  currency: string;
  formatted: string;
  breakdown: string;
  planMonth: 1 | 2 | 3;
  monthTuitionPerStudent: number;
  instructorSharePerStudent: number;
  paidStudentCount: number;
  listedTuitionPerStudent: number;
};

export function resolveSchedulePlanMonthForYearMonth(
  slots: SessionSlotLike[],
  yearMonth: string,
): { planMonth: 1 | 2 | 3; tabLabel: string; monthLine: string } | null {
  const tabs = buildScheduleMonthTabs(slots);
  for (const tab of tabs) {
    if (tab.slots.some((slot) => yearMonthKey(slot.sessionDate) === yearMonth)) {
      return {
        planMonth: scheduleTabToPaymentMonths(tab.value),
        tabLabel: tab.tabLabel,
        monthLine: tab.monthLine,
      };
    }
  }
  return null;
}

/** Infer listed tuition when API pricing is missing (demo: payment row ≈ one schedule-month share). */
export function inferListedTuitionPerStudent(
  slots: SessionSlotLike[],
  paidPaymentAmounts: number[],
): number | null {
  if (!paidPaymentAmounts.length) return null;
  const avgPaid = paidPaymentAmounts.reduce((sum, n) => sum + n, 0) / paidPaymentAmounts.length;
  if (!Number.isFinite(avgPaid) || avgPaid <= 0) return null;

  const counts = scheduleMonthSessionCounts(slots);
  const scheduleMonths = counts.filter((n) => n > 0).length;
  const divisor = scheduleMonths > 0 ? scheduleMonths : 3;
  return Math.round(avgPaid * divisor);
}

export function computePayrollMonthRequestedPayout(opts: {
  listedTuitionPerStudent: number | null | undefined;
  currency: string;
  slots: SessionSlotLike[];
  schedulePeriodKey: string;
  paidStudentCount: number;
}): PayrollMonthPayoutQuote | null {
  const { listedTuitionPerStudent, currency, slots, schedulePeriodKey, paidStudentCount } = opts;
  if (!listedTuitionPerStudent || listedTuitionPerStudent <= 0 || paidStudentCount <= 0 || !schedulePeriodKey) {
    return null;
  }

  const plan = resolveSchedulePlanMonthForYearMonth(slots, schedulePeriodKey);
  if (!plan) return null;

  const counts = scheduleMonthSessionCounts(slots);
  const split = tuitionPartsForSchedule(listedTuitionPerStudent, counts);
  if (!split) return null;

  const monthTuitionPerStudent = split.parts[plan.planMonth - 1]!;
  const instructorSharePerStudent = Math.round(monthTuitionPerStudent * INSTRUCTOR_REVENUE_SHARE);
  const amount = instructorSharePerStudent * paidStudentCount;

  const splitLabel = split.usesScheduleSplit
    ? "weighted by sessions in each schedule month"
    : "split equally across 3 schedule months";

  return {
    amount,
    currency,
    formatted: formatMoney(amount, currency),
    planMonth: plan.planMonth,
    monthTuitionPerStudent,
    instructorSharePerStudent,
    paidStudentCount,
    listedTuitionPerStudent,
    breakdown: `${formatMoney(instructorSharePerStudent, currency)} × ${paidStudentCount} paid student${paidStudentCount === 1 ? "" : "s"} (${Math.round(INSTRUCTOR_REVENUE_SHARE * 100)}% of ${formatMoney(monthTuitionPerStudent, currency)} ${plan.tabLabel.toLowerCase()} share). Listed tuition ${formatMoney(listedTuitionPerStudent, currency)} per student, ${splitLabel}.`,
  };
}
