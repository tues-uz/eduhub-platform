import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "@/lib/icons";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { eduhubNotifications } from "@/api/eduhubClient";
import type { NotificationResponse } from "@/api/eduhubTypes";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function formatRelativeTime(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("teacher.notifications.time.justNow");
  if (mins < 60) return t("teacher.notifications.time.minutesAgo", { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("teacher.notifications.time.hoursAgo", { count: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 7) return t("teacher.notifications.time.daysAgo", { count: days });
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

function ctaLabel(href: string, t: (key: string) => string): string {
  const base = href.trim().split("?")[0].replace(/\/$/, "") || href;
  if (/^\/dashboard\/teacher\/courses\/[^/]+$/.test(base)) {
    return t("teacher.notifications.cta.openClassPage");
  }
  if (base === "/dashboard/teacher/courses") {
    return t("teacher.notifications.cta.viewMyClasses");
  }
  return t("teacher.notifications.cta.goToLinkedPage");
}

export default function TeacherNotifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const queryKey = ["notifications"];

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
    <div className="flex w-full min-w-0 flex-1 flex-col gap-4 px-4 py-4 text-left lg:px-6 md:gap-6 md:py-6">
      <Link
        to="/dashboard/teacher"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        {t("teacherSettings.backToDashboard")}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("teacher.notifications.title")}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t("teacher.notifications.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-foreground">
            {t("teacher.notifications.unreadCount", { count: unreadCount })}
          </span>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {t("teacher.notifications.markAllRead")}
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("teacher.notifications.loading")}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-left">
          <p className="text-sm font-medium text-foreground">{t("teacher.notifications.empty.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("teacher.notifications.empty.description")}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const clock = formatNotificationReceivedClock(notification.createdAt);
            return (
              <li key={notification.id}>
                <article className="relative rounded-xl border border-border bg-card px-4 py-4 text-left transition-colors sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {!notification.read ? (
                          <span
                            className="size-1.5 shrink-0 rounded-full bg-teal-600"
                            aria-hidden
                          />
                        ) : null}
                        <h2
                          className={cn(
                            "truncate text-sm font-semibold tracking-tight",
                            notification.read ? "text-foreground/80" : "text-foreground",
                          )}
                        >
                          {notification.title}
                        </h2>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {notification.body}
                      </p>
                    </div>
                    <time
                      dateTime={notification.createdAt}
                      className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground"
                      title={clock || undefined}
                    >
                      {formatRelativeTime(notification.createdAt, t)}
                    </time>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {notification.href ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-teal-800 hover:underline"
                        onClick={() => {
                          if (!notification.read) markReadMutation.mutate(notification.id);
                          navigate(notification.href!);
                        }}
                      >
                        {ctaLabel(notification.href, t)}
                      </button>
                    ) : null}
                    {!notification.read ? (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                        onClick={() => markReadMutation.mutate(notification.id)}
                      >
                        {t("teacher.notifications.markRead")}
                      </button>
                    ) : null}
                    {clock ? (
                      <span className="text-xs text-muted-foreground/80">{clock}</span>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
