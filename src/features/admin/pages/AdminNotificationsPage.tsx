import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, Clock, Loader2, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eduhubNotifications } from "@/api/eduhubClient";
import type { NotificationResponse } from "@/api/eduhubTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function iconFor(kind: string) {
  switch (kind) {
    case "course_published":
    case "enrollment_approved":
    case "schedule_approved":
      return <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden />;
    case "course_rejected":
    case "enrollment_rejected":
      return <XCircle className="h-5 w-5 text-red-500" aria-hidden />;
    case "schedule_proposed":
      return <Clock className="h-5 w-5 text-[#3954d0]" aria-hidden />;
    case "lecturer_created_course":
    case "admin_enrollment_action":
      return <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden />;
    default:
      return <Bell className="h-5 w-5 text-slate-600" aria-hidden />;
  }
}

function categoryLabel(kind: string): "Student" | "Teacher" | "System" {
  switch (kind) {
    case "admin_enrollment_action":
    case "enrollment_approved":
    case "enrollment_rejected":
      return "Student";
    case "lecturer_created_course":
    case "schedule_proposed":
    case "schedule_approved":
    case "course_published":
    case "course_rejected":
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

export default function AdminNotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const queryKey = ["notifications"];
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "student" | "teacher">("all");

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchesText = (n: NotificationResponse) =>
      !q || [n.title, n.body, n.kind].join(" ").toLowerCase().includes(q);

    const matchesFilter = (n: NotificationResponse) => {
      if (filter === "all") return true;
      return categoryLabel(n.kind) === (filter === "student" ? "Student" : "Teacher");
    };

    return notifications.filter((n) => matchesFilter(n) && matchesText(n));
  }, [notifications, search, filter]);

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Notifications</h1>
            <p className="text-sm text-slate-600 mt-1">Admin activity alerts and updates.</p>
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
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Mark all read
            </Button>
          ) : null}
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

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading notifications…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
            {notifications.length === 0 ? "No notifications yet." : "No notifications match your search."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
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
                      </div>

                      <p className="mt-2 text-sm text-slate-600 line-clamp-4 whitespace-pre-wrap">{n.body}</p>
                      {!n.read ? (
                        <button
                          type="button"
                          className="mt-2 text-xs font-medium text-[#3954d0] hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            markReadMutation.mutate(n.id);
                          }}
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
                    if (!n.read) markReadMutation.mutate(n.id);
                    if (n.href) navigate(n.href);
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
