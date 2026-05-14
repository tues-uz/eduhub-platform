import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight, ClipboardCheck, Clock, UserPlus, UserX } from "lucide-react";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  appNotificationStore,
  APP_NOTIFICATIONS_CHANGE_EVENT,
  type AppNotification,
} from "@/features/notifications/appNotificationStore";
import {
  AttendanceSessionLogsSection,
  useAttendanceSessionLogsTick,
} from "@/features/teacher/components/AttendanceSessionLogsSection";
import { listAttendanceSessionLogs } from "@/features/teacher/attendance/attendanceSessionLogsStorage";
import { substituteInviteWorkflowStore } from "@/features/teacher/data/substituteInviteWorkflowStore";
import { SubstituteInviteRequestSummary } from "@/features/teacher/components/SubstituteInviteRequestSummary";
import { ADMIN_SUBSTITUTE_REQUESTS_BASE, adminSubstituteDetailHref, resolveAdminSubstituteInviteId } from "@/features/admin/substituteCoverAdminRoutes";

function isAdminSubstituteKind(kind: AppNotification["kind"]): boolean {
  return kind.startsWith("admin_substitute_");
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function iconFor(kind: AppNotification["kind"]) {
  switch (kind) {
    case "admin_substitute_invite_request":
      return <UserPlus className="h-5 w-5 text-violet-600" aria-hidden />;
    case "admin_substitute_final_approval_needed":
      return <ClipboardCheck className="h-5 w-5 text-emerald-600" aria-hidden />;
    case "admin_substitute_invite_declined":
      return <UserX className="h-5 w-5 text-amber-600" aria-hidden />;
    default:
      return <Bell className="h-5 w-5 text-slate-600" aria-hidden />;
  }
}

function categoryLabel(kind: AppNotification["kind"]): "Student" | "Teacher" | "System" {
  switch (kind) {
    case "admin_enrollment_action":
    case "admin_enrollment_submitted":
    case "admin_payment_marked_paid":
    case "admin_payment_proof_approved":
      return "Student";
    case "admin_teacher_course_created":
    case "admin_schedule_sent_to_instructor":
    case "admin_schedule_approved":
    case "admin_schedule_rejected":
    case "admin_instructor_payroll_request":
    case "admin_payroll_payout_recorded":
    case "admin_substitute_invite_request":
    case "admin_substitute_final_approval_needed":
    case "admin_substitute_invite_declined":
    case "admin_attendance_qr_generated":
    case "admin_attendance_session_completed":
      return "Teacher";
    default:
      return "System";
  }
}

function categoryPillClass(label: "Student" | "Teacher" | "System") {
  if (label === "Student") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (label === "Teacher") return "bg-violet-50 text-violet-700 ring-violet-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function AdminSubstituteNotificationCard({
  n,
  bump,
}: {
  n: AppNotification;
  bump: () => void;
}) {
  const inviteId = resolveAdminSubstituteInviteId(n);
  const rec = inviteId ? substituteInviteWorkflowStore.get(inviteId) : undefined;
  const detailHref = inviteId ? adminSubstituteDetailHref(inviteId) : null;
  const needsAdminApprove =
    !!rec &&
    (rec.status === "pending_admin_approval" ||
      rec.status === "pending_substitute_response" ||
      rec.status === "pending_primary_approval");

  return (
    <article
      className={`rounded-2xl border bg-white text-left shadow-sm ${
        n.read ? "border-slate-200" : "border-slate-300/80 ring-1 ring-slate-200/60"
      }`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
              n.read ? "bg-slate-50 ring-slate-200" : "bg-white ring-slate-200"
            }`}
          >
            {iconFor(n.kind)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-snug text-slate-900">{n.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${categoryPillClass(
                  categoryLabel(n.kind),
                )}`}
              >
                {categoryLabel(n.kind)}
              </span>
              {!n.read ? (
                <span className="inline-flex h-2 w-2 rounded-full bg-[#3954d0]" aria-label="Unread" />
              ) : null}
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {formatRelativeTime(n.createdAt)}
              </span>
            </div>

            {rec ? (
              <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-slate-900">
                <SubstituteInviteRequestSummary rec={rec} showInvitedSubstitute variant="compact" />
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-slate-600 line-clamp-3 whitespace-pre-wrap">
                {n.body}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              {detailHref ? (
                <Button type="button" size="sm" className="rounded-full bg-[#3954d0] hover:bg-[#2f46b3]" asChild>
                  <Link to={detailHref}>{needsAdminApprove ? "Review & approve" : "View details"}</Link>
                </Button>
              ) : (
                <Button type="button" size="sm" variant="secondary" className="rounded-full" asChild>
                  <Link to={ADMIN_SUBSTITUTE_REQUESTS_BASE}>Substitute requests</Link>
                </Button>
              )}
              {!n.read ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    appNotificationStore.markRead(n.id);
                    bump();
                  }}
                >
                  Mark read
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "student" | "teacher">("all");
  const bump = useCallback(() => setTick((x) => x + 1), []);

  const logTick = useAttendanceSessionLogsTick();
  const attendanceLogsAll = useMemo(() => {
    void logTick;
    return listAttendanceSessionLogs();
  }, [logTick]);

  useEffect(() => {
    window.addEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
    return () => window.removeEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
  }, [bump]);

  const notifications = useMemo(() => {
    void tick;
    return [...appNotificationStore.listForAdmin()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [tick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchesText = (n: AppNotification) =>
      !q || [n.title, n.body, n.kind, n.createdAt].join(" ").toLowerCase().includes(q);

    const matchesFilter = (n: AppNotification) => {
      if (filter === "all") return true;
      const kind = n.kind;
      const studentKinds: AppNotification["kind"][] = [
        "admin_enrollment_submitted",
        "admin_enrollment_action",
        "admin_payment_marked_paid",
        "admin_payment_proof_approved",
      ];
      const teacherKinds: AppNotification["kind"][] = [
        "admin_teacher_course_created",
        "admin_schedule_sent_to_instructor",
        "admin_schedule_approved",
        "admin_schedule_rejected",
        "admin_instructor_payroll_request",
        "admin_payroll_payout_recorded",
        "admin_substitute_invite_request",
        "admin_substitute_final_approval_needed",
        "admin_substitute_invite_declined",
        "admin_attendance_qr_generated",
        "admin_attendance_session_completed",
      ];
      if (filter === "student") return studentKinds.includes(kind);
      if (filter === "teacher") return teacherKinds.includes(kind);
      return true;
    };

    return notifications.filter((n) => matchesFilter(n) && matchesText(n));
  }, [notifications, search, filter]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const fallbackHrefForKind = (kind: AppNotification["kind"]): string => {
    switch (kind) {
      case "admin_enrollment_action":
      case "admin_enrollment_submitted":
        return "/dashboard/admin/enrollment-applications";
      case "admin_teacher_course_created":
        return "/dashboard/admin/courses";
      case "admin_schedule_sent_to_instructor":
      case "admin_schedule_approved":
      case "admin_schedule_rejected":
        return "/dashboard/admin/courses";
      case "admin_payment_marked_paid":
      case "admin_payment_proof_approved":
        return "/dashboard/admin/payments";
      case "admin_instructor_payroll_request":
        return "/dashboard/admin/payroll/instructor-requests";
      case "admin_payroll_payout_recorded":
        return "/dashboard/admin/payroll/submissions";
      case "admin_substitute_invite_request":
      case "admin_substitute_invite_declined":
      case "admin_substitute_final_approval_needed":
        return ADMIN_SUBSTITUTE_REQUESTS_BASE;
      case "admin_attendance_qr_generated":
      case "admin_attendance_session_completed":
        return "/dashboard/admin/notifications";
      default:
        return "/dashboard/admin";
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Notifications</h1>
            <p className="text-sm text-slate-600 mt-1">Admin activity alerts and attendance QR session logs (demo, stored in this browser).</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {unreadCount} unread
              </span>
            </div>
          </div>

          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full w-full sm:w-auto"
              onClick={() => notifications.forEach((n) => appNotificationStore.markRead(n.id))}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        <div className="mb-10">
          <AttendanceSessionLogsSection
            entries={attendanceLogsAll}
            title="Attendance QR session log (all instructors)"
            showInstructorColumn
          />
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center sm:gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications…"
              className="bg-white w-full sm:flex-1"
            />
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="bg-white w-full sm:w-[140px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {search.trim() || filter !== "all" ? (
            <Button
              type="button"
              variant="ghost"
              className="text-slate-600 w-full sm:w-auto"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
            {notifications.length === 0 ? "No notifications yet." : "No notifications match your search."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
              if (isAdminSubstituteKind(n.kind)) {
                return <AdminSubstituteNotificationCard key={n.id} n={n} bump={bump} />;
              }

              const inner = (
                <>
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                        n.read ? "bg-slate-50 ring-slate-200" : "bg-white ring-slate-200"
                      }`}
                    >
                      {iconFor(n.kind)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900 truncate">{n.title}</p>
                            {!n.read ? (
                              <span className="inline-flex h-2 w-2 rounded-full bg-[#3954d0]" aria-label="Unread" />
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${categoryPillClass(
                                categoryLabel(n.kind),
                              )}`}
                            >
                              {categoryLabel(n.kind)}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="h-3.5 w-3.5" aria-hidden />
                              {formatRelativeTime(n.createdAt)}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="mt-1 h-5 w-5 text-slate-300 transition-colors group-hover:text-slate-400" aria-hidden />
                      </div>

                      <p className="mt-2 text-sm text-slate-600 line-clamp-4 whitespace-pre-wrap">{n.body}</p>
                      {!n.read ? (
                        <button
                          type="button"
                          className="mt-2 text-xs font-medium text-[#3954d0] hover:underline"
                          onClick={() => appNotificationStore.markRead(n.id)}
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </div>
                </>
              );

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    appNotificationStore.markRead(n.id);
                    const href = n.href?.trim() || fallbackHrefForKind(n.kind);
                    if (href) navigate(href);
                  }}
                  className={`group w-full rounded-2xl border bg-white px-5 py-4 text-left transition-colors hover:bg-slate-50/60 ${
                    n.read ? "border-slate-200" : "border-slate-300/70 shadow-sm"
                  }`}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

