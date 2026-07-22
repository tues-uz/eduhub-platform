import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Loader2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePayrollRequestSchedule } from "@/features/admin/hooks/usePayrollRequestSchedule";
import { classScheduleStatusHint } from "@/features/courses/classSchedulePreview";
import { isUuid } from "@/api/utils";
import { PayrollPeriodEligibilityChip } from "@/features/payroll/PayrollPeriodEligibilityChip";
import {
  applyPayrollPeriodOption,
  buildPayrollPeriodOptions,
  formatPayrollSchedulePeriodLabel,
  parsePayrollPeriodYearMonth,
  pickDefaultPayrollPeriodOption,
  validatePayrollMonthEligibility,
  type TeacherPayrollFormFields,
} from "@/features/payroll/payrollScheduleEligibility";
import type { InstructorPayrollRequestRecord } from "@/features/teacher/data/instructorPayrollRequestStore";
import {
  computePayrollMonthRequestedPayout,
  inferListedTuitionPerStudent,
} from "@/features/payroll/payrollMonthPayout";
import { INSTRUCTOR_REVENUE_SHARE, PLATFORM_REVENUE_SHARE, formatMoney } from "@/features/payroll/classPayrollAggregate";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className: string;
  course: string;
  formKey: string;
  form: TeacherPayrollFormFields | undefined;
  onFormChange: (patch: Partial<TeacherPayrollFormFields>) => void;
  summaryText: string;
  enrolledStudentCount: number;
  paidStudentCount: number;
  paymentCurrency: string;
  paidPaymentAmounts: number[];
  existingClassRequests: InstructorPayrollRequestRecord[];
  onSubmit: () => void;
};

type PeriodOptionView = ReturnType<typeof buildPayrollPeriodOptions>[number] & {
  submissionStatus: InstructorPayrollRequestRecord["status"] | null;
  alreadySubmitted: boolean;
  canSubmit: boolean;
};

function periodSubmissionStatus(
  optionId: string,
  existingClassRequests: InstructorPayrollRequestRecord[],
): InstructorPayrollRequestRecord["status"] | null {
  const match = existingClassRequests.find((request) => {
    if (request.status === "rejected") return false;
    return parsePayrollPeriodYearMonth(request.periodLabel, request.submittedAt) === optionId;
  });
  return match?.status ?? null;
}

