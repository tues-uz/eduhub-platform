/**
 * Alternate enrollment tuition UI: pick schedule months (1–3) with checkboxes.
 * Not used on the live form — kept so the month-card flow can be restored without digging git history.
 */
import { useMemo, type Dispatch, type SetStateAction } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ClassSchedulePreviewPanel } from "@/features/courses/ClassSchedulePreviewPanel";
import {
  buildScheduleMonthTabs,
  resolvePreviewSessionSlots,
  scheduleMonthSessionCounts,
  sessionDateMs,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import type { CourseResponse, ScheduleProposalResponse } from "@/api/eduhubTypes";
import type { TeacherCourse } from "@/features/teacher/types";
import { isUuid } from "@/api/utils";
import {
  payNowForSelectedCalendarMonths,
  tuitionThirds,
  type TuitionPlanMonths,
} from "@/features/enrollment/enrollmentTuitionThirds";
import type { EnrollmentInstallmentCount } from "@/api/eduhubTypes";
import { cn } from "@/lib/utils";

export type MonthlyPlanMonthCount = TuitionPlanMonths;

const MONTH_PLAN_OPTIONS: { months: MonthlyPlanMonthCount; label: string }[] = [
  { months: 1, label: "1 month" },
  { months: 2, label: "2 months" },
  { months: 3, label: "3 months" },
];

function formatPrice(price: number | undefined, currency = "USD"): string {
  if (price == null || price <= 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

function planCardMonthPrice(
  total: number | undefined,
  month: MonthlyPlanMonthCount,
  currency: string,
): string | null {
  if (total == null || total <= 0) return null;
  const parts = tuitionThirds(total);
  if (!parts) return null;
  return formatPrice(parts[month - 1], currency);
}

export type MonthlyPaySummary =
  | { kind: "noPrice" }
  | {
      kind: "emptySelection";
      total: number;
      monthParts: [number, number, number];
      monthSessionCounts: [number, number, number];
    }
  | {
      kind: "ok";
      total: number;
      monthParts: [number, number, number];
      monthSessionCounts: [number, number, number];
      selectedMonths: Set<MonthlyPlanMonthCount>;
      selectedCount: number;
      payNow: number;
      remaining: number;
      apiInstallmentCount: EnrollmentInstallmentCount;
    };

export function useEnrollmentMonthlyPaySummary(
  coursePriceAmount: number | undefined,
  selectedPaymentMonths: Set<MonthlyPlanMonthCount>,
  scheduleMonthCounts: [number, number, number],
): MonthlyPaySummary {
  return useMemo(() => {
    const total = coursePriceAmount;
    if (total == null || total <= 0) return { kind: "noPrice" };
    const priced = payNowForSelectedCalendarMonths(total, selectedPaymentMonths);
    if (!priced) return { kind: "noPrice" };
    const { payNow, parts } = priced;
    if (selectedPaymentMonths.size === 0) {
      return { kind: "emptySelection", total, monthParts: parts, monthSessionCounts: scheduleMonthCounts };
    }
    const remaining = total - payNow;
    const unselectedCount = 3 - selectedPaymentMonths.size;
    const apiInstallmentCount: EnrollmentInstallmentCount =
      unselectedCount === 0 ? 2 : unselectedCount === 2 ? 2 : 1;
    return {
      kind: "ok",
      total,
      monthParts: parts,
      monthSessionCounts: scheduleMonthCounts,
      selectedMonths: selectedPaymentMonths,
      selectedCount: selectedPaymentMonths.size,
      payNow,
      remaining,
      apiInstallmentCount,
    };
  }, [coursePriceAmount, selectedPaymentMonths, scheduleMonthCounts]);
}

export type EnrollmentMonthlyPaymentSelectorProps = {
  courseId: string | undefined;
  apiCourse: CourseResponse | null;
  scheduleProposal: ScheduleProposalResponse | null;
  teacherCourse: TeacherCourse | null;
  coursePriceAmount: number | undefined;
  priceCurrency: string;
  loadingCourse: boolean;
  selectedPaymentMonths: Set<MonthlyPlanMonthCount>;
  onSelectedPaymentMonthsChange: Dispatch<SetStateAction<Set<MonthlyPlanMonthCount>>>;
  viewingScheduleMonth: MonthlyPlanMonthCount;
  onViewingScheduleMonthChange: (month: MonthlyPlanMonthCount) => void;
  monthlyPaySummary: MonthlyPaySummary;
  schedulePanelClassName?: string;
};

export function EnrollmentMonthlyPaymentSelector({
  courseId,
  apiCourse,
  scheduleProposal,
  teacherCourse,
  coursePriceAmount,
  priceCurrency,
  loadingCourse,
  selectedPaymentMonths,
  onSelectedPaymentMonthsChange,
  viewingScheduleMonth,
  onViewingScheduleMonthChange,
  monthlyPaySummary,
  schedulePanelClassName = "rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3",
}: EnrollmentMonthlyPaymentSelectorProps) {
  const enrollmentScheduleSlots = useMemo(() => {
    if (!courseId) return [] as SessionSlotLike[];
    const isTeacher = courseId.startsWith("teacher_");
    const isApiCourse = Boolean(isUuid(courseId) && !isTeacher);
    const raw = resolvePreviewSessionSlots(
      courseId,
      apiCourse,
      scheduleProposal,
      isApiCourse,
      teacherCourse,
    );
    const decorated = raw.map((slot, i) => ({ slot, i, ms: sessionDateMs(slot.sessionDate) }));
    decorated.sort((a, b) => {
      const na = Number.isNaN(a.ms) ? Infinity : a.ms;
      const nb = Number.isNaN(b.ms) ? Infinity : b.ms;
      if (na !== nb) return na - nb;
      return a.i - b.i;
    });
    return decorated.map((x) => x.slot);
  }, [courseId, apiCourse, scheduleProposal, teacherCourse]);

  const scheduleMonthCounts = useMemo(
    () => scheduleMonthSessionCounts(enrollmentScheduleSlots),
    [enrollmentScheduleSlots],
  );

  const scheduleMonthTabs = useMemo(
    () => buildScheduleMonthTabs(enrollmentScheduleSlots),
    [enrollmentScheduleSlots],
  );

  const togglePaymentMonth = (month: MonthlyPlanMonthCount) => {
    onSelectedPaymentMonthsChange((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
    onViewingScheduleMonthChange(month);
  };

  const focusScheduleMonth = (month: MonthlyPlanMonthCount) => {
    onViewingScheduleMonthChange(month);
  };

  return (
    <>
      <p className="text-xs text-zinc-500">
        Each card is one third of the listed tuition. Check every month you are paying for in this transfer — the
        total due is the sum of the months you select.
      </p>
      <p className="mt-4 text-xs font-medium text-zinc-700">Pay over</p>
      <div className="mt-2 space-y-2">
        <div role="group" aria-label="Select months to pay" className="grid gap-2 sm:grid-cols-3">
          {MONTH_PLAN_OPTIONS.map(({ months, label }) => {
            const priceLine = planCardMonthPrice(coursePriceAmount, months, priceCurrency);
            const sessionTotal =
              scheduleMonthCounts[0] + scheduleMonthCounts[1] + scheduleMonthCounts[2];
            const sessionsInMonth = scheduleMonthCounts[months - 1];
            const isSelected = selectedPaymentMonths.has(months);
            const isViewing = viewingScheduleMonth === months;
            const monthTab = scheduleMonthTabs[months - 1];
            const checkboxId = `pay-months-${months}`;
            return (
              <label
                key={months}
                htmlFor={checkboxId}
                onClick={() => focusScheduleMonth(months)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border bg-zinc-50/40 px-4 py-3 transition-colors hover:bg-zinc-50",
                  isViewing ? "border-[#3954d0]/45 ring-1 ring-[#3954d0]/20" : "border-zinc-200",
                  isSelected &&
                    "has-[[data-state=checked]]:border-[#3954d0]/40 has-[[data-state=checked]]:bg-[#3954d0]/[0.06]",
                )}
              >
                <Checkbox
                  id={checkboxId}
                  checked={isSelected}
                  onCheckedChange={() => togglePaymentMonth(months)}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 rounded-full border-2 border-zinc-300/90 bg-white shadow-none",
                    "transition-[border-color,background-color,box-shadow] duration-150",
                    "hover:border-zinc-400",
                    "data-[state=checked]:border-[#3954d0] data-[state=checked]:bg-[#3954d0] data-[state=checked]:text-white",
                    "focus-visible:ring-2 focus-visible:ring-[#3954d0]/25 focus-visible:ring-offset-0",
                    "[&_svg]:h-2.5 [&_svg]:w-2.5 [&_svg]:stroke-[2.5]",
                  )}
                  aria-label={`Pay for ${monthTab?.tabLabel ?? label}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-900">{monthTab?.tabLabel ?? label}</span>
                  {monthTab?.monthLine ? (
                    <span className="mt-0.5 block text-[10px] font-medium leading-snug text-zinc-500">
                      {monthTab.monthLine}
                    </span>
                  ) : null}
                  <span className="mt-0.5 block text-[11px] font-medium text-zinc-500">Due now</span>
                  {sessionTotal > 0 ? (
                    <span className="mt-0.5 block text-[10px] font-medium text-zinc-500">
                      {sessionsInMonth} of {sessionTotal} sessions
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "mt-0.5 block text-xs font-semibold tabular-nums tracking-tight",
                      priceLine ? "text-[#3954d0]" : "font-medium text-zinc-400",
                    )}
                  >
                    {priceLine ?? (loadingCourse ? "Loading…" : "Price not listed")}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <ClassSchedulePreviewPanel
          courseId={courseId}
          apiCourse={apiCourse}
          scheduleProposal={scheduleProposal}
          teacherCourse={teacherCourse}
          viewingMonth={viewingScheduleMonth}
          onViewingMonthChange={onViewingScheduleMonthChange}
          selectedPaymentMonths={selectedPaymentMonths}
          linkPaymentMonths
          className={schedulePanelClassName}
        />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        Tuition is split into three equal monthly parts (total ÷ 3). Check each month you are paying for, then use the
        matching tab below to review that month&apos;s classes. Your transfer should match the combined total.
      </p>
      <MonthlyPaymentBreakdown summary={monthlyPaySummary} priceCurrency={priceCurrency} />
    </>
  );
}

export function MonthlyPaymentBreakdown({
  summary,
  priceCurrency,
}: {
  summary: MonthlyPaySummary;
  priceCurrency: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">Payment breakdown</p>
      {summary.kind === "noPrice" ? (
        <p className="text-zinc-600">
          No listed class price here (or the class is free). The school will confirm how much to pay and when. You can
          still submit your application and proof of any transfer they asked you to make.
        </p>
      ) : summary.kind === "emptySelection" ? (
        <p className="text-zinc-600">Select at least one month above to see your payment breakdown.</p>
      ) : (
        <ul className="space-y-2 text-zinc-800">
          <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
            <span className="text-zinc-500">Total tuition</span>
            <span className="font-semibold tabular-nums text-zinc-900">
              {formatPrice(summary.total, priceCurrency)}
            </span>
          </li>
          <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-t border-zinc-200/90 pt-2">
            <span className="text-zinc-500">Months selected</span>
            <span className="font-medium tabular-nums text-zinc-900">{summary.selectedCount} of 3</span>
          </li>
          <li className="border-t border-zinc-200/90 pt-2 text-zinc-700">
            <span className="text-zinc-500">Three equal monthly parts</span>
            <ul className="mt-2 space-y-1.5 text-xs">
              {(["1st", "2nd", "3rd"] as const).map((label, i) => {
                const [x, y, z] = summary.monthParts;
                const amounts = [x, y, z];
                const [c0, c1, c2] = summary.monthSessionCounts;
                const counts = [c0, c1, c2];
                const monthNum = (i + 1) as MonthlyPlanMonthCount;
                const selected = summary.selectedMonths.has(monthNum);
                return (
                  <li key={label} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
                    <span className={cn("text-zinc-500", selected && "font-medium text-zinc-700")}>
                      {label} month
                      {counts[i]! > 0 ? ` · ${counts[i]} session${counts[i] === 1 ? "" : "s"}` : ""}
                      {selected ? " · paying now" : ""}
                    </span>
                    <span className="font-medium tabular-nums text-zinc-900">
                      {formatPrice(amounts[i], priceCurrency)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <span className="mt-1.5 block text-xs font-normal text-zinc-500">
              Each part is one third of the total (rounded so all three add up exactly).
            </span>
          </li>
          <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-t border-zinc-200/90 pt-2">
            <span className="text-zinc-500">Due with this application</span>
            <span className="font-semibold tabular-nums text-zinc-900">
              {formatPrice(summary.payNow, priceCurrency)}
            </span>
          </li>
          {summary.remaining > 0 ? (
            <li className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
              <span className="text-zinc-500">Remaining after this transfer</span>
              <span className="font-semibold tabular-nums text-zinc-900">
                {formatPrice(summary.remaining, priceCurrency)}
                <span className="ml-1.5 text-xs font-normal text-zinc-500">
                  ({summary.apiInstallmentCount === 2 ? "2 instalments" : "1 instalment"})
                </span>
              </span>
            </li>
          ) : (
            <li className="border-t border-zinc-200/90 pt-2 text-xs text-zinc-600">
              No remaining tuition on this plan — full amount is paid with this application.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
