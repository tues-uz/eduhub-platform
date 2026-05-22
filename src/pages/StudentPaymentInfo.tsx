import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  buildEnrollmentSubmissionReceiptPdfData,
  downloadEnrollmentReceiptPdf,
  downloadEnrollmentSubmissionReceiptPdf,
} from "@/features/enrollment/enrollmentReceiptPdf";
import {
  enrichEnrollmentApplication,
  enrichEnrollmentApplications,
} from "@/features/enrollment/enrollmentDocuments";
import { eduhubCourses, eduhubEnrollmentApplications, eduhubSchedule } from "@/api/eduhubClient";
import { buildCourseScheduleSlots } from "@/features/courses/courseScheduleSlots";
import type { SessionSlotLike } from "@/features/courses/classSchedulePreview";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import { Input } from "@/components/ui/input";

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

function planSummary(r: EnrollmentApplicationResponse): string {
  if (r.paymentPlan === "DOWN_PAYMENT") {
    const amt = formatMoney(r.downPaymentAmount, r.priceCurrency ?? "USD");
    const inst =
      r.installmentCount != null ? ` · ${r.installmentCount} instalments` : "";
    return amt !== "—" ? `Down payment ${amt}${inst}` : `Down payment${inst}`;
  }
  return "Full payment";
}

function statusStyles(status: EnrollmentApplicationResponse["status"]): string {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-900";
  if (status === "REJECTED") return "bg-red-100 text-red-900";
  return "bg-amber-100 text-amber-950";
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


async function downloadEnrollmentPdf(r: EnrollmentApplicationResponse) {
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
  if (enriched.status === "APPROVED") {
    enriched = ensureEnrollmentDocuments(enriched, listedTuition, scheduleSlots);
  }

  const pdfOpts = { teacherName, listedTuition, scheduleSlots };
  const official = buildEnrollmentReceiptPdfData(enriched, pdfOpts);
  if (official) {
    await downloadEnrollmentReceiptPdf(official);
    return;
  }

  const submission = buildEnrollmentSubmissionReceiptPdfData(enriched, pdfOpts);
  if (submission) {
    await downloadEnrollmentSubmissionReceiptPdf(submission);
    return;
  }

  toast.error("Could not generate PDF", {
    description: "Tuition amount is missing for this application.",
  });
}

const StudentPaymentInfo = () => {
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<EnrollmentApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailRecord, setDetailRecord] = useState<EnrollmentApplicationResponse | null>(null);
  const [search, setSearch] = useState("");
  const [receiptLoading, setReceiptLoading] = useState(false);

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
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const e = enrichEnrollmentApplication(r);
      return [
        e.courseTitle ?? e.courseId,
        e.status,
        e.email,
        e.fullName,
        planSummary(e),
        e.adminNote ?? "",
        e.invoiceNumber ?? "",
        e.receiptNumber ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search]);

  return (
    
    <div className="w-full bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full pb-10">
        <p className="mb-6 text-sm text-zinc-600">
          Payment history, invoices, and receipts for your enrollment applications. Apply from{" "}
          <Link
            to="/dashboard/available-courses"
            className="font-medium text-[#3954d0] underline-offset-2 hover:underline"
          >
            Available Classes
          </Link>
          . Official invoice and receipt numbers are issued after the school approves your application.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            <span className="ml-2 text-sm text-zinc-500">Loading applications...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center">
            <Receipt className="mx-auto mb-3 h-10 w-10 text-zinc-300" aria-hidden />
            <p className="text-sm font-medium text-zinc-800">No payment activity yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              When you enroll and upload transfer proof, your submissions will be listed here.
            </p>
            <Button
              asChild
              className="mt-6 h-10 rounded-xl bg-[#3954d0] text-sm font-medium hover:bg-[#2f47b3]"
            >
              <Link to="/dashboard/available-courses">Browse classes</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search class, invoice, receipt, status…"
                className="max-w-md bg-white"
              />
              {search.trim() ? (
                <Button type="button" variant="ghost" className="text-zinc-600" onClick={() => setSearch("")}>
                  Clear
                </Button>
              ) : null}
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <Table className="min-w-[720px] text-sm">
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-white hover:bg-white">
                    <TableHead className="h-11 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Submitted
                    </TableHead>
                    <TableHead className="h-11 min-w-0 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Class
                    </TableHead>
                    <TableHead className="h-11 min-w-0 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Invoice #
                    </TableHead>
                    <TableHead className="h-11 min-w-0 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Receipt #
                    </TableHead>
                    <TableHead className="h-11 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Status
                    </TableHead>
                    <TableHead className="h-11 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((raw) => {
                    const r = enrichEnrollmentApplication(raw);
                    return (
                      <TableRow key={r.id} className="border-zinc-100 bg-white hover:bg-zinc-50/70">
                        <TableCell className="align-middle whitespace-nowrap px-3 py-3 text-sm tabular-nums text-zinc-700">
                          {formatSubmittedAt(r.submittedAt)}
                        </TableCell>
                        <TableCell className="min-w-0 align-middle px-3 py-3 text-sm font-medium text-zinc-900">
                          <span className="line-clamp-2 break-words" title={r.courseTitle ?? r.courseId}>
                            {r.courseTitle ?? r.courseId}
                          </span>
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
                            {r.status === "PENDING"
                              ? "Pending review"
                              : r.status === "APPROVED"
                                ? "Approved"
                                : "Rejected"}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle px-3 py-3">
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg px-3 text-xs"
                              onClick={() => setDetailRecord(r)}
                            >
                              Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <StudentEnrollmentPaymentDetailDialog
              record={detailRecord}
              open={detailRecord != null}
              onOpenChange={(open) => !open && setDetailRecord(null)}
              downloadLoading={receiptLoading}
              onDownload={() => {
                if (!detailRecord) return;
                setReceiptLoading(true);
                void downloadEnrollmentPdf(detailRecord).finally(() => setReceiptLoading(false));
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default StudentPaymentInfo;
