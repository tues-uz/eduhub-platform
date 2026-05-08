import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthSession } from "@/features/auth/context";
import {
  downloadEnrollmentApplicationPdf,
  type EnrollmentApplicationPdfData,
} from "@/features/enrollment/enrollmentApplicationPdf";
import { eduhubEnrollmentApplications } from "@/api/eduhubClient";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
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

function isHttpUrl(u: string): boolean {
  return /^https?:\/\//i.test(u.trim());
}

function applicationToPdfData(r: EnrollmentApplicationResponse): EnrollmentApplicationPdfData {
  const paymentDetailLines: string[] = [];
  paymentDetailLines.push(
    r.paymentPlan === "FULL"
      ? "Payment plan: Full payment"
      : `Payment plan: Down payment (${r.installmentCount ?? 2} instalments)`,
  );
  paymentDetailLines.push(`Tuition: ${formatMoney(r.downPaymentAmount ?? 0, r.priceCurrency ?? "USD")}`);
  return {
    submittedAtIso: r.submittedAt,
    courseTitle: r.courseTitle ?? r.courseId,
    courseId: r.courseId,
    tuitionLabel: formatMoney(r.downPaymentAmount ?? 0, r.priceCurrency ?? "USD"),
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    phoneSecondary: r.phoneSecondary,
    address: r.address,
    paymentDetailLines,
    proofFileName: "payment-proof",
    idFileName: "id-document",
  };
}

function EnrollmentDetailFields({ r }: { r: EnrollmentApplicationResponse }) {
  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Class</dt>
        <dd className="mt-0.5 font-medium text-zinc-900">{r.courseTitle ?? r.courseId}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Submitted</dt>
        <dd className="mt-0.5 text-zinc-800">{formatSubmittedAt(r.submittedAt)}</dd>
      </div>
      {r.reviewedAt ? (
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Reviewed</dt>
          <dd className="mt-0.5 text-zinc-800">{formatSubmittedAt(r.reviewedAt)}</dd>
        </div>
      ) : null}
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Payment</dt>
        <dd className="mt-0.5 text-zinc-800">{planSummary(r)}</dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Contact</dt>
        <dd className="mt-0.5 space-y-0.5 text-zinc-800">
          <p>{r.fullName}</p>
          <p>{r.email}</p>
          <p>{r.phone}</p>
          {r.phoneSecondary ? <p>{r.phoneSecondary}</p> : null}
          <p className="whitespace-pre-wrap text-zinc-700">{r.address}</p>
        </dd>
      </div>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Payment proof</dt>
        <dd className="mt-0.5">
          {isHttpUrl(r.paymentProofUrl) ? (
            <a
              href={r.paymentProofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#3954d0] underline-offset-2 hover:underline"
            >
              Open uploaded file
            </a>
          ) : (
            <span className="text-zinc-500">Uploaded with your application</span>
          )}
        </dd>
      </div>
      {r.adminNote?.trim() ? (
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Note from school</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-zinc-800">{r.adminNote.trim()}</dd>
        </div>
      ) : null}
    </dl>
  );
}

const StudentPaymentInfo = () => {
  const { user } = useAuthSession();
  const [rows, setRows] = useState<EnrollmentApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailRecord, setDetailRecord] = useState<EnrollmentApplicationResponse | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const emailNorm = user.email.trim().toLowerCase();
    if (!emailNorm) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    eduhubEnrollmentApplications
      .getMy(emailNorm)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [user.email]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.courseTitle ?? r.courseId,
        r.status,
        r.email,
        r.fullName,
        planSummary(r),
        r.adminNote ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  return (
    <div className="w-full bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full pb-10">
        <p className="mb-6 text-sm text-zinc-600">
          Enrollment payments and transfer proof you submitted. New entries appear after you apply from{" "}
          <Link
            to="/dashboard/available-courses"
            className="font-medium text-[#3954d0] underline-offset-2 hover:underline"
          >
            Available Classes
          </Link>
          .
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
                placeholder="Search class, status, note…"
                className="max-w-md bg-white"
              />
              {search.trim() ? (
                <Button type="button" variant="ghost" className="text-zinc-600" onClick={() => setSearch("")}>
                  Clear
                </Button>
              ) : null}
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <Table className="table-fixed text-sm">
                <TableHeader>
                  <TableRow className="border-zinc-200 bg-white hover:bg-white">
                    <TableHead className="h-11 w-[22%] px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Submitted
                    </TableHead>
                    <TableHead className="h-11 min-w-0 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Class
                    </TableHead>
                    <TableHead className="h-11 min-w-0 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Payment
                    </TableHead>
                    <TableHead className="h-11 w-[14%] px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Status
                    </TableHead>
                    <TableHead className="h-11 w-[104px] px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => (
                    <TableRow key={r.id} className="border-zinc-100 bg-white hover:bg-zinc-50/70">
                      <TableCell className="align-middle px-3 py-3 text-sm tabular-nums text-zinc-700">
                        {formatSubmittedAt(r.submittedAt)}
                      </TableCell>
                      <TableCell className="min-w-0 align-middle px-3 py-3 text-sm font-medium text-zinc-900">
                        <span className="line-clamp-2 break-words" title={r.courseTitle ?? r.courseId}>
                          {r.courseTitle ?? r.courseId}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-0 align-middle px-3 py-3 text-sm text-zinc-700">
                        <span className="break-words">{planSummary(r)}</span>
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
                  ))}
                </TableBody>
              </Table>
            </div>

            <Dialog open={detailRecord != null} onOpenChange={(open) => !open && setDetailRecord(null)}>
              <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-left">Enrollment details</DialogTitle>
                </DialogHeader>
                {detailRecord ? (
                  <div className="space-y-4 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles(detailRecord.status)}`}
                      >
                        {detailRecord.status === "PENDING"
                          ? "Pending review"
                          : detailRecord.status === "APPROVED"
                            ? "Approved"
                            : "Rejected"}
                      </span>
                    </div>
                    <EnrollmentDetailFields r={detailRecord} />
                    <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                      <Button
                        type="button"
                        className="rounded-xl bg-[#3954d0] hover:bg-[#2f47b3]"
                        onClick={() =>
                          downloadEnrollmentApplicationPdf(applicationToPdfData(detailRecord))
                        }
                      >
                        <Download className="mr-2 h-4 w-4" aria-hidden />
                        Download PDF
                      </Button>
                      <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDetailRecord(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentPaymentInfo;
