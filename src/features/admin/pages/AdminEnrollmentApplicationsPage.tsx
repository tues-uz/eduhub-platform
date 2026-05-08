import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
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
          description="Review student enrollment applications. Approve to create enrollments or reject with feedback."
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-12">
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
