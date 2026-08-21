import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  ArrowLeft,
  Banknotes,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck,
  Loader2,
  Upload,
} from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { eduhubCourses, eduhubEnrollmentApplications, eduhubSchedule, eduhubUploadFile } from "@/api/eduhubClient";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import { buildCourseScheduleSlots } from "@/features/courses/courseScheduleSlots";
import {
  buildScheduleMonthTabs,
  orderSessionSlotsChronologically,
  type ScheduleMonthTab,
} from "@/features/courses/classSchedulePreview";
import { useAuthSession } from "@/features/auth/context";
import { EnrollmentBankTransferPanel } from "@/features/enrollment/EnrollmentBankTransferPanel";
import {
  DEFAULT_ENROLLMENT_PAYMENT_METHOD,
  enrollmentRequiresVerificationUploads,
  type EnrollmentPaymentMethod,
} from "@/features/enrollment/enrollmentDocumentConfig";
import {
  buildPayableScheduleMonths,
  unpaidPayableMonths,
  type PayableScheduleMonth,
} from "@/features/enrollment/enrollmentInstallmentPayments";
import { enrollmentInstallmentPaymentStore } from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import type { TuitionPlanMonths } from "@/features/enrollment/enrollmentTuitionThirds";
import { cn } from "@/lib/utils";

const PROOF_MAX_BYTES = 2 * 1024 * 1024;

