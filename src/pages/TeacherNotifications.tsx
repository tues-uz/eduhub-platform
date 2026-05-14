import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, Clock, CreditCard, QrCode, UserPlus, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import { appNotificationStore, APP_NOTIFICATIONS_CHANGE_EVENT, type AppNotification } from "@/features/notifications/appNotificationStore";
import {
  AttendanceSessionLogsSection,
  useAttendanceSessionLogsTick,
} from "@/features/teacher/components/AttendanceSessionLogsSection";
import { listAttendanceSessionLogsForInstructor } from "@/features/teacher/attendance/attendanceSessionLogsStorage";
import { substituteInviteWorkflowStore, type SubstituteInviteRecord } from "@/features/teacher/data/substituteInviteWorkflowStore";
import DashboardSidebar from "@/components/DashboardSidebar";

function substituteInviteRecordForNotification(n: AppNotification): SubstituteInviteRecord | undefined {
  if (!n.refId || !n.kind.startsWith("instructor_substitute_")) return undefined;
  return substituteInviteWorkflowStore.get(n.refId);
}

function compactSubstituteListPreview(n: AppNotification, rec: SubstituteInviteRecord | undefined): string | null {
  if (!rec) return null;
  if (n.kind !== "instructor_substitute_invitation" && n.kind !== "instructor_substitute_need_primary_approval") {
    return null;
  }
  const session = rec.sessionNote?.trim();
  return session ? `${rec.courseTitle} · ${session}` : rec.courseTitle;
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
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** When the notification was created (local), for display next to relative phrasing. */
function formatNotificationReceivedClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getIcon(kind: AppNotification["kind"]) {
  switch (kind) {
    case "instructor_payroll_paid":
      return <CreditCard className="h-5 w-5 text-[#3954d0]" />;
    case "instructor_payroll_request_approved":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "instructor_payroll_request_rejected":
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case "instructor_substitute_invitation":
    case "instructor_substitute_need_primary_approval":
    case "instructor_substitute_invite_sent":
      return <UserPlus className="h-5 w-5 text-[#3954d0]" />;
    case "instructor_substitute_cover_confirmed":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "instructor_substitute_declined_notice":
    case "instructor_substitute_rejected_notice":
      return <XCircle className="h-5 w-5 text-amber-600" />;
    case "instructor_substitute_awaiting_primary":
    case "instructor_substitute_awaiting_admin":
    case "instructor_substitute_pending_admin_review":
      return <Clock className="h-5 w-5 text-[#3954d0]" />;
    case "instructor_substitute_inviter_final_ok":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "instructor_substitute_admin_rejected":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "instructor_attendance_qr_generated":
    case "instructor_attendance_session_completed":
      return <QrCode className="h-5 w-5 text-[#3954d0]" />;
    default:
      return <Bell className="h-5 w-5 text-foreground/60" />;
  }
}

/** Action label for the optional `href` CTA (not shown when the substitute review `Link` row is used). */
function teacherNotificationHrefCtaLabel(href: string, kind: AppNotification["kind"]): string {
  const base = href.trim().split("?")[0].replace(/\/$/, "") || href;

  if (/^\/dashboard\/teacher\/courses\/[^/]+$/.test(base)) {
    if (kind === "instructor_substitute_cover_confirmed") return "Open class you're covering";
    if (kind === "instructor_substitute_inviter_final_ok") return "Open class (substitute finalized)";
    if (kind === "instructor_substitute_invitation") return "Open class page (see details)";
    return "Open this class page";
  }

  if (base === "/dashboard/teacher/courses") return "View my classes";

  if (base === "/dashboard/teacher/notifications") return "Open notifications inbox";

  if (base === "/dashboard/teacher/attendance") return "Open attendance";

  return "Go to linked page";
}

function substituteInviteShowsReviewLink(n: AppNotification, viewerEmailNorm: string): boolean {
  if (!n.refId) return false;
  const rec = substituteInviteWorkflowStore.get(n.refId);
  if (!rec) return false;
  if (
    n.kind === "instructor_substitute_invitation" &&
    rec.status === "pending_substitute_response" &&
    rec.substituteEmailNorm === viewerEmailNorm
  ) {
    return true;
  }
  if (
    n.kind === "instructor_substitute_need_primary_approval" &&
    rec.status === "pending_primary_approval" &&
    rec.primaryInstructorEmailNorm === viewerEmailNorm
  ) {
    return true;
  }
  return false;
}

export default function TeacherNotifications() {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const emailNorm = user.email.trim().toLowerCase();
  const [tick, setTick] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );

  const bump = useCallback(() => setTick((x) => x + 1), []);

  const logTick = useAttendanceSessionLogsTick();
  const attendanceLogs = useMemo(() => {
    void logTick;
    return listAttendanceSessionLogsForInstructor(emailNorm, user.name);
  }, [emailNorm, logTick, user.name]);

  useEffect(() => {
    window.addEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
    return () => window.removeEventListener(APP_NOTIFICATIONS_CHANGE_EVENT, bump);
  }, [bump]);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  const notifications = useMemo(
    () =>
      [...appNotificationStore.listForInstructor(emailNorm, user.name)].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [emailNorm, user.name, tick],
  );

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <div
          className="mx-auto box-border w-full max-w-3xl px-6"
          style={{
            paddingLeft: "clamp(1rem, 4vw, 1.75rem)",
            paddingRight: "clamp(1rem, 4vw, 1.75rem)",
          }}
        >
          <Link
            to="/dashboard/teacher"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            Back to Teacher Dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Notifications</h1>
            <p className="text-foreground/70 text-sm mt-1">
              Payroll, substitute workflow, and attendance QR session logs (in-app, local demo).
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                {unreadCount} unread
              </span>
              {unreadCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => appNotificationStore.markAllReadForInstructor(emailNorm, user.name)}
                >
                  Mark all as read
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mb-10">
            <AttendanceSessionLogsSection entries={attendanceLogs} />
          </div>

          <div className="space-y-3">
            {notifications.map((notification) => {
              const showSubstituteReviewLink = substituteInviteShowsReviewLink(notification, emailNorm);
              const subRec = substituteInviteRecordForNotification(notification);
              const substitutePreview = compactSubstituteListPreview(notification, subRec);

              return (
                <div
                  key={notification.id}
                  className={`w-full rounded-xl border p-5 text-left transition-colors ${
                    notification.read
                      ? "border-gray-200/50 bg-white/80"
                      : "border-blue-200/50 bg-blue-50/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
                      {getIcon(notification.kind)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={`text-sm font-semibold leading-snug ${
                            notification.read ? "text-foreground/80" : "text-foreground"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          {!notification.read ? (
                            <button
                              type="button"
                              className="text-xs font-medium text-blue-600 hover:underline"
                              onClick={() => appNotificationStore.markRead(notification.id)}
                            >
                              Mark read
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {substitutePreview ? (
                        <p className="mt-1.5 text-sm text-foreground/60 line-clamp-2">{substitutePreview}</p>
                      ) : (
                        <p className="mt-2 text-sm leading-relaxed text-foreground/65 whitespace-pre-wrap">
                          {notification.body}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-foreground/50" aria-hidden />
                        <p className="min-w-0 text-foreground/70">
                          <span className="text-foreground/50">Received </span>
                          <span className="font-medium text-foreground/85">{formatRelativeTime(notification.createdAt)}</span>
                          {formatNotificationReceivedClock(notification.createdAt) ? (
                            <>
                              <span className="text-foreground/35"> · </span>
                              <time
                                dateTime={notification.createdAt}
                                className="tabular-nums text-foreground/60"
                              >
                                {formatNotificationReceivedClock(notification.createdAt)}
                              </time>
                            </>
                          ) : null}
                        </p>
                      </div>

                      {notification.href && !showSubstituteReviewLink ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-3 rounded-full border-[#3954d0]/35 text-[#3954d0] hover:bg-[#3954d0]/10"
                          onClick={() => {
                            appNotificationStore.markRead(notification.id);
                            navigate(notification.href!);
                          }}
                        >
                          {teacherNotificationHrefCtaLabel(notification.href, notification.kind)}
                        </Button>
                      ) : null}

                      {showSubstituteReviewLink && notification.refId ? (
                        <div className="mt-3 border-t border-foreground/10 pt-3">
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-full bg-[#3954d0] hover:bg-[#2f46b3]"
                            asChild
                          >
                            <Link to={`/dashboard/teacher/substitute-requests/${notification.refId}`}>
                              Review cover request
                            </Link>
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {notifications.length === 0 && (
            <div className="rounded-xl border border-gray-200/50 bg-white/50 py-16 text-center">
              <Bell className="mx-auto mb-4 h-12 w-12 text-foreground/30" />
              <p className="font-medium text-foreground/70">No notifications yet.</p>
              <p className="mt-1 text-sm text-foreground/50">
                When finance submits a payroll payout for your class, details will appear here.
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-6" asChild>
                <Link to="/dashboard/teacher/payroll">View payroll</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
