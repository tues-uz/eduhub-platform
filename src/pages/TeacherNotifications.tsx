import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import {
  appNotificationStore,
  APP_NOTIFICATIONS_CHANGE_EVENT,
  type AppNotification,
} from "@/features/notifications/appNotificationStore";
import DashboardSidebar from "@/components/DashboardSidebar";

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

function getIcon(kind: AppNotification["kind"]) {
  switch (kind) {
    case "instructor_payroll_paid":
      return <CreditCard className="h-5 w-5 text-[#3954d0]" />;
    case "instructor_payroll_request_approved":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "instructor_payroll_request_rejected":
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Bell className="h-5 w-5 text-foreground/60" />;
  }
}

export default function TeacherNotifications() {
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();
  const [tick, setTick] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );

  const bump = useCallback(() => setTick((x) => x + 1), []);

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
            <p className="text-foreground/70 text-sm mt-1">Payroll and other instructor updates (in-app, local demo).</p>
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

          <div className="space-y-2">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => appNotificationStore.markRead(notification.id)}
                className={`w-full rounded-xl border p-5 text-left transition-colors ${
                  notification.read
                    ? "border-gray-200/50 bg-white/80 hover:bg-gray-50/50"
                    : "border-blue-200/50 bg-blue-50/50 hover:bg-blue-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                    {getIcon(notification.kind)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          notification.read ? "text-foreground/80" : "text-foreground"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
                    </div>
                    <p className="mt-1 text-sm text-foreground/60 whitespace-pre-wrap">{notification.body}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground/50">
                      <Clock className="h-3.5 w-3.5" />
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
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
