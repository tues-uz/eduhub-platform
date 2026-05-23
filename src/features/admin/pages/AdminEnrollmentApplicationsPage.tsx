import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, Loader2 } from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { eduhubAdminEnrollmentApplications } from "@/api/eduhubClient";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { formatPaymentMethodLabel } from "@/features/enrollment/enrollmentDocumentConfig";
import {
  enrollmentPaymentListSummary,
  enrollmentPaymentPlanLabel,
  formatEnrollmentMoney,
} from "@/features/enrollment/enrollmentPaymentDisplay";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function paymentListCell(r: EnrollmentApplicationResponse) {
  const cur = r.priceCurrency ?? "USD";
  return (
    <div className="text-sm leading-snug">
      {r.paymentMethod ? (
        <span className="block text-xs font-medium text-slate-700">
          {formatPaymentMethodLabel(r.paymentMethod)}
        </span>
      ) : null}
      <span className="font-medium text-slate-900">{enrollmentPaymentPlanLabel(r.paymentPlan)}</span>
      {r.downPaymentAmount != null && r.downPaymentAmount > 0 ? (
        <span className="mt-0.5 block text-xs tabular-nums text-slate-600">
          {formatEnrollmentMoney(r.downPaymentAmount, cur)}
        </span>
      ) : null}
      {r.paymentPlan === "DOWN_PAYMENT" && r.installmentCount != null ? (
        <span className="mt-0.5 block text-xs text-slate-500">{r.installmentCount} further instalments</span>
      ) : null}
      {r.scheduleSessionCount != null && r.scheduleSessionCount > 0 ? (
        <span className="mt-0.5 block text-xs text-slate-500">
          {r.joinFromSessionNumber != null && r.joinFromSessionNumber > 1
            ? `From meeting ${r.joinFromSessionNumber} of ${r.scheduleSessionCount}`
            : `${r.scheduleSessionCount} meetings`}
        </span>
      ) : null}
    </div>
  );
}

export default function AdminEnrollmentApplicationsPage() {
  const [rows, setRows] = useState<EnrollmentApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    eduhubAdminEnrollmentApplications
      .listAll()
      .then((data) => {
        setRows(data);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load applications");
      })
      .finally(() => setLoading(false));
  }, []);

  const pending = useMemo(() => rows.filter((r) => r.status === "PENDING"), [rows]);

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Enrollment applications"
          description="Review student requests (full or down payment, schedule-based tuition). Approve to enroll or reject with feedback."
        />

        {pending.length > 0 ? (
          <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">
            {pending.length} pending review
          </p>
        ) : (
          <p className="mb-4 text-sm text-slate-600">No pending applications.</p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Loading applications...</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-800">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setLoading(true);
                eduhubAdminEnrollmentApplications
                  .listAll()
                  .then(setRows)
                  .catch(() => {})
                  .finally(() => setLoading(false));
              }}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>Submitted</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-12">
                      No applications yet. Students submit from Available Classes → Request enrollment.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm whitespace-nowrap align-middle">{formatDate(r.submittedAt)}</TableCell>
                      <TableCell className="max-w-[220px] align-middle">
                        <span className="font-medium text-slate-900 line-clamp-2">{r.courseTitle ?? r.courseId}</span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <span className="font-medium text-slate-900">{r.fullName}</span>
                        <span className="mt-0.5 block text-xs text-slate-500 truncate max-w-[200px]" title={r.email}>
                          {r.email}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle max-w-[220px]" title={enrollmentPaymentListSummary(r)}>
                        {paymentListCell(r)}
                      </TableCell>
                      <TableCell className="align-middle">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : r.status === "APPROVED"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <Button asChild size="sm" variant="outline" className="gap-1.5">
                          <Link to={`/dashboard/admin/enrollment-applications/${encodeURIComponent(r.id)}`}>
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            Review
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
