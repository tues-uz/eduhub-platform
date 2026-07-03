import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Eye, Loader2 } from "@/lib/icons";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminActionCodeField,
  useAdminActionCodeState,
} from "@/features/admin/components/AdminActionCodeField";
import { validateAdminActionCodeOrThrow } from "@/features/admin/adminStaffCode";
import { formatPaymentMethodLabel } from "@/features/enrollment/enrollmentDocumentConfig";
import {
  approveInstallmentPayment,
  rejectInstallmentPayment,
} from "@/features/enrollment/enrollmentInstallmentPayments";
import {
  useEnrollmentInstallmentPayments,
  type EnrollmentInstallmentPayment,
} from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import { formatEnrollmentMoney } from "@/features/enrollment/enrollmentPaymentDisplay";
import { cn } from "@/lib/utils";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Awaiting review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function statusLabel(status: EnrollmentInstallmentPayment["status"]): string {
  if (status === "PENDING") return "Awaiting review";
  if (status === "APPROVED") return "Approved";
  return "Rejected";
}

function statusClass(status: EnrollmentInstallmentPayment["status"]): string {
  if (status === "PENDING") return "bg-sky-50 text-sky-800 ring-sky-200/80";
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-800 ring-emerald-200/80";
  return "bg-red-50 text-red-800 ring-red-200/80";
}

