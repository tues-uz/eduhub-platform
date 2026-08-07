import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Loader2, Receipt, Search, ChevronDown } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudentEnrollmentPaymentDetailDialog } from "@/features/enrollment/StudentEnrollmentPaymentDetailDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthSession } from "@/features/auth/context";
import { ensureEnrollmentDocuments } from "@/features/enrollment/enrollmentApproval";
import {
  buildEnrollmentReceiptPdfData,
  downloadEnrollmentReceiptPdf,
} from "@/features/enrollment/enrollmentReceiptPdf";
import {
  enrichEnrollmentApplication,
  enrichEnrollmentApplications,
} from "@/features/enrollment/enrollmentDocuments";
import { eduhubCourses, eduhubEnrollmentApplications, eduhubSchedule } from "@/api/eduhubClient";
import { buildCourseScheduleSlots } from "@/features/courses/courseScheduleSlots";
import type { SessionSlotLike } from "@/features/courses/classSchedulePreview";
import type { EnrollmentApplicationResponse, EnrollmentApplicationStatus } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { OutstandingTuitionSection } from "@/features/enrollment/OutstandingTuitionSection";
import { TrialEnrollmentReminderSection } from "@/features/enrollment/TrialEnrollmentReminderSection";
import { EnrollmentTrialBadge } from "@/features/enrollment/EnrollmentTrialBadge";
import {
  enrollmentHasTrialCode,
  formatEnrollmentTrialCode,
} from "@/features/enrollment/enrollmentTrial";
import { enrollmentPaymentPlanLabelForRecord } from "@/features/enrollment/enrollmentPaymentDisplay";

type PaymentStatusFilter = "all" | EnrollmentApplicationStatus;

function formatMoney(price: number | undefined, currency = "USD"): string {
  if (price == null || price <= 0) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

function formatSubmittedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function planSummary(r: EnrollmentApplicationResponse, t: TFunction): string {
  const label = enrollmentPaymentPlanLabelForRecord(r);
  if (r.paymentPlan === "DOWN_PAYMENT") {
    const amt = formatMoney(r.downPaymentAmount, r.priceCurrency ?? "USD");
    const inst =
      r.installmentCount != null ? t("payment.installmentsLeft", { count: r.installmentCount }) : "";
    return amt !== "—" ? `${label} ${amt}${inst}` : `${label}${inst}`;
  }
  return label;
}

function statusStyles(status: EnrollmentApplicationResponse["status"]): string {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80";
  if (status === "REJECTED") return "bg-red-50 text-red-800 ring-1 ring-red-200/80";
  return "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80";
}

async function fetchCoursePdfContext(courseId: string): Promise<{
  listedTuition?: number;
  teacherName?: string;
  currency?: string;
  scheduleSlots?: SessionSlotLike[];
}> {
  try {
    const course = await eduhubCourses.getById(courseId);
    let proposal = null;
    try {
      proposal = await eduhubSchedule.getProposal(courseId);
    } catch {
      /* schedule optional */
    }
    const slots = buildCourseScheduleSlots(course, proposal, courseId);
    const amt = course.pricing?.discountedAmount ?? course.pricing?.amount;
    return {
      listedTuition: amt != null && amt > 0 ? amt : undefined,
      teacherName: course.lecturer?.fullName,
      currency: course.pricing?.currency,
      scheduleSlots: slots.length > 0 ? slots : undefined,
    };
  } catch {
    return {};
  }
}


async function downloadEnrollmentPdf(
  r: EnrollmentApplicationResponse,
  t: TFunction,
  locale: "en" | "uz" = "en",
) {
  let listedTuition: number | undefined;
  let teacherName: string | undefined;
  let scheduleSlots: SessionSlotLike[] | undefined;
  if (isUuid(r.courseId)) {
    const ctx = await fetchCoursePdfContext(r.courseId);
    listedTuition = ctx.listedTuition;
    teacherName = ctx.teacherName;
    scheduleSlots = ctx.scheduleSlots;
  }

  let enriched = enrichEnrollmentApplication(r);
  if (enriched.status !== "APPROVED") {
    toast.error(
      enriched.status === "REJECTED"
        ? t("payment.pdfNotAvailableRejected")
        : t("payment.pdfAvailableAfterApproval"),
    );
    return;
  }

  enriched = ensureEnrollmentDocuments(enriched, listedTuition, scheduleSlots);

  const pdfOpts = { teacherName, listedTuition, scheduleSlots, locale };
  const official = buildEnrollmentReceiptPdfData(enriched, pdfOpts);
  if (official) {
    await downloadEnrollmentReceiptPdf(official);
    return;
  }

  toast.error(t("payment.toastPdfFailed"), {
    description: t("payment.toastPdfFailedHint"),
  });
}

function statusLabel(status: EnrollmentApplicationResponse["status"], t: TFunction): string {
  if (status === "PENDING") return t("payment.filterPending");
  if (status === "APPROVED") return t("payment.filterApproved");
  return t("payment.filterRejected");
}

function PaymentHistoryMobileCard({
  record,
  onOpenDetails,
}: {
  record: EnrollmentApplicationResponse;
  onOpenDetails: () => void;
}) {
  const { t } = useTranslation();
  const r = enrichEnrollmentApplication(record);
  const trialCode = formatEnrollmentTrialCode(r);

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-zinc-900">
          {r.courseTitle ?? r.courseId}
        </h3>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {enrollmentHasTrialCode(r) ? <EnrollmentTrialBadge /> : null}
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusStyles(r.status),
            )}
          >
            {statusLabel(r.status, t)}
          </span>
        </div>
      </div>
      {trialCode ? (
        <p className="mt-2 font-mono text-[11px] text-violet-900/80">
          {t("payment.trial.codeLabel")}: {trialCode}
        </p>
      ) : null}
      <p className="mt-2 text-xs tabular-nums text-zinc-500">{formatSubmittedAt(r.submittedAt)}</p>
      <dl className="mt-3 space-y-2 border-t border-zinc-100 pt-3 text-xs">
        <div className="flex items-start justify-between gap-3">
          <dt className="shrink-0 text-zinc-500">{t("payment.invoice")}</dt>
          <dd className="min-w-0 break-all text-right font-mono text-zinc-800">{r.invoiceNumber ?? "—"}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="shrink-0 text-zinc-500">{t("payment.receipt")}</dt>
          <dd className="min-w-0 break-all text-right font-mono text-zinc-800">{r.receiptNumber ?? "—"}</dd>
        </div>
      </dl>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 h-9 w-full rounded-xl text-xs"
        onClick={onOpenDetails}
      >
        {t("payment.viewDetails")}
      </Button>
    </article>
  );
}

