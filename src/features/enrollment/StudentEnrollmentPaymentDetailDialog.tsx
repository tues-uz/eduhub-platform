import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  XCircle,
} from "@/lib/icons";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { eduhubCourses } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { InstructorAvatar } from "@/components/InstructorAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  enrollmentRequiresVerificationUploads,
  formatPaymentMethodLabel,
} from "@/features/enrollment/enrollmentDocumentConfig";
import {
  enrichEnrollmentApplication,
  hasOfficialEnrollmentDocuments,
} from "@/features/enrollment/enrollmentDocuments";
import {
  enrollmentPaymentPlanLabel,
  enrollmentScheduleScopeLine,
  formatEnrollmentMoney,
} from "@/features/enrollment/enrollmentPaymentDisplay";
import { cn } from "@/lib/utils";
import { formatDisplayPersonName } from "@/lib/formatPersonName";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";

const TEACHER_PREFIX = "teacher_";

function formatDetailDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const STATUS_CONFIG: Record<
  EnrollmentApplicationResponse["status"],
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
    Icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending review",
    className: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80",
    Icon: Clock,
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-50 text-red-800 ring-1 ring-red-200/80",
    Icon: XCircle,
  },
};

/** Inset card: equal padding on all sides; children spaced with gap. */
const STACK_CARD = "flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3";
const STACK_CARD_WHITE = "flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3";

/** Soft tinted icon badge for detail rows. */
type DetailRowTone = "blue" | "emerald" | "violet" | "sky" | "teal" | "amber" | "rose";

const detailRowToneClass: Record<DetailRowTone, string> = {
  blue: "bg-blue-50 text-blue-600 ring-1 ring-blue-100/80",
  emerald: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100/80",
  violet: "bg-violet-50 text-violet-600 ring-1 ring-violet-100/80",
  sky: "bg-sky-50 text-sky-600 ring-1 ring-sky-100/80",
  teal: "bg-teal-50 text-teal-600 ring-1 ring-teal-100/80",
  amber: "bg-amber-50 text-amber-600 ring-1 ring-amber-100/80",
  rose: "bg-rose-50 text-rose-600 ring-1 ring-rose-100/80",
};

