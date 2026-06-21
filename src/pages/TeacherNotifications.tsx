import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Bell, CheckCircle2, Clock, Loader2, XCircle } from "@/lib/icons";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import { eduhubNotifications } from "@/api/eduhubClient";
import type { NotificationResponse } from "@/api/eduhubTypes";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useTranslation } from "react-i18next";

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

function getIcon(kind: string) {
  switch (kind) {
    case "schedule_proposed":
      return <Clock className="h-5 w-5 text-[#3954d0]" />;
    case "course_published":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "course_rejected":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Bell className="h-5 w-5 text-foreground/60" />;
  }
}

function ctaLabel(href: string): string {
  const base = href.trim().split("?")[0].replace(/\/$/, "") || href;
  if (/^\/dashboard\/teacher\/courses\/[^/]+$/.test(base)) return "Open this class page";
  if (base === "/dashboard/teacher/courses") return "View my classes";
  return "Go to linked page";
}

export default function TeacherNotifications() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const queryKey = ["notifications"];

  const [isSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => eduhubNotifications.list(),
  });

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => eduhubNotifications.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<NotificationResponse[]>(queryKey);
      queryClient.setQueryData<NotificationResponse[]>(queryKey, (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => eduhubNotifications.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<NotificationResponse[]>(queryKey);
      queryClient.setQueryData<NotificationResponse[]>(queryKey, (old) =>
        (old ?? []).map((n) => ({ ...n, read: true })),
      );
      return { prev };
    },
    onError: (_err, _ctx, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });

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
          >{t("teacherSettings.backToDashboard")}</Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("common.notifications")}</h1>
            <p className="text-foreground/70 text-sm mt-1">
              Class schedule, publishing, and other updates.
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
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                >{t("teacher.notifications.markAllRead")}</Button>
              ) : null}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />{t("teacher.notifications.loading")}</div>
          ) : (
            <>
              <div className="space-y-3">
                {notifications.map((notification) => (
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
                          {!notification.read ? (
                            <button
                              type="button"
                              className="text-xs font-medium text-blue-600 hover:underline shrink-0"
                              onClick={() => markReadMutation.mutate(notification.id)}
                            >{t("teacher.notifications.markRead")}</button>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm leading-relaxed text-foreground/65 whitespace-pre-wrap">
                          {notification.body}
                        </p>

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

                        {notification.href ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-3 rounded-full border-[#3954d0]/35 text-[#3954d0] hover:bg-[#3954d0]/10"
                            onClick={() => {
                              if (!notification.read) markReadMutation.mutate(notification.id);
                              navigate(notification.href!);
                            }}
                          >
                            {ctaLabel(notification.href)}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {notifications.length === 0 && (
                <div className="rounded-xl border border-gray-200/50 bg-white/50 py-16 text-center">
                  <Bell className="mx-auto mb-4 h-12 w-12 text-foreground/30" />
                  <p className="font-medium text-foreground/70">{t("teacher.notifications.empty.title")}</p>
                  <p className="mt-1 text-sm text-foreground/50">
                    Schedule proposals, class publishing updates, and other notifications will appear here.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