const StudentPaymentInfo = () => {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<EnrollmentApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailRecord, setDetailRecord] = useState<EnrollmentApplicationResponse | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");
  const [receiptLoading, setReceiptLoading] = useState(false);

  const paymentStatusFilterOptions = useMemo(
    (): { value: PaymentStatusFilter; label: string }[] => [
      { value: "all", label: t("payment.filterAllStatuses") },
      { value: "PENDING", label: t("payment.filterPending") },
      { value: "APPROVED", label: t("payment.filterApproved") },
      { value: "REJECTED", label: t("payment.filterRejected") },
    ],
    [t],
  );

  const statusFilterLabel =
    paymentStatusFilterOptions.find((option) => option.value === statusFilter)?.label ??
    t("payment.filterAllStatuses");

  const loadRows = useCallback(() => {
    const emailNorm = user.email.trim().toLowerCase();
    if (!emailNorm) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    eduhubEnrollmentApplications
      .getMy(emailNorm)
      .then((list) => setRows(enrichEnrollmentApplications(list)))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [user.email]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    const id = searchParams.get("applicationId");
    if (!id || rows.length === 0) return;
    const match = rows.find((r) => r.id === id);
    if (match) {
      setDetailRecord(enrichEnrollmentApplication(match));
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("applicationId");
          return next;
        },
        { replace: true },
      );
    }
  }, [rows, searchParams, setSearchParams]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const e = enrichEnrollmentApplication(r);
      return [
        e.courseTitle ?? e.courseId,
        e.status,
        e.email,
        e.fullName,
        planSummary(e, t),
        e.adminNote ?? "",
        e.invoiceNumber ?? "",
        e.receiptNumber ?? "",
        e.trialCode ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, statusFilter, t]);

  return (
    
    <div className="w-full bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full pb-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl text-sm text-zinc-600">
            {t("payment.subtitle")}
          </p>
          <Button
            asChild
            className="h-10 shrink-0 rounded-xl bg-[#3954d0] text-sm font-medium hover:bg-[#2f47b3]"
          >
            <Link to="/dashboard/available-courses">{t("payment.availableClasses")}</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            <span className="ml-2 text-sm text-zinc-500">{t("payment.loading")}</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
            <Receipt className="mx-auto mb-3 h-10 w-10 text-zinc-300" aria-hidden />
            <p className="text-sm font-medium text-zinc-800">{t("payment.emptyTitle")}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {t("payment.emptyHint")}
            </p>
            <Button
              asChild
              className="mt-6 h-10 rounded-xl bg-[#3954d0] text-sm font-medium hover:bg-[#2f47b3]"
            >
              <Link to="/dashboard/available-courses">{t("payment.browseClasses")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <TrialEnrollmentReminderSection applications={rows} />
            <OutstandingTuitionSection applications={rows} />

            <div className="mb-4 flex items-center gap-2 sm:gap-3">
              <div className="relative w-full max-w-xs sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("payment.searchPlaceholder")}
                  className="h-10 rounded-xl bg-white pl-10"
                />
              </div>
              <div className="flex shrink-0 items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-[7.25rem] shrink-0 justify-between rounded-xl border-zinc-200 bg-white px-2.5 text-sm font-normal text-zinc-900 hover:bg-zinc-50 data-[state=open]:border-zinc-300 data-[state=open]:ring-2 data-[state=open]:ring-[#3954d0]/15 sm:w-[160px] sm:px-3"
                  >
                    <span className="truncate">{statusFilterLabel}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px] rounded-2xl border-zinc-200 p-2 shadow-lg">
                  {paymentStatusFilterOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      className={cn(
                        "cursor-pointer rounded-xl px-3 py-2 text-sm focus:bg-zinc-100",
                        statusFilter === option.value && "bg-zinc-50 font-medium text-zinc-900",
                      )}
                      onClick={() => setStatusFilter(option.value)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>

            <div className="md:hidden">
              {filteredRows.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
                  {t("payment.noMatch")}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRows.map((raw) => (
                    <PaymentHistoryMobileCard
                      key={raw.id}
                      record={raw}
                      onOpenDetails={() => setDetailRecord(enrichEnrollmentApplication(raw))}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="hidden w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white md:block">
              <Table className="min-w-[720px] text-sm">
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-white hover:bg-white">
                    <TableHead className="h-11 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("payment.submitted")}
                    </TableHead>
                    <TableHead className="h-11 min-w-0 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("payment.class")}
                    </TableHead>
                    <TableHead className="h-11 min-w-0 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("payment.invoiceNumber")}
                    </TableHead>
                    <TableHead className="h-11 min-w-0 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("payment.receiptNumber")}
                    </TableHead>
                    <TableHead className="h-11 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("payment.status")}
                    </TableHead>
                    <TableHead className="h-11 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("payment.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow className="border-zinc-100 bg-white hover:bg-white">
                      <TableCell colSpan={6} className="px-3 py-10 text-center text-sm text-zinc-500">
                        {t("payment.noMatch")}
                      </TableCell>
                    </TableRow>
                  ) : (
                  filteredRows.map((raw) => {
                    const r = enrichEnrollmentApplication(raw);
                    const trialCode = formatEnrollmentTrialCode(r);
                    return (
                      <TableRow key={r.id} className="border-zinc-100 bg-white hover:bg-zinc-50/70">
                        <TableCell className="align-middle whitespace-nowrap px-3 py-3 text-sm tabular-nums text-zinc-700">
                          {formatSubmittedAt(r.submittedAt)}
                        </TableCell>
                        <TableCell className="min-w-0 align-middle px-3 py-3 text-sm font-medium text-zinc-900">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="line-clamp-2 break-words" title={r.courseTitle ?? r.courseId}>
                              {r.courseTitle ?? r.courseId}
                            </span>
                            {enrollmentHasTrialCode(r) ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <EnrollmentTrialBadge className="text-[10px]" />
                                {trialCode ? (
                                  <span className="font-mono text-[10px] text-violet-800/90">{trialCode}</span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 align-middle px-3 py-3 font-mono text-[11px] text-zinc-700">
                          {r.invoiceNumber ?? "—"}
                        </TableCell>
                        <TableCell className="min-w-0 align-middle px-3 py-3 font-mono text-[11px] text-zinc-700">
                          {r.receiptNumber ?? "—"}
                        </TableCell>
                        <TableCell className="align-middle whitespace-nowrap px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles(r.status)}`}
                          >
                            {statusLabel(r.status, t)}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle px-3 py-3">
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-xl px-3 text-xs"
                              onClick={() => setDetailRecord(r)}
                            >
                              {t("payment.details")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                  )}
                </TableBody>
              </Table>
            </div>

            <StudentEnrollmentPaymentDetailDialog
              record={detailRecord}
              open={detailRecord != null}
              onOpenChange={(open) => !open && setDetailRecord(null)}
              downloadLoading={receiptLoading}
              onDownload={(locale) => {
                if (!detailRecord) return;
                setReceiptLoading(true);
                void downloadEnrollmentPdf(detailRecord, t, locale).finally(() =>
                  setReceiptLoading(false),
                );
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default StudentPaymentInfo;
