import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "@/lib/icons";
import { eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import { buildCourseScheduleSlots } from "@/features/courses/courseScheduleSlots";
import { formatPaymentMethodLabel } from "@/features/enrollment/enrollmentDocumentConfig";
import { ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED } from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import { ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED } from "@/features/admin/data/adminEnrollmentPaidMonthsStore";
import { formatEnrollmentMoney } from "@/features/enrollment/enrollmentPaymentDisplay";
import {
  buildEnrollmentMonthPaymentHistory,
  monthPaymentStatusLabel,
  type MonthPaymentStatus,
} from "@/features/enrollment/enrollmentPaymentHistory";
import { cn } from "@/lib/utils";

function formatSubmittedAt(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function statusClass(status: MonthPaymentStatus): string {
  if (status === "paid") return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
  if (status === "pending_review") return "bg-sky-50 text-sky-800 ring-sky-200/80";
  if (status === "rejected") return "bg-red-50 text-red-800 ring-red-200/80";
  return "bg-zinc-100 text-zinc-600 ring-zinc-200/80";
}

type Props = {
  record: EnrollmentApplicationResponse;
  variant: "admin" | "student";
  listedTuition?: number | null;
  className?: string;
};

export function EnrollmentPaymentHistorySection({
  record,
  variant,
  listedTuition,
  className,
}: Props) {
  const [loading, setLoading] = useState(Boolean(record.courseId && isUuid(record.courseId)));
  const [scheduleSlots, setScheduleSlots] = useState<ReturnType<typeof buildCourseScheduleSlots>>([]);
  const [resolvedTuition, setResolvedTuition] = useState<number | undefined>(
    listedTuition != null && listedTuition > 0 ? listedTuition : undefined,
  );
  const [currency, setCurrency] = useState(record.priceCurrency ?? "USD");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED, bump);
    window.addEventListener(ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED, bump);
    return () => {
      window.removeEventListener(ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED, bump);
      window.removeEventListener(ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED, bump);
    };
  }, []);

  useEffect(() => {
    if (listedTuition != null && listedTuition > 0) {
      setResolvedTuition(listedTuition);
    }
  }, [listedTuition]);

  useEffect(() => {
    void tick;
    if (!record.courseId || !isUuid(record.courseId)) {
      setScheduleSlots([]);
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
        setScheduleSlots(slots);
        if (listedTuition == null || listedTuition <= 0) {
          const amt = course.pricing?.discountedAmount ?? course.pricing?.amount;
          setResolvedTuition(amt != null && amt > 0 ? amt : undefined);
        }
        setCurrency(course.pricing?.currency ?? record.priceCurrency ?? "USD");
      })
      .catch(() => {
        if (!cancelled) setScheduleSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [record.courseId, record.priceCurrency, listedTuition, tick]);

  const rows = useMemo(
    () =>
      buildEnrollmentMonthPaymentHistory({
        enrollment: record,
        scheduleSlots,
        listedTuition: resolvedTuition,
        currency,
      }),
    [record, scheduleSlots, resolvedTuition, currency, tick],
  );

  const hasFollowUp = rows.some((r) => r.source === "installment");
  const showSection =
    record.status === "APPROVED" &&
    (record.paymentPlan === "DOWN_PAYMENT" || record.installmentCount != null || hasFollowUp);

  if (!showSection) return null;

  const isAdmin = variant === "admin";

  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide",
            isAdmin ? "text-slate-500" : "text-zinc-400",
          )}
        >
          Schedule month payments
        </p>
        <p className={cn("mt-1 text-xs leading-relaxed", isAdmin ? "text-slate-600" : "text-zinc-500")}>
          {isAdmin
            ? "Initial enrollment covers the first month. Follow-up transfers for later months appear here after the student submits them in the app."
            : "Each row is one schedule month. Follow-up payments you submit after enrollment appear here with their review status."}
        </p>
      </div>

      {loading ? (
        <p className={cn("flex items-center gap-2 text-xs", isAdmin ? "text-slate-500" : "text-zinc-500")}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Loading schedule…
        </p>
      ) : rows.length === 0 ? (
        <p className={cn("text-xs", isAdmin ? "text-slate-500" : "text-zinc-500")}>
          No schedule months on file yet.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.month}
              className={cn(
                "rounded-lg border px-3 py-3 sm:px-4",
                isAdmin ? "border-slate-200 bg-slate-50/50" : "border-zinc-200 bg-zinc-50/50",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                <div className="min-w-0">
                  <p className={cn("text-sm font-medium", isAdmin ? "text-slate-900" : "text-zinc-900")}>
                    {row.tabLabel}
                  </p>
                  {row.monthLine ? (
                    <p className={cn("mt-0.5 text-xs", isAdmin ? "text-slate-500" : "text-zinc-500")}>
                      {row.monthLine}
                    </p>
                  ) : null}
                  <p className={cn("mt-1 text-[11px]", isAdmin ? "text-slate-500" : "text-zinc-500")}>
                    {row.source === "enrollment" ? "Initial enrollment payment" : "Follow-up payment"}
                    {row.paymentMethod ? ` · ${formatPaymentMethodLabel(row.paymentMethod)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {row.amount != null && row.amount > 0 ? (
                    <p className="text-sm font-semibold tabular-nums text-[#3954d0]">
                      {formatEnrollmentMoney(row.amount, row.currency)}
                    </p>
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                      statusClass(row.status),
                    )}
                  >
                    {monthPaymentStatusLabel(row.status)}
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  "mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-2.5 text-[11px]",
                  isAdmin ? "border-slate-200 text-slate-500" : "border-zinc-200 text-zinc-500",
                )}
              >
                <span>Submitted {formatSubmittedAt(row.submittedAt)}</span>
                {isAdmin && row.proofUrl && /^https?:\/\//i.test(row.proofUrl) ? (
                  <a
                    href={row.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#3954d0] hover:underline"
                  >
                    Open proof
                  </a>
                ) : null}
                {row.status === "pending_review" && isAdmin ? (
                  <Link
                    to="/dashboard/admin/installment-payments"
                    className="font-medium text-[#3954d0] hover:underline"
                  >
                    Review in queue
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