function formatPrice(price: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

function parseMonthParam(raw: string | null): TuitionPlanMonths | null {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

function paymentMethodLabel(method: EnrollmentPaymentMethod, t: TFunction): string {
  return method === "CASH"
    ? t("installmentPayment.paymentMethodCash")
    : t("installmentPayment.paymentMethodTransfer");
}

function scheduleMonthProgressLabel(
  months: PayableScheduleMonth[],
  scheduleTabs: ScheduleMonthTab[],
  t: TFunction,
): string {
  const paidCount = months.filter((m) => m.state === "paid").length;
  const total = scheduleTabs.length || months.length;
  if (total <= 0) return t("installmentPayment.scheduleMonths");
  if (paidCount >= total) return t("installmentPayment.progressAllPaid", { count: total });
  return t("installmentPayment.progressPartial", { paid: paidCount, total });
}

export default function StudentInstallmentPaymentPage() {
  const { t } = useTranslation();
  const { applicationId } = useParams<{ applicationId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuthSession();
  const emailNorm = (user.email ?? "").trim().toLowerCase();

  const [application, setApplication] = useState<EnrollmentApplicationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [listedTuition, setListedTuition] = useState<number | undefined>();
  const [currency, setCurrency] = useState("USD");
  const [scheduleSlots, setScheduleSlots] = useState<ReturnType<typeof buildCourseScheduleSlots>>([]);

  const [selectedMonth, setSelectedMonth] = useState<TuitionPlanMonths | null>(
    () => parseMonthParam(searchParams.get("month")),
  );
  const [paymentMethod, setPaymentMethod] = useState<EnrollmentPaymentMethod>(DEFAULT_ENROLLMENT_PAYMENT_METHOD);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const requiresVerificationUploads = enrollmentRequiresVerificationUploads(paymentMethod);

  useEffect(() => {
    if (!applicationId || !emailNorm) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    eduhubEnrollmentApplications
      .getMy(emailNorm)
      .then(async (apps) => {
        if (cancelled) return;
        const app = apps.find((a) => a.id === applicationId);
        if (!app || app.status !== "APPROVED") {
          setApplication(null);
          return;
        }
        setApplication(app);
        setCurrency(app.priceCurrency ?? "USD");
        if (!app.courseId || !isUuid(app.courseId)) {
          setScheduleSlots([]);
          return;
        }
        const [course, proposal] = await Promise.all([
          eduhubCourses.getById(app.courseId),
          eduhubSchedule.getProposal(app.courseId).catch(() => null),
        ]);
        if (cancelled) return;
        const slots = buildCourseScheduleSlots(course, proposal, app.courseId);
        setScheduleSlots(slots);
        const amt = course.pricing?.discountedAmount ?? course.pricing?.amount;
        setListedTuition(amt != null && amt > 0 ? amt : undefined);
        setCurrency(course.pricing?.currency ?? app.priceCurrency ?? "USD");
      })
      .catch(() => {
        if (!cancelled) setApplication(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId, emailNorm]);

  const orderedSlots = useMemo(
    () => orderSessionSlotsChronologically(scheduleSlots),
    [scheduleSlots],
  );
  const scheduleTabs = useMemo(() => buildScheduleMonthTabs(orderedSlots), [orderedSlots]);

  const payableMonths = useMemo(() => {
    if (!application) return [];
    return buildPayableScheduleMonths({
      enrollment: application,
      scheduleSlots: orderedSlots,
      listedTuition,
      currency,
    });
  }, [application, orderedSlots, listedTuition, currency]);

  const outstanding = useMemo(() => unpaidPayableMonths(payableMonths), [payableMonths]);
  const selectedRow = payableMonths.find((m) => m.month === selectedMonth);

  useEffect(() => {
    if (selectedMonth && payableMonths.some((m) => m.month === selectedMonth)) return;
    const firstPayable = outstanding.find((m) => m.state === "payable");
    if (firstPayable) setSelectedMonth(firstPayable.month);
    else if (outstanding[0]) setSelectedMonth(outstanding[0].month);
  }, [outstanding, payableMonths, selectedMonth]);

  const trySetProofFile = useCallback((file: File | null) => {
    if (!file) {
      setProofFile(null);
      return;
    }
    if (file.size > PROOF_MAX_BYTES) {
      toast.error(t("installmentPayment.toast.proofTooLarge"));
      return;
    }
    setProofFile(file);
  }, [t]);

  const handleSubmit = async () => {
    if (!application || !selectedRow) return;
    if (selectedRow.state === "paid") {
      toast.message(t("installmentPayment.toast.alreadyPaid"));
      return;
    }
    if (selectedRow.state === "pending_review") {
      toast.message(t("installmentPayment.toast.alreadyPending"));
      return;
    }
    if (requiresVerificationUploads && !proofFile) {
      toast.error(t("installmentPayment.toast.uploadReceiptRequired"));
      return;
    }

    setSubmitting(true);
    try {
      let proofUrl: string | undefined;
      if (requiresVerificationUploads && proofFile) {
        toast.loading(t("installmentPayment.toast.uploadingReceipt"), { id: "installment-upload" });
        const result = await eduhubUploadFile(proofFile, "enrollment-proofs");
        toast.dismiss("installment-upload");
        proofUrl = result.url;
      }

      await enrollmentInstallmentPaymentStore.submit(application.id, {
        scheduleMonth: selectedRow.month,
        amount: selectedRow.amount,
        currency: selectedRow.currency,
        paymentMethod,
        paymentProofUrl: proofUrl,
      });

      setSubmitted(true);
      toast.success(t("installmentPayment.toast.submitted"), {
        description: t("installmentPayment.toast.submittedHint"),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("installmentPayment.toast.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        <span className="ml-2 text-sm text-zinc-500">{t("installmentPayment.loading")}</span>
      </div>
    );
  }

  if (!applicationId || !application) {
    return <Navigate to="/dashboard/payment" replace />;
  }

  if (submitted && selectedRow) {
    const monthLabel = selectedRow.monthLine || selectedRow.tabLabel;
    return (
      <div className="mx-auto max-w-2xl pb-12" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <Link
          to="/dashboard/payment"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Payment history
        </Link>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3954d0]">
            Remaining tuition
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">Payment recorded</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {application.courseTitle ?? application.courseId} · {monthLabel}
          </p>
        </div>

        <article className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-4 py-3.5 sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50">
                <Clock className="h-4 w-4 text-sky-700" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">Awaiting school review</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  Finance will confirm your transfer. QR attendance unlocks for this month once approved.
                </p>
              </div>
            </div>
          </div>
          <dl className="divide-y divide-zinc-100 px-4 sm:px-5">
            <div className="flex items-baseline justify-between gap-4 py-3 text-sm">
              <dt className="text-zinc-500">Schedule month</dt>
              <dd className="text-right font-medium text-zinc-900">{monthLabel}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3 text-sm">
              <dt className="text-zinc-500">Amount</dt>
              <dd className="text-right font-semibold tabular-nums text-zinc-900">
                {formatPrice(selectedRow.amount, selectedRow.currency)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3 text-sm">
              <dt className="text-zinc-500">Status</dt>
              <dd className="text-right text-[13px] font-medium text-sky-700">Pending verification</dd>
            </div>
          </dl>
        </article>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            asChild
            className="h-11 rounded-xl bg-[#3954d0] text-sm font-semibold hover:bg-[#2f47b3]"
          >
            <Link to="/dashboard/payment">Back to payment history</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link to={`/dashboard/courses/${encodeURIComponent(application.courseId)}?tab=attendance`}>
              Open class
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const allPaid = outstanding.length === 0 || payableMonths.every((m) => m.state === "paid");
  const paidCount = payableMonths.filter((m) => m.state === "paid").length;

  if (allPaid) {
    return (
      <div className="mx-auto max-w-2xl pb-12" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <Link
          to="/dashboard/payment"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Payment history
        </Link>

        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3954d0]">
            Remaining tuition
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">All months paid</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {application.courseTitle ?? application.courseId} — full attendance access is active.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm sm:px-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            <p className="text-sm text-zinc-600">
              No further tuition is due for this class. You can scan QR attendance for every schedule month.
            </p>
          </div>
        </div>

        <Button asChild className="mt-6 h-11 rounded-xl" variant="outline">
          <Link to="/dashboard/payment">Back to payment history</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-12" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Link
        to="/dashboard/payment"
        className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Payment history
      </Link>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3954d0]">
          Remaining tuition
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Pay a schedule month
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {application.courseTitle ?? application.courseId} ·{" "}
          {scheduleMonthProgressLabel(payableMonths, scheduleTabs, t)}
        </p>
      </div>

      {scheduleTabs.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50/60 px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-xs text-zinc-600">
            <span className="font-medium text-zinc-800">Payment progress</span>
            <span className="tabular-nums">
              {paidCount}/{scheduleTabs.length} months
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-[#3954d0] transition-all duration-300"
              style={{ width: `${scheduleTabs.length ? (paidCount / scheduleTabs.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      ) : null}

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Choose a month to pay</h2>
        <p className="text-xs text-zinc-500">
          Select the schedule month you are transferring tuition for. Attendance QR unlocks after admin
          verifies your payment.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {payableMonths.map((row) => {
            const isSelected = selectedMonth === row.month;
            const disabled = row.state === "paid";
            return (
              <button
                key={row.month}
                type="button"
                disabled={disabled}
                onClick={() => setSelectedMonth(row.month)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-colors",
                  disabled && "cursor-not-allowed opacity-60",
                  isSelected
                    ? "border-[#3954d0]/45 bg-[#3954d0]/[0.06] ring-1 ring-[#3954d0]/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300",
                  row.state === "pending_review" && !disabled && "border-amber-200 bg-amber-50/50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{row.tabLabel}</p>
                    {row.monthLine ? (
                      <p className="mt-0.5 text-xs text-zinc-500">{row.monthLine}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {row.sessionCount} session{row.sessionCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-[#3954d0]">
                    {formatPrice(row.amount, row.currency)}
                  </p>
                </div>
                {row.state === "paid" ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Paid · QR allowed
                  </span>
                ) : row.state === "pending_review" ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-800">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    Awaiting admin review
                  </span>
                ) : (
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    Pay to unlock QR
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {selectedRow && selectedRow.state === "payable" ? (
        <form
          className="mt-8 space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Amount due</p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-zinc-900">
              {formatPrice(selectedRow.amount, selectedRow.currency)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              For {selectedRow.monthLine || selectedRow.tabLabel} · {selectedRow.sessionCount} sessions
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-zinc-900">How did you pay?</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as EnrollmentPaymentMethod)}
              className="grid gap-2 sm:grid-cols-2"
            >
              {(["BANK_TRANSFER", "CASH"] as const).map((method) => (
                <label
                  key={method}
                  htmlFor={`pay-method-${method}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3",
                    paymentMethod === method
                      ? "border-[#3954d0]/40 bg-[#3954d0]/[0.05]"
                      : "border-zinc-200 bg-white",
                  )}
                >
                  <RadioGroupItem id={`pay-method-${method}`} value={method} />
                  <span className="text-sm font-medium text-zinc-900">
                    {paymentMethodLabel(method, t)}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {requiresVerificationUploads ? (
            <>
              <div>
                <div className="flex items-center gap-2">
                  <Banknotes className="h-4 w-4 text-zinc-500" aria-hidden />
                  <h2 className="text-sm font-semibold text-zinc-900">Bank transfer details</h2>
                </div>
                <EnrollmentBankTransferPanel className="mt-4" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-zinc-500" aria-hidden />
                  <h2 className="text-sm font-semibold text-zinc-900">Transfer receipt</h2>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Screenshot or PDF showing the completed transfer.</p>
                <div className="mt-4">
                  {proofFile ? (
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <FileCheck className="h-5 w-5 text-emerald-700" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">{proofFile.name}</p>
                        <p className="text-xs text-zinc-500">{(proofFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProofFile(null);
                          if (proofInputRef.current) proofInputRef.current.value = "";
                        }}
                      >
                        Replace
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="installment-proof"
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-8 text-center hover:border-[#3954d0]/40"
                    >
                      <input
                        ref={proofInputRef}
                        id="installment-proof"
                        type="file"
                        accept="image/*,.pdf"
                        className="sr-only"
                        onChange={(e) => trySetProofFile(e.target.files?.[0] ?? null)}
                      />
                      <Upload className="h-6 w-6 text-[#3954d0]" aria-hidden />
                      <span className="text-sm font-medium text-zinc-900">Upload receipt</span>
                      <span className="text-xs text-zinc-500">PNG, JPG, or PDF · max 2 MB</span>
                    </label>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Pay {formatPrice(selectedRow.amount, selectedRow.currency)} in cash at the school office,
              then submit so finance can confirm and unlock attendance.
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-xl bg-[#3954d0] text-sm font-semibold hover:bg-[#2f47b3]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Submitting…
              </>
            ) : (
              `Submit payment for ${selectedRow.tabLabel}`
            )}
          </Button>
        </form>
      ) : selectedRow?.state === "pending_review" ? (
        <article className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-4 py-3.5 sm:px-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50">
                <Clock className="h-4 w-4 text-sky-700" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">Awaiting school review</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  Your transfer for {selectedRow.monthLine || selectedRow.tabLabel} is pending verification.
                  QR attendance unlocks once finance approves it.
                </p>
              </div>
            </div>
          </div>
          <div className="px-4 py-3.5 sm:px-5">
            <Button asChild variant="outline" className="h-10 rounded-xl">
              <Link to="/dashboard/payment">Back to payment history</Link>
            </Button>
          </div>
        </article>
      ) : null}
    </div>
  );
}
