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
  scheduleTabToPaymentMonths,
} from "@/features/courses/classSchedulePreview";
import { Link } from "react-router-dom";
import { adminEnrollmentPaidMonthsStore } from "@/features/admin/data/adminEnrollmentPaidMonthsStore";
import { enrollmentInstallmentPaymentStore } from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import {
  paidMonthsSummary,
  resolvePaidTuitionMonths,
} from "@/features/enrollment/enrollmentPaidMonths";
import type { TuitionPlanMonths } from "@/features/enrollment/enrollmentTuitionThirds";
import { cn } from "@/lib/utils";

type Props = {
  record: EnrollmentApplicationResponse;
};

export function AdminEnrollmentPaidMonthsPanel({ record }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(Boolean(record.courseId && isUuid(record.courseId)));
  const [paidMonths, setPaidMonths] = useState<Set<TuitionPlanMonths>>(() => new Set());
  const [scheduleTabs, setScheduleTabs] = useState<ReturnType<typeof buildScheduleMonthTabs>>([]);

  useEffect(() => {
    if (!record.courseId || !isUuid(record.courseId)) {
      setScheduleTabs([]);
      setLoading(false);
      const fallback = resolvePaidTuitionMonths(record, [], record.id);
      setPaidMonths(fallback ?? new Set());
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
        const tabs = buildScheduleMonthTabs(ordered);
        setScheduleTabs(tabs);
        const resolved = resolvePaidTuitionMonths(record, ordered, record.id);
        setPaidMonths(resolved ?? new Set());
      })
      .catch(() => {
        if (!cancelled) {
          const resolved = resolvePaidTuitionMonths(record, [], record.id);
          setPaidMonths(resolved ?? new Set());
          setScheduleTabs([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [record]);

  useEffect(() => {
    const sync = () => {
      const override = adminEnrollmentPaidMonthsStore.get(record.id);
      if (override) setPaidMonths(new Set(override));
    };
    window.addEventListener("eduhub-enrollment-paid-months-changed", sync);
    return () => window.removeEventListener("eduhub-enrollment-paid-months-changed", sync);
  }, [record.id]);

  const hasPartialPlan = useMemo(
    () => scheduleTabs.length > 0 && paidMonths.size < scheduleTabs.length,
    [paidMonths.size, scheduleTabs.length],
  );

  const toggleMonth = (month: TuitionPlanMonths, checked: boolean) => {
    const next = new Set(paidMonths);
    if (checked) next.add(month);
    else next.delete(month);
    if (!next.size) {
      toast.error(t("admin.components.enrollmentPaidMonths.toast.minOneMonth"));
      return;
    }
    setPaidMonths(next);
    adminEnrollmentPaidMonthsStore.set(record.id, next, {
      courseId: record.courseId,
      studentEmailNorm: record.applicantEmailNorm,
    });
    toast.success(checked ? t("admin.components.enrollmentPaidMonths.toast.markedPaid") : "Schedule month marked unpaid", {
      description: "Attendance QR access updates for this student immediately.",
    });
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
          — or toggle months manually here after verifying a transfer.
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
        <div className="space-y-2">
          {scheduleTabs.map((tab) => {
            const month = scheduleTabToPaymentMonths(tab.value);
            const checked = paidMonths.has(month);
            const pending = enrollmentInstallmentPaymentStore.findPendingForMonth(record.id, month);
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
                  onCheckedChange={(value) => toggleMonth(month, value === true)}
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
              </label>
            );
          })}
        </div>
      )}

      <p className="border-t border-slate-100 pt-2 text-xs text-slate-600">
        {paidMonthsSummary(paidMonths, scheduleTabs)}
        {hasPartialPlan ? (
          <span className="mt-1 block font-medium text-amber-900">
            Unpaid months are blocked from attendance QR until you mark them paid here.
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
