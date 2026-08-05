import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Loader2 } from "@/lib/icons";
import { useAuthSession } from "@/features/auth/context";
import { eduhubCourses } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

type ListTab = "pending" | "all";

function statusPill(t: TFunction, status: string) {
  const base = "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium";
  switch (status) {
    case "SCHEDULE_PENDING":
      return (
        <span className={cn(base, "border-amber-200 bg-amber-50 text-amber-900")}>
          {t("teacher.scheduleApprovals.status.actionNeeded")}
        </span>
      );
    case "SCHEDULE_APPROVED":
      return (
        <span className={cn(base, "border-emerald-200 bg-emerald-50 text-emerald-800")}>
          {t("teacher.scheduleApprovals.status.approved")}
        </span>
      );
    case "REJECTED":
      return (
        <span className={cn(base, "border-red-200 bg-red-50 text-red-800")}>
          {t("teacher.scheduleApprovals.status.rejected")}
        </span>
      );
    case "DRAFT":
      return (
        <span className={cn(base, "border-border bg-muted text-muted-foreground")}>
          {t("teacher.scheduleApprovals.status.draft")}
        </span>
      );
    case "PUBLISHED":
      return (
        <span className={cn(base, "border-emerald-200 bg-emerald-50 text-emerald-800")}>
          {t("teacher.scheduleApprovals.status.published")}
        </span>
      );
    default:
      return (
        <span className={cn(base, "border-border bg-muted text-muted-foreground")}>{status}</span>
      );
  }
}

function statusDescription(t: TFunction, status: string): string {
  switch (status) {
    case "SCHEDULE_APPROVED":
      return t("teacher.scheduleApprovals.statusDescriptions.scheduleApproved");
    case "DRAFT":
      return t("teacher.scheduleApprovals.statusDescriptions.draft");
    case "REJECTED":
      return t("teacher.scheduleApprovals.statusDescriptions.rejected");
    case "SCHEDULE_PENDING":
      return t("teacher.scheduleApprovals.statusDescriptions.pending");
    default:
      return t("teacher.scheduleApprovals.statusDescriptions.default");
  }
}

function CourseRow({
  course,
  emphasize,
  t,
}: {
  course: CourseSummaryResponse;
  emphasize?: boolean;
  t: TFunction;
}) {
  const created = new Date(course.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <li>
      <Link
        to={`/dashboard/teacher/courses/${course.id}/edit/schedule`}
        className={cn(
          "flex items-center gap-3 px-4 py-3.5 text-left transition-colors sm:px-5",
          emphasize ? "hover:bg-amber-50/50" : "hover:bg-muted/40",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{course.title}</p>
            {statusPill(t, course.status)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{statusDescription(t, course.status)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("teacher.scheduleApprovals.createdDate", { date: created })}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 text-xs font-medium",
            emphasize ? "text-teal-800" : "text-muted-foreground",
          )}
        >
          {emphasize
            ? t("teacher.scheduleApprovals.reviewButton")
            : t("teacher.scheduleApprovals.openButton")}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </li>
  );
}

export default function TeacherScheduleApprovalsPage() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [courses, setCourses] = useState<CourseSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ListTab>("pending");

  useEffect(() => {
    if (!user.id) return;
    let cancelled = false;
    setLoading(true);
    eduhubCourses
      .getByLecturer(user.id)
      .then((res) => {
        if (!cancelled) setCourses(res || []);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const pending = useMemo(
    () => courses.filter((c) => c.status === "SCHEDULE_PENDING"),
    [courses],
  );
  const other = useMemo(
    () => courses.filter((c) => c.status !== "SCHEDULE_PENDING"),
    [courses],
  );

  useEffect(() => {
    if (loading) return;
    if (pending.length === 0 && tab === "pending") setTab("all");
  }, [loading, pending.length, tab]);

  const list = tab === "pending" ? pending : other;

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
            {t("teacher.scheduleApprovals.title")}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t("teacher.scheduleApprovals.subtitle")}
          </p>
        </div>
        {pending.length > 0 ? (
          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium tabular-nums text-amber-900">
            {t("teacher.scheduleApprovals.pendingCount", { count: pending.length })}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("teacher.scheduleApprovals.loading")}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-left">
          <p className="text-sm font-medium text-foreground">{t("teacher.scheduleApprovals.empty")}</p>
          <Button
            asChild
            size="sm"
            className="mt-4 bg-teal-700 text-white hover:bg-teal-800"
          >
            <Link to="/dashboard/teacher/courses/new">{t("teacher.scheduleApprovals.addClass")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-border">
            <button
              type="button"
              onClick={() => setTab("pending")}
              className={cn(
                "-mb-px border-b-2 pb-2 text-sm font-medium transition-colors",
                tab === "pending"
                  ? "border-teal-700 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t("teacher.scheduleApprovals.pendingSectionTitle")}
              {pending.length > 0 ? (
                <span className="ml-1.5 tabular-nums text-muted-foreground">({pending.length})</span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setTab("all")}
              className={cn(
                "-mb-px border-b-2 pb-2 text-sm font-medium transition-colors",
                tab === "all"
                  ? "border-teal-700 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t("teacher.scheduleApprovals.allSectionTitle")}
              <span className="ml-1.5 tabular-nums text-muted-foreground">({other.length})</span>
            </button>
          </div>

          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-left">
              <p className="text-sm text-muted-foreground">
                {tab === "pending"
                  ? t("teacher.scheduleApprovals.emptyPending")
                  : t("teacher.scheduleApprovals.emptyOther")}
              </p>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
              {list.map((course) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  emphasize={course.status === "SCHEDULE_PENDING"}
                  t={t}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
