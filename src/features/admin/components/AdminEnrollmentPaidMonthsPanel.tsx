import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "@/lib/icons";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import { buildCourseScheduleSlots } from "@/features/courses/courseScheduleSlots";
import { useTranslation } from "react-i18next";
import {
  buildScheduleMonthTabs,
  orderSessionSlotsChronologically,
  scheduleMonthSessionCounts,
  scheduleTabToPaymentMonths,
} from "@/features/courses/classSchedulePreview";
import { Link } from "react-router-dom";
import { adminEnrollmentPaidMonthsStore } from "@/features/admin/data/adminEnrollmentPaidMonthsStore";
import {
  AdminActionCodeField,
  useAdminActionCodeState,
} from "@/features/admin/components/AdminActionCodeField";
import { validateAdminActionCodeOrThrow } from "@/features/admin/adminStaffCode";
import {
  useInstallmentPaymentsForApplication,
} from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import {
  paidMonthsSummary,
  resolvePaidTuitionMonths,
} from "@/features/enrollment/enrollmentPaidMonths";
import { tuitionAmountForScheduleMonth } from "@/features/enrollment/enrollmentInstallmentPayments";
import type { TuitionPlanMonths } from "@/features/enrollment/enrollmentTuitionThirds";
import { cn } from "@/lib/utils";

type Props = {
  record: EnrollmentApplicationResponse;
};

export function AdminEnrollmentPaidMonthsPanel({ record }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(Boolean(record.courseId && isUuid(record.courseId)));
  const [scheduleTabs, setScheduleTabs] = useState<ReturnType<typeof buildScheduleMonthTabs>>([]);
  const [listedTuition, setListedTuition] = useState<number | undefined>();
  const [currency, setCurrency] = useState(record.priceCurrency ?? "USD");
  const [adminActionCode, setAdminActionCode] = useAdminActionCodeState();
  const [busyMonth, setBusyMonth] = useState<TuitionPlanMonths | null>(null);

  const installments = useInstallmentPaymentsForApplication(record.id);

  useEffect(() => {
    if (!record.courseId || !isUuid(record.courseId)) {
      setScheduleTabs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    Promise.all([
      eduhubCourses.getById(record.courseId),
      eduhubSchedule.getProposal(record.courseId).catch(() => null),
    ])
      .then(([course, proposal]) => {
        if (cancelled) return;
        const slots = buildCourseScheduleSlots(course, proposal, record.courseId);
        const ordered = orderSessionSlotsChronologically(slots);
        setScheduleTabs(buildScheduleMonthTabs(ordered));
        const amt = course.pricing?.discountedAmount ?? course.pricing?.amount;
        setListedTuition(amt != null && amt > 0 ? amt : undefined);
        setCurrency(course.pricing?.currency ?? record.priceCurrency ?? "USD");
      })
      .catch(() => {
        if (!cancelled) setScheduleTabs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [record]);

  const orderedSlots = useMemo(
    () => scheduleTabs.flatMap((tab) => tab.slots),
    [scheduleTabs],
  );
  const scheduleMonthCounts = useMemo(
    () => scheduleMonthSessionCounts(orderedSlots),
    [orderedSlots],
  );

  const paidMonths = useMemo(
    () => resolvePaidTuitionMonths(record, orderedSlots, record.id) ?? new Set<TuitionPlanMonths>(),
    [record, orderedSlots],
  );

  const hasPartialPlan = useMemo(
    () => scheduleTabs.length > 0 && paidMonths.size < scheduleTabs.length,
    [paidMonths.size, scheduleTabs.length],
  );

  const recordPaid = async (month: TuitionPlanMonths) => {
    let code: string;
    try {
      code = validateAdminActionCodeOrThrow(adminActionCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enter your admin code");
      return;
    }
    const amount = listedTuition
      ? tuitionAmountForScheduleMonth(listedTuition, month, scheduleMonthCounts)
      : null;
    if (!amount || amount <= 0) {
      toast.error("Course tuition amount is unavailable — cannot record a payment.");
      return;
    }
    setBusyMonth(month);
    try {
      await adminEnrollmentPaidMonthsStore.recordManual(record.id, {
        scheduleMonth: month,
        amount,
        adminNote: "Recorded manually by admin (verified outside the app).",
        adminActionCode: code,
      });
      toast.success(t("admin.components.enrollmentPaidMonths.toast.markedPaid"), {
        description: "Attendance QR access updates for this student immediately.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record payment");
    } finally {
      setBusyMonth(null);
    }
  };

  if (record.status !== "APPROVED") return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Schedule month payments
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Students can scan attendance QR only for schedule months marked paid. When they submit a
          follow-up payment in the app, approve it under{" "}
          <Link
            to="/dashboard/admin/installment-payments"
            className="font-semibold text-[#3954d0] underline-offset-2 hover:underline"
          >
            Schedule month payments
          </Link>{" "}
          — or record a payment collected outside the app below (e.g. cash verified in person).
        </p>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading class schedule…
        </p>
      ) : scheduleTabs.length === 0 ? (
        <p className="text-xs text-slate-500">
          No schedule months on file. Paid months follow the enrollment plan until a schedule is
          published.
        </p>
      ) : (
        <>
          <div className="max-w-sm">
            <AdminActionCodeField
              id={`paid-months-admin-code-${record.id}`}
              value={adminActionCode}
              onChange={setAdminActionCode}
            />
          </div>
          <div className="space-y-2">
            {scheduleTabs.map((tab) => {
              const month = scheduleTabToPaymentMonths(tab.value);
              const checked = paidMonths.has(month);
              const pending = installments.find(
                (p) => p.scheduleMonth === month && p.status === "PENDING",
              );
              const checkboxId = `paid-month-${record.id}-${tab.value}`;
              return (
                <label
                  key={tab.value}
                  htmlFor={checkboxId}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                    checked
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-amber-200 bg-amber-50/40",
                  )}
                >
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    disabled={checked || busyMonth === month}
                    onCheckedChange={(value) => {
                      if (value === true) void recordPaid(month);
                    }}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium text-slate-900">{tab.tabLabel}</span>
                    {tab.monthLine ? (
                      <span className="mt-0.5 block text-xs text-slate-500">{tab.monthLine}</span>
                    ) : null}
                    <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                      {tab.slots.length} session{tab.slots.length === 1 ? "" : "s"}
                      {checked
                        ? " · QR check-in allowed"
                        : pending
                          ? " · payment submitted — awaiting review"
                          : t("admin.components.enrollmentPaidMonths.qrBlocked")}
                    </span>
                  </span>
                  {!checked && busyMonth === month ? (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden />
                  ) : null}
                </label>
              );
            })}
          </div>
        </>
      )}

      <p className="border-t border-slate-100 pt-2 text-xs text-slate-600">
        {paidMonthsSummary(paidMonths, scheduleTabs)}
        {hasPartialPlan ? (
          <span className="mt-1 block font-medium text-amber-900">
            Unpaid months are blocked from attendance QR until paid or recorded here.
          </span>
        ) : scheduleTabs.length > 0 ? (
          <span className="mt-1 block font-medium text-emerald-800">
            All schedule months are paid — full attendance access.
          </span>
        ) : null}
      </p>
    </div>
  );
}
