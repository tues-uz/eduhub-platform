import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, Eye } from "lucide-react";
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
import {
  enrollmentApplicationStore,
  type EnrollmentApplicationRecord,
} from "@/features/enrollment/enrollmentApplicationStore";
import {
  appNotificationStore,
  APP_NOTIFICATIONS_CHANGE_EVENT,
  type AppNotification,
} from "@/features/notifications/appNotificationStore";

const CHANGE_EVENT = "eduhub-enrollment-applications-changed";

function formatEnrollmentActivityTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

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
  const [rows, setRows] = useState<EnrollmentApplicationRecord[]>(() => enrollmentApplicationStore.list());
  const [notifTick, setNotifTick] = useState(0);

  const sync = useCallback(() => {
    setRows([...enrollmentApplicationStore.list()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [sync]);

  useEffect(() => {
    const bump = () => setNotifTick((x) => x + 1);
    window.addEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
    return () => window.removeEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
  }, []);

  const pending = useMemo(() => rows.filter((r) => r.status === "PENDING"), [rows]);

  const adminEnrollmentNotifications = useMemo(
    () =>
      appNotificationStore
        .listForAdmin()
        .filter((n): n is AppNotification & { kind: "admin_enrollment_action" } => n.kind === "admin_enrollment_action")
        .slice(0, 12),
    [notifTick],
  );

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Enrollment applications"
          description="Open an application to review documents and approve or reject. Approving a server-backed class calls the enrollments API; local teacher classes are approved in-app only."
        />

        {import.meta.env.DEV ? (
          <p className="mb-4 text-sm text-slate-600 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2">
            <span className="font-medium text-slate-800">Dev mode:</span> If you have no applications in
            localStorage, the app seeds sample rows (names start with &quot;Demo:&quot;) so you can try
            approve/reject. Clear site data or remove{" "}
            <code className="rounded bg-white px-1 text-xs">eduhub_enrollment_applications_v1</code> to start
            empty; opening this page again will re-seed when still empty.
          </p>
        ) : null}

        {pending.length > 0 ? (
          <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">
            {pending.length} pending review
          </p>
        ) : (
          <p className="mb-4 text-sm text-slate-600">No pending applications.</p>
        )}

        {adminEnrollmentNotifications.length > 0 ? (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <Bell className="h-4 w-4 text-slate-600" aria-hidden />
              <h2 className="text-sm font-semibold text-slate-900">Recent enrollment activity</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {adminEnrollmentNotifications.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatEnrollmentActivityTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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
      </div>
    </AdminLayout>
  );
}
