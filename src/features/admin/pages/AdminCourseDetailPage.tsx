import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Calendar, CheckCircle2, Clock3, FileText } from "@/lib/icons";
import { eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { AdminCourseReviewDialog } from "@/features/admin/components/AdminCourseReviewDialog";
import { CourseStatusBadge } from "@/features/admin/components/AdminStatusBadges";
import { useTranslation } from "react-i18next";
import {
  mergeScheduleDisplayForAdminReview,
  useAdminCourseLocalDataVersion,
} from "@/features/admin/utils/adminCourseScheduleDisplay";
import { courseScheduleWorkflowStore } from "@/features/courses/courseScheduleWorkflowStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function formatSubmitted(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function formatClassDate(iso?: string): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 shrink-0">{label}</span>
      <div className="text-slate-900 text-right min-w-0">{children}</div>
    </div>
  );
}

export default function AdminCourseDetailPage() {
  const { t } = useTranslation();
  const { courseId = "" } = useParams<{ courseId: string }>();
  const [reviewOpen, setReviewOpen] = useState(false);
  const adminLocalDataVersion = useAdminCourseLocalDataVersion();

  const enabled = !!courseId && isUuid(courseId);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "course-detail", courseId, adminLocalDataVersion],
    queryFn: async () => {
      const [course, scheduleProposal] = await Promise.all([
        eduhubCourses.getById(courseId),
        eduhubSchedule.getProposal(courseId).catch(() => null),
      ]);
      return { course, scheduleProposal };
    },
    enabled,
  });
  const detail = data?.course;
  const scheduleProposal = data?.scheduleProposal ?? null;

  const scheduleWorkflow = useMemo(
    () => (courseId && isUuid(courseId) ? courseScheduleWorkflowStore.get(courseId) : null),
    [courseId, adminLocalDataVersion],
  );

  const scheduleDisplay = useMemo(() => {
    if (!detail || !courseId || !isUuid(courseId)) return null;
    return mergeScheduleDisplayForAdminReview(courseId, detail, { apiProposal: scheduleProposal });
  }, [detail, courseId, scheduleProposal, adminLocalDataVersion]);

  if (!enabled) {
    return (
        <div className="container mx-auto px-6">
          <p className="text-sm text-red-600">{t("admin.courses.detail.invalidId")}</p>
          <Link to="/dashboard/admin/courses" className="text-sm text-slate-600 hover:underline mt-4 inline-block">
            ← Back to all classes
          </Link>
        </div>
    );
  }

  const meta = detail?.pricing;
  const isDraftOrRejected = detail?.status === "DRAFT" || detail?.status === "REJECTED";

  return (
      <div className="container mx-auto px-6 max-w-3xl pb-10">
        <Link
          to="/dashboard/admin/courses"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          All classes
        </Link>

        {isLoading ? (
          <p className="text-sm text-slate-600">{t("admin.shared.loadingClass")}</p>
        ) : error || !detail ? (
          <p className="text-sm text-red-600">{t("admin.courses.detail.loadError")}</p>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{detail.title}</h1>
                <p className="text-sm text-slate-600 mt-1">{t("admin.courses.detail.subtitle")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link to={`/dashboard/admin/courses/${courseId}/schedule`}>
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </Link>
                </Button>
                <Button type="button" size="sm" className="gap-1.5 bg-slate-900 hover:bg-slate-800" onClick={() => setReviewOpen(true)}>
                  <FileText className="h-4 w-4" />
                  {isDraftOrRejected ? t("admin.courses.detail.reviewPricing") : t("admin.courses.detail.catalogPricing")}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("admin.courses.detail.overview")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm">
                  <DetailRow label={t("admin.shared.category")}>{detail.category ?? "—"}</DetailRow>
                  <DetailRow label={t("admin.shared.lecturer")}>{detail.lecturer?.fullName ?? "—"}</DetailRow>
                  <DetailRow label={t("admin.dashboard.recentUsers.statusPlaceholder")}>
                    <CourseStatusBadge status={detail.status} />
                  </DetailRow>
                  <DetailRow label={t("admin.courses.detail.fields.submitted")}>
                    <span className="tabular-nums whitespace-nowrap" title={detail.createdAt}>
                      {formatSubmitted(detail.createdAt)}
                    </span>
                  </DetailRow>
                  <DetailRow label={t("admin.courses.detail.fields.enrollments")}>
                    <span className="tabular-nums">{detail.enrollmentCount ?? "—"}</span>
                  </DetailRow>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("admin.courses.detail.pricing")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm">
                  <DetailRow label={t("admin.courses.detail.fields.catalogPrice")}>
                    {meta ? formatMoney(meta.amount, meta.currency) : "—"}
                  </DetailRow>
                  <DetailRow label={t("admin.courses.detail.fields.referralCode")}>
                    <span className="font-mono text-xs">{meta?.referralCode?.trim() ? meta.referralCode : "—"}</span>
                  </DetailRow>
                  <DetailRow label={t("admin.courses.detail.fields.discount")}>
                    {meta && meta.discountPercent > 0 ? `${meta.discountPercent}%` : "—"}
                  </DetailRow>
                  <DetailRow label={t("admin.courses.detail.fields.discountedPrice")}>
                    {meta && meta.discountPercent > 0 ? formatMoney(meta.discountedAmount, meta.currency) : "—"}
                  </DetailRow>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("admin.courses.detail.schedule")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {scheduleWorkflow?.status === "approved" ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-900 gap-1"
                        title={
                          scheduleWorkflow.reviewedAt
                            ? `Approved ${formatSubmitted(scheduleWorkflow.reviewedAt)}`
                            : undefined
                        }
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Instructor approved
                      </Badge>
                    ) : scheduleWorkflow?.status === "pending_instructor" ? (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-950 gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        Awaiting instructor
                      </Badge>
                    ) : scheduleWorkflow?.status === "instructor_rejected" ? (
                      <Badge
                        variant="outline"
                        className="border-red-200 bg-red-50 text-red-900 gap-1 max-w-full"
                        title={scheduleWorkflow.rejectionNote}
                      >
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{t("admin.courses.detail.scheduleBadges.changesRequested")}</span>
                      </Badge>
                    ) : (
                      <span className="text-slate-600">{t("admin.courses.detail.scheduleBadges.noApprovalRecorded")}</span>
                    )}
                  </div>
                  <div className="rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">{t("admin.courses.detail.fields.totalSessions")}</span>
                      <span className="tabular-nums font-medium text-slate-900">
                        {scheduleDisplay?.sessionsSixMo != null ? scheduleDisplay.sessionsSixMo : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">{t("admin.courses.detail.fields.classStart")}</span>
                      <span className="tabular-nums text-slate-900">{formatClassDate(scheduleDisplay?.classStartDate)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">{t("admin.courses.detail.fields.classEnd")}</span>
                      <span className="tabular-nums text-slate-900">{formatClassDate(scheduleDisplay?.classEndDate)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("admin.courses.detail.description")}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-slate-800 whitespace-pre-wrap break-words">
                  {detail.description?.trim() ? detail.description : "—"}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <AdminCourseReviewDialog
          courseId={reviewOpen ? courseId : null}
          courseTitle={detail?.title}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
        />
      </div>
  );
}