export function TeacherPayrollSubmitDialog({
  open,
  onOpenChange,
  className: classSection,
  course,
  formKey,
  form,
  onFormChange,
  summaryText,
  enrolledStudentCount,
  paidStudentCount,
  paymentCurrency,
  paidPaymentAmounts,
  existingClassRequests,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const payrollSchedule = usePayrollRequestSchedule({
    classSection,
    course,
    periodLabel: form?.periodLabel ?? "",
    submittedAt: new Date().toISOString(),
  });

  const periodOptions = useMemo(
    () => buildPayrollPeriodOptions(payrollSchedule.slots, payrollSchedule.courseId ?? ""),
    [payrollSchedule.slots, payrollSchedule.courseId],
  );

  const periodOptionViews = useMemo((): PeriodOptionView[] => {
    return periodOptions.map((option) => {
      const submissionStatus = periodSubmissionStatus(option.id, existingClassRequests);
      const alreadySubmitted = submissionStatus != null;
      return {
        ...option,
        submissionStatus,
        alreadySubmitted,
        canSubmit: option.eligible && !alreadySubmitted,
      };
    });
  }, [existingClassRequests, periodOptions]);

  const eligibleCount = useMemo(
    () => periodOptionViews.filter((option) => option.canSubmit).length,
    [periodOptionViews],
  );

  const selectedOption = useMemo(
    () => periodOptionViews.find((option) => option.id === form?.schedulePeriodKey) ?? null,
    [periodOptionViews, form?.schedulePeriodKey],
  );

  const scheduleSourceNote = useMemo(() => {
    if (!payrollSchedule.courseId || payrollSchedule.slots.length === 0) return null;
    const isApiCourse = isUuid(payrollSchedule.courseId);
    return (
      classScheduleStatusHint(
        payrollSchedule.courseId,
        isApiCourse,
        payrollSchedule.scheduleProposal,
        payrollSchedule.slots.length > 0,
      ) ?? "Months come from the schedule admin created and you approved."
    );
  }, [payrollSchedule]);

  const listedTuitionPerStudent = useMemo(() => {
    const pricing = payrollSchedule.apiCourse?.pricing;
    const fromApi = pricing?.discountedAmount ?? pricing?.amount;
    if (typeof fromApi === "number" && fromApi > 0) return fromApi;
    return inferListedTuitionPerStudent(payrollSchedule.slots, paidPaymentAmounts);
  }, [payrollSchedule.apiCourse?.pricing, payrollSchedule.slots, paidPaymentAmounts]);

  const classPriceCurrency = payrollSchedule.apiCourse?.pricing?.currency ?? paymentCurrency;

  const classPricingSummary = useMemo(() => {
    if (!listedTuitionPerStudent || listedTuitionPerStudent <= 0) {
      return {
        perStudentLabel: "—",
        totalClassLabel: "—",
        instructorShareLabel: "—",
        platformShareLabel: "—",
        hasPrice: false,
      };
    }
    const perStudentLabel = formatMoney(listedTuitionPerStudent, classPriceCurrency);
    const totalClassAmount = listedTuitionPerStudent * Math.max(enrolledStudentCount, 0);
    const totalClassLabel =
      enrolledStudentCount > 0
        ? formatMoney(totalClassAmount, classPriceCurrency)
        : perStudentLabel;
    const instructorShareAmount = Math.round(totalClassAmount * INSTRUCTOR_REVENUE_SHARE);
    const platformShareAmount = Math.round(totalClassAmount * PLATFORM_REVENUE_SHARE);
    return {
      perStudentLabel,
      totalClassLabel,
      instructorShareLabel: formatMoney(instructorShareAmount, classPriceCurrency),
      platformShareLabel: formatMoney(platformShareAmount, classPriceCurrency),
      hasPrice: true,
    };
  }, [classPriceCurrency, enrolledStudentCount, listedTuitionPerStudent]);

  const monthlyInstructorPayroll = useMemo(() => {
    const studentCount = paidStudentCount > 0 ? paidStudentCount : enrolledStudentCount;
    if (!listedTuitionPerStudent || listedTuitionPerStudent <= 0 || studentCount <= 0 || periodOptionViews.length === 0) {
      return null;
    }

    const months = periodOptionViews
      .map((option) => {
        const quote = computePayrollMonthRequestedPayout({
          listedTuitionPerStudent,
          currency: classPriceCurrency,
          slots: payrollSchedule.slots,
          schedulePeriodKey: option.id,
          paidStudentCount: studentCount,
        });
        if (!quote) return null;
        return {
          schedulePeriodKey: option.id,
          periodLabel: formatPayrollSchedulePeriodLabel(option),
          sessionCount: option.sessionCount,
          formatted: quote.formatted,
          amount: quote.amount,
        };
      })
      .filter((line): line is NonNullable<typeof line> => line != null);

    if (months.length === 0) return null;

    const totalInstructorShare = months.reduce((sum, line) => sum + line.amount, 0);
    return {
      submissionCount: periodOptionViews.length,
      months,
      totalInstructorShare,
      totalFormatted: formatMoney(totalInstructorShare, classPriceCurrency),
      studentCount,
    };
  }, [
    classPriceCurrency,
    enrolledStudentCount,
    listedTuitionPerStudent,
    paidStudentCount,
    payrollSchedule.slots,
    periodOptionViews,
  ]);

  const payoutQuote = useMemo(() => {
    if (!form?.schedulePeriodKey) return null;
    const currency = payrollSchedule.apiCourse?.pricing?.currency ?? paymentCurrency;
    return computePayrollMonthRequestedPayout({
      listedTuitionPerStudent,
      currency,
      slots: payrollSchedule.slots,
      schedulePeriodKey: form.schedulePeriodKey,
      paidStudentCount,
    });
  }, [
    form?.schedulePeriodKey,
    listedTuitionPerStudent,
    payrollSchedule.apiCourse?.pricing?.currency,
    paymentCurrency,
    payrollSchedule.slots,
    paidStudentCount,
  ]);

  useEffect(() => {
    if (!open || !payoutQuote) return;
    if (form?.requestedPayout === payoutQuote.formatted) return;
    onFormChange({ requestedPayout: payoutQuote.formatted });
  }, [open, payoutQuote, form?.requestedPayout, onFormChange]);

  useEffect(() => {
    if (!open || !periodOptionViews.length || form?.schedulePeriodKey) return;
    const defaultOption =
      pickDefaultPayrollPeriodOption(periodOptionViews.filter((option) => option.canSubmit)) ??
      periodOptionViews[periodOptionViews.length - 1];
    if (defaultOption) onFormChange(applyPayrollPeriodOption(defaultOption));
  }, [open, periodOptionViews, form?.schedulePeriodKey, onFormChange]);

  const scheduleLoading = open && payrollSchedule.loading && periodOptionViews.length === 0;
  const hasApprovedScheduleMonths = periodOptionViews.length > 0;
  const canSubmitPeriod = hasApprovedScheduleMonths && Boolean(selectedOption?.canSubmit);

  const handleSubmit = () => {
    if (!hasApprovedScheduleMonths) {
      toast.error("Schedule not ready for payroll", {
        description:
          "Payroll is submitted per month from the class schedule admin created and you approved. Publish that schedule first.",
      });
      return;
    }
    if (!selectedOption) {
        toast.error("Select a schedule month", {
          description: "Choose a month where all sessions are finished.",
        });
        return;
      }
      if (selectedOption.alreadySubmitted) {
        toast.error("Month already submitted", {
          description:
            selectedOption.submissionStatus === "pending"
              ? `${formatPayrollSchedulePeriodLabel(selectedOption)} is waiting for admin review.`
              : `${formatPayrollSchedulePeriodLabel(selectedOption)} payroll was already approved.`,
        });
        return;
      }
      if (!selectedOption.eligible) {
        toast.error("Month not ready for payroll", {
          description: `Complete all ${selectedOption.sessionCount} scheduled meetings in ${formatPayrollSchedulePeriodLabel(selectedOption)} first (${selectedOption.finishedCount}/${selectedOption.sessionCount} done).`,
        });
        return;
      }
      if (payrollSchedule.courseId && form?.schedulePeriodKey) {
        const eligibility = validatePayrollMonthEligibility(
          payrollSchedule.slots,
          payrollSchedule.courseId,
          form.schedulePeriodKey,
        );
        if (eligibility.ok === false) {
          toast.error("Meetings not complete", { description: eligibility.reason });
          return;
        }
      }
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-64px)] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 px-6 pt-8 pb-4">
          <DialogHeader>
            <DialogTitle>{t("teacher.payrollSubmit.title")}</DialogTitle>
            <DialogDescription>
              {classSection} · {course}. Payroll is submitted once per schedule month from the plan admin created and you
              approved. If a month has 12 meetings, all 12 must be completed with attendance held before you can submit
              that month's payroll.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          <div className="grid gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold text-slate-800">Class pricing</p>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] text-slate-500">Listed tuition (per student)</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-900">
                  {classPricingSummary.perStudentLabel}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">
                  Total class price
                  {enrolledStudentCount > 0 ? ` (${enrolledStudentCount} enrolled)` : ""}
                </dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-900">
                  {classPricingSummary.totalClassLabel}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Payroll submissions</dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-900">
                  {monthlyInstructorPayroll
                    ? `${monthlyInstructorPayroll.submissionCount} schedule month${monthlyInstructorPayroll.submissionCount === 1 ? "" : "s"}`
                    : periodOptionViews.length > 0
                      ? `${periodOptionViews.length} schedule month${periodOptionViews.length === 1 ? "" : "s"}`
                      : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">
                  Instructor share ({Math.round(INSTRUCTOR_REVENUE_SHARE * 100)}% total)
                </dt>
                <dd className="text-sm font-semibold tabular-nums text-emerald-800">
                  {monthlyInstructorPayroll?.totalFormatted ?? classPricingSummary.instructorShareLabel}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">
                  Platform share ({Math.round(PLATFORM_REVENUE_SHARE * 100)}%)
                </dt>
                <dd className="text-sm font-semibold tabular-nums text-slate-700">
                  {classPricingSummary.platformShareLabel}
                </dd>
              </div>
            </dl>
            {monthlyInstructorPayroll ? (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-[11px] font-medium text-slate-700">
                  Instructor payout per schedule month
                  {monthlyInstructorPayroll.studentCount > 0
                    ? ` (${monthlyInstructorPayroll.studentCount} student${monthlyInstructorPayroll.studentCount === 1 ? "" : "s"})`
                    : ""}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  Total instructor share is split across the {monthlyInstructorPayroll.submissionCount} months admin
                  scheduled and you approved — submit payroll once per month when every meeting in that month is
                  complete.
                </p>
                <ul className="mt-2 space-y-1.5">
                  {monthlyInstructorPayroll.months.map((line) => (
                    <li
                      key={line.schedulePeriodKey}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[11px]",
                        form?.schedulePeriodKey === line.schedulePeriodKey
                          ? "bg-emerald-50 ring-1 ring-emerald-200/80"
                          : "bg-white/80",
                      )}
                    >
                      <span className="min-w-0 text-slate-700">
                        <span className="font-medium text-slate-900">{line.periodLabel}</span>
                        <span className="text-slate-500">
                          {" "}
                          · {line.sessionCount} meeting{line.sessionCount === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-emerald-800">{line.formatted}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!classPricingSummary.hasPrice ? (
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Admin-listed tuition is not set for this class yet. Payout can still be calculated from paid student
                amounts when available.
              </p>
            ) : enrolledStudentCount === 0 ? (
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                No enrolled students yet — total class price will update as students join.
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700" htmlFor={`schedule-period-${formKey}`}>
              Schedule period
            </label>
            {scheduleSourceNote ? (
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{scheduleSourceNote}</p>
            ) : null}
            {scheduleLoading ? (
              <div className="mt-1 flex items-center gap-2 rounded-md border border-input bg-white px-3 py-2.5 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                Loading class schedule…
              </div>
            ) : periodOptionViews.length > 0 ? (
              <>
                {eligibleCount === 0 ? (
                  <p className="mt-2 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs leading-relaxed text-blue-950">
                    {periodOptionViews.some((option) => option.alreadySubmitted)
                      ? "Some schedule months are already submitted. Select any month below to check progress or status."
                      : "No schedule month is ready to submit yet. You can still select a month below to see how many meetings are left."}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {periodOptionViews.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onFormChange(applyPayrollPeriodOption(option))}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-colors",
                        form?.schedulePeriodKey === option.id
                          ? "border-emerald-300 bg-emerald-50/90 ring-1 ring-emerald-200/80"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
                      )}
                    >
                      <p className="text-xs font-semibold text-slate-900">{formatPayrollSchedulePeriodLabel(option)}</p>
                      <p className="mt-1 text-[11px] tabular-nums text-slate-600">
                        {option.sessionCount} meeting{option.sessionCount === 1 ? "" : "s"} · {option.sessionsTaught}{" "}
                        held
                      </p>
                      <div className="mt-2">
                        {option.alreadySubmitted ? (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200/90">
                            {option.submissionStatus === "pending" ? "Submitted" : "Approved"}
                          </span>
                        ) : (
                          <PayrollPeriodEligibilityChip option={option} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <Select
                  value={form?.schedulePeriodKey || undefined}
                  onValueChange={(value) => {
                    const option = periodOptionViews.find((item) => item.id === value);
                    if (option) onFormChange(applyPayrollPeriodOption(option));
                  }}
                >
                  <SelectTrigger id={`schedule-period-${formKey}`} className="mt-1 h-auto min-h-10 bg-white py-2">
                    {selectedOption ? (
                      <span className="flex w-full items-center justify-between gap-2 text-left">
                        <span className="min-w-0 truncate text-sm">
                          {formatPayrollSchedulePeriodLabel(selectedOption)} · {selectedOption.sessionCount} meeting
                          {selectedOption.sessionCount === 1 ? "" : "s"}
                        </span>
                        {selectedOption.alreadySubmitted ? (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200/90">
                            {selectedOption.submissionStatus === "pending" ? "Submitted" : "Approved"}
                          </span>
                        ) : (
                          <PayrollPeriodEligibilityChip option={selectedOption} />
                        )}
                      </span>
                    ) : (
                      <SelectValue placeholder="Select schedule month" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptionViews.map((option) => (
                      <SelectItem key={option.id} value={option.id} className="py-2.5">
                        <span className="flex w-full items-center justify-between gap-3 pr-1">
                          <span className="min-w-0 text-left">
                            <span className="block text-sm font-medium text-slate-900">
                              {formatPayrollSchedulePeriodLabel(option)}
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              {option.sessionCount} scheduled meeting{option.sessionCount === 1 ? "" : "s"} in this
                              schedule month
                            </span>
                          </span>
                          {option.alreadySubmitted ? (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200/90">
                              {option.submissionStatus === "pending" ? "Submitted" : "Approved"}
                            </span>
                          ) : (
                            <PayrollPeriodEligibilityChip option={option} />
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOption ? (
                  <p
                    className={cn(
                      "mt-2 rounded-lg border px-3 py-2 text-xs leading-relaxed",
                      selectedOption.canSubmit
                        ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                        : selectedOption.alreadySubmitted
                          ? "border-slate-200 bg-slate-50 text-slate-700"
                          : "border-amber-200 bg-amber-50/80 text-amber-950",
                    )}
                  >
                    {selectedOption.alreadySubmitted
                      ? selectedOption.submissionStatus === "pending"
                        ? `Payroll for ${formatPayrollSchedulePeriodLabel(selectedOption)} is already submitted and waiting for admin review.`
                        : `Payroll for ${formatPayrollSchedulePeriodLabel(selectedOption)} was approved. Submit the next schedule month when it is ready.`
                      : selectedOption.eligible
                        ? `All ${selectedOption.sessionCount} scheduled meetings in ${formatPayrollSchedulePeriodLabel(selectedOption)} are complete — you can submit payroll for this schedule month.`
                        : `${selectedOption.finishedCount} of ${selectedOption.sessionCount} meetings complete in ${formatPayrollSchedulePeriodLabel(selectedOption)}. Finish the remaining meetings with attendance before submitting payroll.`}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                    Select any schedule month to preview meetings and payout. Submit stays disabled until every meeting
                    in that month is complete.
                  </p>
                )}
              </>
            ) : (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-3 text-xs leading-relaxed text-amber-950">
                No approved schedule months are available yet. Admin must propose the class schedule and you must approve
                it before payroll can be submitted month by month.
              </div>
            )}
          </div>

          {selectedOption ? (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-xs leading-relaxed",
                selectedOption.canSubmit
                  ? "border-slate-200 bg-slate-50 text-slate-600"
                  : selectedOption.alreadySubmitted
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : "border-amber-200 bg-amber-50/80 text-amber-950",
              )}
            >
              {selectedOption.canSubmit ? (
                <>
                  <span className="font-medium text-slate-700">Included in your submission for admin:</span> payroll
                  for <span className="font-medium text-slate-800">{formatPayrollSchedulePeriodLabel(selectedOption)}</span> with{" "}
                  <span className="font-medium text-slate-800">{selectedOption.sessionsTaught}</span> meetings
                  completed.
                </>
              ) : selectedOption.alreadySubmitted ? (
                <>
                  <span className="font-medium text-slate-700">This month is already submitted.</span>{" "}
                  {selectedOption.submissionStatus === "pending"
                    ? "Waiting for admin review — pick another month when it is ready."
                    : "Payroll was approved — pick the next month when all meetings are complete."}
                </>
              ) : (
                <>
                  <span className="font-medium text-amber-950">Not ready to submit yet.</span>{" "}
                  {selectedOption.finishedCount} of {selectedOption.sessionCount} meetings complete in{" "}
                  {formatPayrollSchedulePeriodLabel(selectedOption)}. Finish the rest with attendance held, then submit payroll.
                </>
              )}
            </div>
          ) : null}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold text-slate-800">Requested payout for this month</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              How much you are asking admin to pay you for the selected schedule month — calculated automatically, not
              typed in by hand.
            </p>
            {payoutQuote ? (
              <>
                <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{payoutQuote.formatted}</p>
                {!selectedOption?.eligible && !selectedOption?.alreadySubmitted ? (
                  <p className="mt-2 text-[11px] font-medium text-amber-800">
                    Preview only — submit stays disabled until all meetings in this month are complete.
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{payoutQuote.breakdown}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                {selectedOption && !selectedOption.eligible
                  ? `Estimated payout preview for ${formatPayrollSchedulePeriodLabel(selectedOption)} — complete all ${selectedOption.sessionCount} meetings before you can submit.`
                  : "Select a schedule month above to see the payout estimate."}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700" htmlFor={`payout-${formKey}`}>
              Payout details (optional)
            </label>
            <Input
              id={`payout-${formKey}`}
              value={form?.payoutDetails ?? ""}
              onChange={(e) => onFormChange({ payoutDetails: e.target.value })}
              placeholder="Bank account / card / reference…"
              className="mt-1 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700" htmlFor={`notes-${formKey}`}>
              Notes to admin (optional)
            </label>
            <Textarea
              id={`notes-${formKey}`}
              value={form?.instructorNotes ?? ""}
              onChange={(e) => onFormChange({ instructorNotes: e.target.value })}
              placeholder="Any context for the admin…"
              className="mt-1 bg-white min-h-[90px]"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="font-medium text-slate-700">System summary:</span> {summaryText}
          </div>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 z-10 flex h-16 shrink-0 items-center gap-2 border-t border-slate-200 bg-background px-6 sm:justify-end sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button
            type="button"
            className="bg-[#3954d0] hover:bg-[#2f46b3] disabled:opacity-50"
            disabled={!canSubmitPeriod}
            onClick={handleSubmit}
          >
            Submit to admin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
