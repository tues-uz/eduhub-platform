import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Loader2 } from "@/lib/icons";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { eduhubAdminEnrollmentApplications, eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import { buildCourseScheduleSlots } from "@/features/courses/courseScheduleSlots";
import {
  buildScheduleMonthTabs,
  orderSessionSlotsChronologically,
} from "@/features/courses/classSchedulePreview";
import { formatPaymentMethodLabel } from "@/features/enrollment/enrollmentDocumentConfig";
import { ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED } from "@/features/enrollment/enrollmentInstallmentPaymentStore";
import { ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED } from "@/features/admin/data/adminEnrollmentPaidMonthsStore";
import { formatEnrollmentMoney } from "@/features/enrollment/enrollmentPaymentDisplay";
import { buildEnrollmentTablePaymentSummary } from "@/features/enrollment/enrollmentPaymentHistory";
import { cn } from "@/lib/utils";

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

function tuitionTableCell(
  r: EnrollmentApplicationResponse,
  summary: ReturnType<typeof buildEnrollmentTablePaymentSummary>,
) {
  const cur = r.priceCurrency ?? "USD";

  return (
    <div className="space-y-1.5 text-sm leading-snug">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold tabular-nums text-slate-900">{summary.headline}</span>
        {summary.pendingInstallmentCount > 0 ? (
          <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 ring-1 ring-sky-200/80">
            Review follow-up
          </span>
        ) : null}
      </div>

      {summary.sublines.map((line) => (
        <span key={line} className="block text-xs text-slate-500">
          {line}
        </span>
      ))}

      {!summary.showCurrentProgress ? (
        <>
          {r.paymentMethod ? (
            <span className="block text-xs font-medium text-slate-600">
              {formatPaymentMethodLabel(r.paymentMethod)}
            </span>
          ) : null}
          {r.downPaymentAmount != null && r.downPaymentAmount > 0 ? (
            <span className="block text-xs tabular-nums text-slate-600">
              {formatEnrollmentMoney(r.downPaymentAmount, cur)}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function AdminEnrollmentApplicationsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<EnrollmentApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tuitionTick, setTuitionTick] = useState(0);
  const [scheduleMonthsByCourse, setScheduleMonthsByCourse] = useState<Map<string, number>>(
    () => new Map(),
  );

  useEffect(() => {
    const bump = () => setTuitionTick((n) => n + 1);
    window.addEventListener(ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED, bump);
    window.addEventListener(ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED, bump);
    return () => {
      window.removeEventListener(ENROLLMENT_INSTALLMENT_PAYMENTS_CHANGED, bump);
      window.removeEventListener(ADMIN_ENROLLMENT_PAID_MONTHS_CHANGED, bump);
    };
  }, []);

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

  useEffect(() => {
    if (!rows.length) {
      setScheduleMonthsByCourse(new Map());
      return;
    }

    const courseIds = [
      ...new Set(rows.map((r) => r.courseId).filter((id) => isUuid(id))),
    ];
    if (!courseIds.length) {
      setScheduleMonthsByCourse(new Map());
      return;
    }

    let cancelled = false;
    void Promise.all(
      courseIds.map(async (courseId) => {
        try {
          const [course, proposal] = await Promise.all([
            eduhubCourses.getById(courseId),
            eduhubSchedule.getProposal(courseId).catch(() => null),
          ]);
          const slots = buildCourseScheduleSlots(course, proposal, courseId);
          const tabs = buildScheduleMonthTabs(orderSessionSlotsChronologically(slots));
          return [courseId, tabs.length] as const;
        } catch {
          return [courseId, 0] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const next = new Map<string, number>();
      for (const [courseId, count] of entries) {
        if (count > 0) next.set(courseId, count);
      }
      setScheduleMonthsByCourse(next);
    });

    return () => {
      cancelled = true;
    };
  }, [rows]);

  const pending = useMemo(() => rows.filter((r) => r.status === "PENDING"), [rows]);
  const followUpReviewCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.status === "APPROVED" &&
          buildEnrollmentTablePaymentSummary(r, scheduleMonthsByCourse.get(r.courseId))
            .pendingInstallmentCount > 0,
      ).length,
    // tuitionTick keeps follow-up badges in sync with local installment store
    [rows, tuitionTick, scheduleMonthsByCourse],
  );

  return (
      <div className="container mx-auto px-6">

        <AdminPageHeader
          title={t("adminNav.enrollmentApplications")}
          description={t("admin.enrollmentApplications.list.description")}
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {pending.length > 0 ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {pending.length} enrollment{pending.length === 1 ? "" : "s"} pending review
            </p>
          ) : (
            <p className="text-sm text-slate-600">{t("admin.enrollmentApplications.list.noPending")}</p>
          )}
          {followUpReviewCount > 0 ? (
            <p className="text-sm text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
              {followUpReviewCount} approved enrollment{followUpReviewCount === 1 ? "" : "s"} with follow-up
              tuition to review
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">{t("admin.shared.loadingApplications")}</span>
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
                  <TableHead>{t("admin.shared.submitted")}</TableHead>
                  <TableHead>{t("admin.shared.class")}</TableHead>
                  <TableHead>{t("admin.shared.student")}</TableHead>
                  <TableHead>{t("admin.enrollmentApplications.list.table.tuition")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right w-[140px]">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-12">
                      No applications yet. Students submit from Available Classes → Request enrollment.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const tuition = buildEnrollmentTablePaymentSummary(
                      r,
                      scheduleMonthsByCourse.get(r.courseId),
                    );
                    const hasFollowUp = tuition.pendingInstallmentCount > 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm whitespace-nowrap align-middle">
                          {formatDate(r.submittedAt)}
                        </TableCell>
                        <TableCell className="max-w-[220px] align-middle">
                          <span className="font-medium text-slate-900 line-clamp-2">
                            {r.courseTitle ?? r.courseId}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle">
                          <span className="font-medium text-slate-900">{r.fullName}</span>
                          <span
                            className="mt-0.5 block text-xs text-slate-500 truncate max-w-[200px]"
                            title={r.email}
                          >
                            {r.email}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle max-w-[260px]">
                          {tuitionTableCell(r, tuition)}
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex flex-col items-start gap-1.5">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                r.status === "PENDING"
                                  ? "bg-amber-100 text-amber-800"
                                  : r.status === "APPROVED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800",
                              )}
                            >
                              {r.status}
                            </span>
                            {r.status === "APPROVED" && hasFollowUp ? (
                              <span className="text-[11px] font-medium text-sky-700">{t("admin.enrollmentApplications.list.badgeFollowUpPayment")}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-middle">
                          <Button
                            asChild
                            size="sm"
                            variant={r.status === "APPROVED" && hasFollowUp ? "default" : "outline"}
                            className="gap-1.5"
                          >
                            <Link to={`/dashboard/admin/enrollment-applications/${encodeURIComponent(r.id)}`}>
                              <Eye className="h-3.5 w-3.5" aria-hidden />
                              {r.status === "APPROVED" && hasFollowUp ? t("admin.enrollmentApplications.list.reviewPayment") : t("admin.shared.review")}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
  );
}