function hasProofUrl(url: string | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

function PendingPaymentCard({
  payment,
  busy,
  onApprove,
  onReject,
}: {
  payment: EnrollmentInstallmentPayment;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation();
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Schedule month
            </p>
            <p className="mt-0.5 text-base font-semibold text-slate-900">{payment.scheduleMonthLabel}</p>
            <p className="mt-1 text-sm text-slate-600 line-clamp-2">{payment.courseTitle}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold tabular-nums tracking-tight text-[#3954d0]">
              {formatEnrollmentMoney(payment.amount, payment.currency)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{formatPaymentMethodLabel(payment.paymentMethod)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0 space-y-1 text-sm">
          <p className="font-medium text-slate-900">{payment.studentName}</p>
          <p className="text-xs text-slate-500">{payment.studentEmailNorm}</p>
          <p className="text-xs text-slate-500">Submitted {formatDate(payment.submittedAt)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {hasProofUrl(payment.paymentProofUrl) ? (
            <Button asChild size="sm" variant="outline" className="rounded-lg">
              <a href={payment.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                View proof
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline" className="rounded-lg">
            <Link
              to={`/dashboard/admin/enrollment-applications/${encodeURIComponent(payment.enrollmentApplicationId)}`}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Enrollment
            </Link>
          </Button>
          <Button size="sm" className="rounded-lg" disabled={busy} onClick={onApprove}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : t("admin.shared.approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg border-red-200 text-red-700 hover:bg-red-50"
            disabled={busy}
            onClick={onReject}
          >
            Reject
          </Button>
        </div>
      </div>
    </article>
  );
}

function HistoryPaymentRow({ payment }: { payment: EnrollmentInstallmentPayment }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-900">{payment.studentName}</p>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
              statusClass(payment.status),
            )}
          >
            {statusLabel(payment.status)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
          {payment.courseTitle} · {payment.scheduleMonthLabel}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">{formatShortDate(payment.submittedAt)}</p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
        <p className="text-sm font-semibold tabular-nums text-slate-900">
          {formatEnrollmentMoney(payment.amount, payment.currency)}
        </p>
        <div className="flex gap-2">
          {hasProofUrl(payment.paymentProofUrl) ? (
            <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-slate-600">
              <a href={payment.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                Proof
              </a>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-[#3954d0]">
            <Link
              to={`/dashboard/admin/enrollment-applications/${encodeURIComponent(payment.enrollmentApplicationId)}`}
            >
              Enrollment
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminInstallmentPaymentsPage() {
  const { t } = useTranslation();
  const payments = useEnrollmentInstallmentPayments();
  const [adminActionCode, setAdminActionCode] = useAdminActionCodeState();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<EnrollmentInstallmentPayment | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  const pending = useMemo(() => payments.filter((p) => p.status === "PENDING"), [payments]);
  const approved = useMemo(() => payments.filter((p) => p.status === "APPROVED"), [payments]);
  const rejected = useMemo(() => payments.filter((p) => p.status === "REJECTED"), [payments]);

  const filtered = useMemo(() => {
    if (statusFilter === "pending") return pending;
    if (statusFilter === "approved") return approved;
    if (statusFilter === "rejected") return rejected;
    return [...pending, ...approved, ...rejected].sort((a, b) =>
      b.submittedAt.localeCompare(a.submittedAt),
    );
  }, [statusFilter, pending, approved, rejected]);

  const counts: Record<StatusFilter, number> = {
    pending: pending.length,
    approved: approved.length,
    rejected: rejected.length,
    all: payments.length,
  };

  const handleApprove = async (payment: EnrollmentInstallmentPayment) => {
    let code: string;
    try {
      code = validateAdminActionCodeOrThrow(adminActionCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enter your admin code");
      return;
    }
    setBusyId(payment.id);
    try {
      const updated = approveInstallmentPayment(payment.id, code);
      if (!updated) throw new Error("Could not approve payment");
      toast.success(t("admin.installmentPayments.toast.approvedTitle"), {
        description: `${payment.scheduleMonthLabel} unlocked for QR attendance.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not approve");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    let code: string;
    try {
      code = validateAdminActionCodeOrThrow(adminActionCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enter your admin code");
      return;
    }
    setBusyId(rejectTarget.id);
    try {
      rejectInstallmentPayment(rejectTarget.id, rejectNote, code);
      toast.message(t("admin.installmentPayments.toast.rejectedTitle"), {
        description: "The student can submit again with corrected proof.",
      });
      setRejectTarget(null);
      setRejectNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reject");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-4xl px-6 pb-16">
        <Link
          to="/dashboard/admin/payments"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to payments
        </Link>

        <AdminPageHeader
          title={t("adminNav.scheduleMonthPayments")}
          description={t("admin.installmentPayments.description")}
        />

        <div className="mb-6 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === opt.value
                  ? "border-[#3954d0]/30 bg-[#3954d0]/[0.06] text-[#3954d0]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              {opt.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                  statusFilter === opt.value ? "bg-[#3954d0]/10" : "bg-slate-100 text-slate-500",
                )}
              >
                {counts[opt.value]}
              </span>
            </button>
          ))}
        </div>

        {statusFilter === "pending" && pending.length > 0 ? (
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 sm:px-5">
            <AdminActionCodeField
              id="installment-admin-code"
              value={adminActionCode}
              onChange={setAdminActionCode}
              className="max-w-sm"
            />
            <p className="mt-2 text-xs text-slate-500">
              Enter your code once, then approve or reject each payment below.
            </p>
          </div>
        ) : null}

        {payments.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-900">{t("admin.installmentPayments.empty.noneTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">
              When students pay a remaining schedule month, their transfer appears here for review.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-slate-600">{t("admin.installmentPayments.empty.noInView")}</p>
          </div>
        ) : statusFilter === "pending" ? (
          <div className="space-y-3">
            {filtered.map((p) => (
              <PendingPaymentCard
                key={p.id}
                payment={p}
                busy={busyId === p.id}
                onApprove={() => void handleApprove(p)}
                onReject={() => {
                  setRejectNote("");
                  setRejectTarget(p);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {statusFilter === "all" ? t("admin.shared.allPayments") : `${FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label} payments`}
              </p>
            </div>
            {filtered.map((p) => (
              <HistoryPaymentRow key={p.id} payment={p} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={rejectTarget != null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.installmentPayments.rejectDialog.title")}</DialogTitle>
          </DialogHeader>
          {rejectTarget ? (
            <p className="text-sm text-slate-600">
              {rejectTarget.studentName} · {rejectTarget.scheduleMonthLabel} ·{" "}
              {formatEnrollmentMoney(rejectTarget.amount, rejectTarget.currency)}
            </p>
          ) : null}
          <Textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder={t("admin.installmentPayments.rejectDialog.notePlaceholder")}
            className="min-h-[88px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busyId != null} onClick={() => void handleReject()}>
              Reject payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