function DetailRow({
  icon: Icon,
  label,
  children,
  mono,
  tone = "blue",
}: {
  icon: typeof Calendar;
  label: string;
  children: ReactNode;
  mono?: boolean;
  tone?: DetailRowTone;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          detailRowToneClass[tone],
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500">{label}</p>
        <div
          className={cn(
            "mt-0.5 text-sm font-semibold text-zinc-900",
            mono && "font-mono text-[13px] tracking-tight",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function paymentAmountLabel(r: EnrollmentApplicationResponse): string | null {
  const cur = r.priceCurrency ?? "USD";
  if (r.downPaymentAmount != null && r.downPaymentAmount > 0) {
    return formatEnrollmentMoney(r.downPaymentAmount, cur);
  }
  if (r.amountPaid != null && r.amountPaid > 0) {
    return formatEnrollmentMoney(r.amountPaid, cur);
  }
  return null;
}

function isHttpUrl(u: string | undefined): boolean {
  return Boolean(u && /^https?:\/\//i.test(u.trim()));
}

function VerificationDocumentRow({
  icon: Icon,
  label,
  url,
  tone = "blue",
}: {
  icon: typeof FileText;
  label: string;
  url?: string;
  tone?: DetailRowTone;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          detailRowToneClass[tone],
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500">{label}</p>
        {isHttpUrl(url) ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-[#3954d0] hover:underline"
          >
            Open uploaded file
          </a>
        ) : (
          <p className="mt-0.5 text-sm text-zinc-600">Uploaded with your application</p>
        )}
      </div>
    </div>
  );
}

type Props = {
  record: EnrollmentApplicationResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
  downloadLoading?: boolean;
};

function PaymentDetailDialogBody({
  r,
  onDownload,
  downloadLoading,
  onOpenChange,
}: {
  r: EnrollmentApplicationResponse;
  onDownload: () => void;
  downloadLoading: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const enriched = enrichEnrollmentApplication(r);
  const status = STATUS_CONFIG[enriched.status];
  const StatusIcon = status.Icon;
  const hasOfficial = hasOfficialEnrollmentDocuments(enriched);
  const amount = paymentAmountLabel(enriched);
  const scheduleScope = enrollmentScheduleScopeLine(enriched);
  const planLabel = enrollmentPaymentPlanLabel(enriched.paymentPlan);
  const planDetail =
    enriched.paymentPlan === "DOWN_PAYMENT" && enriched.installmentCount != null
      ? `${enriched.installmentCount} instalments`
      : null;
  const methodLabel = enriched.paymentMethod
    ? formatPaymentMethodLabel(enriched.paymentMethod)
    : null;

  const [instructor, setInstructor] = useState<{ name: string; avatarUrl?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const courseId = enriched.courseId;

    async function loadInstructor() {
      if (courseId.startsWith(TEACHER_PREFIX)) {
        const tc = teacherCoursesStore.getById(courseId.slice(TEACHER_PREFIX.length));
        if (!cancelled) {
          setInstructor(
            tc?.instructorName?.trim()
              ? { name: tc.instructorName.trim(), avatarUrl: tc.instructorAvatarUrl?.trim() || undefined }
              : null,
          );
        }
        return;
      }

      if (!isUuid(courseId)) {
        if (!cancelled) setInstructor(null);
        return;
      }

      try {
        const course = await eduhubCourses.getById(courseId);
        const name = course.lecturer?.fullName?.trim();
        if (!cancelled) {
          setInstructor(
            name
              ? { name, avatarUrl: course.lecturer?.avatarUrl?.trim() || undefined }
              : null,
          );
        }
      } catch {
        if (!cancelled) setInstructor(null);
      }
    }

    void loadInstructor();
    return () => {
      cancelled = true;
    };
  }, [enriched.courseId]);

  const showHeaderDivider = Boolean(amount || instructor);

  return (
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[calc(100dvh-64px)] sm:w-full sm:max-w-[440px] sm:rounded-2xl [&>button]:inline-flex [&>button]:h-8 [&>button]:w-8 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:border [&>button]:border-zinc-200 [&>button]:bg-white [&>button]:opacity-100 [&>button]:shadow-sm [&>button]:hover:bg-zinc-50">
        <DialogHeader className="flex shrink-0 flex-col gap-4 border-b border-zinc-100 bg-zinc-50/80 p-4 text-left">
          <div className="flex min-w-0 flex-col gap-1.5 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-lg font-semibold leading-snug text-zinc-900">
                {enriched.courseTitle ?? enriched.courseId}
              </DialogTitle>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  status.className,
                )}
              >
                <StatusIcon className="h-3.5 w-3.5" aria-hidden />
                {status.label}
              </span>
            </div>
            <DialogDescription className="mt-0 text-sm text-zinc-600">
              Enrollment & payment details
            </DialogDescription>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm">
            {amount ? (
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs font-medium text-zinc-500">Amount</p>
                <p className="text-xl font-semibold tabular-nums tracking-tight text-zinc-900">
                  {amount}
                </p>
              </div>
            ) : null}
            {instructor ? (
              <div
                className={cn(
                  "flex items-center gap-2.5",
                  amount ? "border-t border-zinc-100 pt-4" : "",
                )}
              >
                <InstructorAvatar
                  name={instructor.name}
                  avatarUrl={instructor.avatarUrl}
                  className="h-8 w-8"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-zinc-500">Instructor</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">
                    {formatDisplayPersonName(instructor.name)}
                  </p>
                </div>
              </div>
            ) : null}
            <div
              className={cn(
                "grid grid-cols-2 gap-4",
                showHeaderDivider ? "border-t border-zinc-100 pt-4" : "",
              )}
            >
              <div>
                <p className="text-[11px] font-medium text-zinc-500">Payment plan</p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-900">{planLabel}</p>
                {planDetail ? (
                  <p className="mt-0.5 text-xs text-zinc-500">{planDetail}</p>
                ) : null}
              </div>
              {methodLabel ? (
                <div>
                  <p className="text-[11px] font-medium text-zinc-500">Method</p>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                    <CreditCard className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                    {methodLabel}
                  </p>
                </div>
              ) : (
                <div />
              )}
            </div>
            {scheduleScope ? (
              <p className="border-t border-zinc-100 pt-4 text-xs leading-relaxed text-zinc-600">
                {scheduleScope}
              </p>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4">
          {hasOfficial && (enriched.invoiceNumber || enriched.receiptNumber) ? (
            <section className="mb-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Official documents
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {enriched.invoiceNumber ? (
                  <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
                    <p className="text-[11px] font-medium text-zinc-500">Invoice</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-zinc-900" title={enriched.invoiceNumber}>
                      {enriched.invoiceNumber}
                    </p>
                  </div>
                ) : null}
                {enriched.receiptNumber ? (
                  <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
                    <p className="text-[11px] font-medium text-zinc-500">Receipt</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-zinc-900" title={enriched.receiptNumber}>
                      {enriched.receiptNumber}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : enriched.status === "PENDING" ? (
            <p className="mb-5 rounded-xl bg-amber-50/80 px-3.5 py-3 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-200/60">
              Invoice and receipt numbers are issued after the school approves your application.
            </p>
          ) : null}

          <section className="mb-5">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Timeline
            </h3>
            <div className={STACK_CARD}>
              <DetailRow icon={Calendar} label="Submitted" tone="blue">
                {formatDetailDate(r.submittedAt)}
              </DetailRow>
              {r.reviewedAt ? (
                <DetailRow icon={CheckCircle2} label="Reviewed" tone="emerald">
                  {formatDetailDate(r.reviewedAt)}
                </DetailRow>
              ) : null}
            </div>
          </section>

          <section className="mb-5">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Your details
            </h3>
            <div className={STACK_CARD}>
              <DetailRow icon={User} label="Name" tone="violet">
                {r.fullName}
              </DetailRow>
              <DetailRow icon={Mail} label="Email" tone="sky">
                {r.email}
              </DetailRow>
              <DetailRow icon={Phone} label="Phone" tone="teal">
                {r.phone}
                {r.phoneSecondary ? (
                  <span className="block text-zinc-600">{r.phoneSecondary}</span>
                ) : null}
              </DetailRow>
              <DetailRow icon={MapPin} label="Address" tone="amber">
                <span className="whitespace-pre-wrap font-semibold capitalize leading-relaxed">
                  {r.address}
                </span>
              </DetailRow>
            </div>
          </section>

          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Verification documents
            </h3>
            {enrollmentRequiresVerificationUploads(enriched.paymentMethod) ? (
              <div className={STACK_CARD_WHITE}>
                <VerificationDocumentRow
                  icon={FileText}
                  label="Payment proof"
                  url={enriched.paymentProofUrl}
                  tone="blue"
                />
                <VerificationDocumentRow
                  icon={IdCard}
                  label="ID document"
                  url={enriched.idCardUrl}
                  tone="violet"
                />
              </div>
            ) : (
              <p className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm text-zinc-600">
                {formatPaymentMethodLabel(enriched.paymentMethod)} — no transfer proof or ID upload
                required.
              </p>
            )}
          </section>

          {r.adminNote?.trim() ? (
            <section className="mt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Note from school
              </h3>
              <p className="rounded-xl bg-blue-50/60 px-3.5 py-3 text-sm leading-relaxed text-zinc-800 ring-1 ring-blue-100">
                {r.adminNote.trim()}
              </p>
            </section>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-[#3954d0] text-sm font-medium hover:bg-[#2f47b3]"
            disabled={downloadLoading}
            onClick={onDownload}
          >
            {downloadLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-2 h-4 w-4" aria-hidden />
            )}
            {downloadLoading
              ? "Preparing PDF…"
              : hasOfficial
                ? "Download Invoice"
                : "Download submission summary"}
          </Button>
        </div>
      </DialogContent>
  );
}

export function StudentEnrollmentPaymentDetailDialog({
  record,
  open,
  onOpenChange,
  onDownload,
  downloadLoading = false,
}: Props) {
  return (
    <Dialog open={open && record != null} onOpenChange={onOpenChange}>
      {record ? (
        <PaymentDetailDialogBody
          r={record}
          onDownload={onDownload}
          downloadLoading={downloadLoading}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  );
}
