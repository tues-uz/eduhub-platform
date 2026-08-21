import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Download, Eye, Loader2, Star } from "@/lib/icons";
import { toast } from "sonner";
import { eduhubCompletion, eduhubQuizGrading } from "@/api/eduhubClient";
import type { CourseGradebookRowResponse } from "@/api/eduhubTypes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadCourseCertificatePdf } from "@/features/courses/courseCertificatePdf";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";
import { cn } from "@/lib/utils";
import type { StudentCourseReviewSummary } from "@/features/student/courseReviewsStorage";
import { useTranslation } from "react-i18next";

export type RosterStudentRow = {
  id: string;
  fullName: string;
  email: string;
};

type GradeReviewSummary = {
  instructorRating: number | null;
  platformRating: number | null;
  instructorComment?: string;
  platformComment?: string;
};

type GradeTableRow = {
  studentId: string;
  fullName: string;
  email: string;
  attended: number;
  plannedTotal: number | null;
  attendanceScore: number | null;
  quizTotal: number | null;
  instructorScore?: number | null;
  totalFinalScore: number | null;
  dirty: boolean;
  reviews: GradeReviewSummary;
  published: boolean;
  certificate?: CourseGradebookRowResponse["certificate"];
  apiRow: CourseGradebookRowResponse;
};

type TeacherCourseGradesPanelProps = {
  courseId: string;
  courseTitle: string;
  students: RosterStudentRow[];
  instructorEmail: string;
  instructorName?: string;
  isApiCourse: boolean;
  isLoading?: boolean;
  isError?: boolean;
  /** Planned sessions in six months (from class settings). */
  plannedSessions?: number | null;
};

function ReviewStarsRow({ rating }: { rating: number }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={t("teacher.grades.starsAriaLabel", { rating })}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-4 w-4 shrink-0",
            n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
          aria-hidden
        />
      ))}
      <span className="ml-1.5 text-sm font-medium tabular-nums text-foreground">{rating}/5</span>
    </div>
  );
}

function formatReviewDate(iso?: string): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StudentReviewDialog({
  open,
  onOpenChange,
  studentName,
  studentEmail,
  reviews,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentEmail: string;
  reviews: StudentCourseReviewSummary;
}) {
  const { t } = useTranslation();
  const instructorDate = formatReviewDate(reviews.instructorSubmittedAt);
  const platformDate = formatReviewDate(reviews.platformSubmittedAt);

  const displayName = formatDisplayPersonName(studentName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("teacher.grades.reviewDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("teacher.grades.reviewDialog.description", { name: displayName })} ({studentEmail})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-1">
          {reviews.instructorRating != null ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                {t("teacher.grades.reviewDialog.instructorRating")}
              </h3>
              <ReviewStarsRow rating={reviews.instructorRating} />
              {reviews.instructorComment?.trim() ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {reviews.instructorComment.trim()}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("teacher.grades.reviewDialog.noComment")}</p>
              )}
              {instructorDate ? (
                <p className="text-xs text-muted-foreground">
                  {t("teacher.grades.reviewDialog.submitted", { date: instructorDate })}
                </p>
              ) : null}
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("teacher.grades.reviewDialog.noInstructorReview")}
            </p>
          )}
          {reviews.platformRating != null ? (
            <section className="space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-foreground">
                {t("teacher.grades.reviewDialog.platformRating")}
              </h3>
              <ReviewStarsRow rating={reviews.platformRating} />
              {reviews.platformComment?.trim() ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {reviews.platformComment.trim()}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("teacher.grades.reviewDialog.noComment")}</p>
              )}
              {platformDate ? (
                <p className="text-xs text-muted-foreground">
                  {t("teacher.grades.reviewDialog.submitted", { date: platformDate })}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function gradeReviewToSummary(reviews: GradeReviewSummary): StudentCourseReviewSummary {
  return {
    instructorRating: reviews.instructorRating,
    platformRating: reviews.platformRating,
    instructorComment: reviews.instructorComment,
    platformComment: reviews.platformComment,
  };
}

function RosterEmptyState({
  isApiCourse,
  isLoading,
  isError,
  studentsLength,
}: {
  isApiCourse: boolean;
  isLoading: boolean;
  isError: boolean;
  studentsLength: number;
}) {
  const { t } = useTranslation();
  if (!isApiCourse) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        {t("teacher.grades.empty.connectApi")}
      </div>
    );
  }
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("teacher.grades.empty.loading")}</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-600">{t("teacher.grades.empty.error")}</p>;
  }
  if (studentsLength === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        {t("teacher.grades.empty.noStudents")}
      </div>
    );
  }
  return null;
}

export function TeacherCourseGradesPanel({
  courseId,
  instructorName,
  isApiCourse,
  isLoading = false,
  isError = false,
}: TeacherCourseGradesPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
  const [reviewStudent, setReviewStudent] = useState<{
    name: string;
    email: string;
    reviews: StudentCourseReviewSummary;
  } | null>(null);

  const apiGradesQuery = useQuery({
    queryKey: ["teacher", "course-gradebook", courseId],
    queryFn: () => eduhubCompletion.gradebook(courseId),
    enabled: isApiCourse,
  });

  const quizScoresQuery = useQuery({
    queryKey: ["teacher", "quiz-scores", courseId],
    queryFn: () => eduhubQuizGrading.getScores(courseId),
    enabled: isApiCourse,
  });

  const saveApiGradeMutation = useMutation({
    mutationFn: ({ row, score }: { row: CourseGradebookRowResponse; score: number }) =>
      eduhubCompletion.saveGrade(courseId, row.studentId, { instructorScore: score }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["teacher", "course-gradebook", courseId] });
      toast.success("Grade saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save grade."),
  });

  const publishApiCertificateMutation = useMutation({
    mutationFn: (studentId: string) => eduhubCompletion.publishCertificate(courseId, studentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["teacher", "course-gradebook", courseId] });
      toast.success("Certificate published");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not publish certificate."),
  });

  const publishAllApiCertificatesMutation = useMutation({
    mutationFn: () => eduhubCompletion.publishAllCertificates(courseId),
    onSuccess: (certificates) => {
      void queryClient.invalidateQueries({ queryKey: ["teacher", "course-gradebook", courseId] });
      toast.success(`Published ${certificates.length} certificate${certificates.length === 1 ? "" : "s"}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not publish certificates."),
  });

  const downloadPublishedCertificate = async (studentId: string) => {
    const row = apiGradesQuery.data?.find((r) => r.studentId === studentId);
    if (!row?.certificate) return;
    setDownloadingCertId(studentId);
    try {
      await downloadCourseCertificatePdf(row.certificate, instructorName);
      toast.success(t("teacher.grades.toast.certificateDownloaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("teacher.grades.toast.downloadFailed"));
    } finally {
      setDownloadingCertId(null);
    }
  };

  const effectiveLoading = isApiCourse ? apiGradesQuery.isLoading : isLoading;
  const effectiveError = isApiCourse ? apiGradesQuery.isError : isError;
  const apiRows = useMemo(() => apiGradesQuery.data ?? [], [apiGradesQuery.data]);
  const quizScoresByStudent = useMemo(() => quizScoresQuery.data ?? {}, [quizScoresQuery.data]);

  const tableRows = useMemo((): GradeTableRow[] => {
    return apiRows.map((row) => {
      const rowScores = quizScoresByStudent[row.studentId];
      const quizTotal = rowScores
        ? Object.values(rowScores).reduce((sum, v) => sum + v, 0)
        : null;
      const savedInstructor = row.instructorScore;
      return {
        studentId: row.studentId,
        fullName: row.studentName,
        email: row.studentEmail,
        attended: row.attendanceAttended,
        plannedTotal: row.attendanceTotal,
        attendanceScore: row.attendanceScore,
        quizTotal,
        instructorScore: savedInstructor,
        totalFinalScore: row.totalFinalScore,
        dirty: quizTotal != null && quizTotal !== savedInstructor,
        reviews: row.reviewSummary,
        published: Boolean(row.certificate),
        certificate: row.certificate,
        apiRow: row,
      };
    });
  }, [apiRows, quizScoresByStudent]);

  const rosterGate = (
    <RosterEmptyState
      isApiCourse={isApiCourse}
      isLoading={effectiveLoading}
      isError={effectiveError}
      studentsLength={tableRows.length}
    />
  );

  const showTable = !effectiveLoading && !effectiveError && tableRows.length > 0;

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {t("teacher.grades.title")}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">{t("teacher.grades.intro")}</p>
        </div>
        {showTable ? (
          <Button
            type="button"
            size="sm"
            className="shrink-0 gap-1.5 bg-teal-700 hover:bg-teal-800"
            disabled={publishAllApiCertificatesMutation.isPending}
            onClick={() => publishAllApiCertificatesMutation.mutate()}
          >
            {publishAllApiCertificatesMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Award className="h-3.5 w-3.5" />
            )}
            {t("teacher.grades.publishAll")}
          </Button>
        ) : null}
      </div>

      {rosterGate}
      {showTable ? (
        <div className="space-y-3">
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="sticky left-0 z-20 min-w-[14rem] border-b border-r border-border bg-muted px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]">
                      {t("teacher.grades.table.student")}
                    </th>
                    <th
                      className="border-b border-r border-border px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                      title={t("teacher.grades.table.headerTitles.sessions")}
                    >
                      {t("teacher.grades.table.sessions")}
                    </th>
                    <th
                      className="border-b border-r border-border px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                      title={t("teacher.grades.table.headerTitles.attendance")}
                    >
                      {t("teacher.grades.table.attendance")}
                    </th>
                    <th
                      className="border-b border-r border-border px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                      title={t("teacher.grades.table.headerTitles.total")}
                    >
                      {t("teacher.grades.table.total")}
                    </th>
                    <th className="border-b border-r border-border px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                      {t("teacher.grades.table.feedback")}
                    </th>
                    <th className="sticky right-0 z-20 border-b border-l border-border bg-muted px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.12)] whitespace-nowrap">
                      {t("teacher.grades.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => {
                    const liveTotal = row.quizTotal;
                    const canPublish = row.totalFinalScore != null && !row.published;
                    const savingThisRow =
                      saveApiGradeMutation.isPending &&
                      saveApiGradeMutation.variables?.row.studentId === row.studentId;
                    const publishingThisRow =
                      publishApiCertificateMutation.isPending &&
                      publishApiCertificateMutation.variables === row.studentId;
                    const downloadingThisRow = downloadingCertId === row.studentId;
                    const displayName = formatDisplayPersonName(row.fullName);
                    return (
                      <tr key={row.studentId} className="group hover:bg-muted/20">
                        <td className="sticky left-0 z-10 border-b border-r border-border bg-background px-3 py-2.5 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)] group-hover:bg-muted">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar className="size-8 shrink-0">
                              <AvatarFallback className="text-[11px]">
                                {profileInitials(displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{displayName}</p>
                              <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="border-b border-r border-border px-3 py-2.5 text-center text-sm tabular-nums whitespace-nowrap">
                          {row.plannedTotal != null ? (
                            <>
                              <span className="font-medium text-foreground">{row.attended}</span>
                              <span className="text-muted-foreground">/{row.plannedTotal}</span>
                            </>
                          ) : (
                            <>
                              <span className="font-medium text-foreground">{row.attended}</span>
                              <span className="text-xs text-muted-foreground">
                                {" "}
                                {t("teacher.grades.feedback.sessions")}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="border-b border-r border-border px-3 py-2.5 text-right text-sm tabular-nums whitespace-nowrap">
                          {row.attendanceScore != null ? (
                            <span className="font-medium text-foreground">{row.attendanceScore}%</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="border-b border-r border-border px-3 py-2.5 text-right text-sm tabular-nums whitespace-nowrap">
                          {liveTotal != null ? (
                            <span className="font-semibold text-teal-800">{liveTotal}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="border-b border-r border-border px-3 py-2.5">
                          {row.reviews.instructorRating != null ? (
                            <div className="inline-flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums text-foreground">
                                <Star
                                  className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400"
                                  aria-hidden
                                />
                                {row.reviews.instructorRating}/5
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-teal-800 hover:bg-teal-50 hover:text-teal-900"
                                onClick={() =>
                                  setReviewStudent({
                                    name: row.fullName,
                                    email: row.email,
                                    reviews: gradeReviewToSummary(row.reviews),
                                  })
                                }
                              >
                                <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                {t("teacher.grades.feedback.readReview")}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {t("teacher.grades.feedback.pending")}
                            </span>
                          )}
                        </td>
                        <td className="sticky right-0 z-10 border-b border-l border-border bg-background px-2 py-2 text-center align-middle whitespace-nowrap shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.12)] group-hover:bg-muted">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs"
                              disabled={savingThisRow || !row.dirty || row.quizTotal == null}
                              onClick={() => {
                                if (row.quizTotal == null) {
                                  toast.error(t("teacher.grades.noQuizScores"));
                                  return;
                                }
                                saveApiGradeMutation.mutate({ row: row.apiRow, score: row.quizTotal });
                              }}
                            >
                              {savingThisRow ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : row.instructorScore != null ? (
                                t("teacher.grades.actions.update")
                              ) : (
                                t("teacher.grades.actions.save")
                              )}
                            </Button>
                            {row.published ? (
                              <div className="inline-flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                                  <Award className="h-3 w-3" aria-hidden />
                                  {t("teacher.grades.actions.done")}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  disabled={downloadingThisRow}
                                  onClick={() => void downloadPublishedCertificate(row.studentId)}
                                >
                                  {downloadingThisRow ? (
                                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                                  ) : (
                                    <Download className="h-3 w-3" aria-hidden />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 px-2.5 text-xs"
                                disabled={!canPublish || publishingThisRow}
                                onClick={() => publishApiCertificateMutation.mutate(row.studentId)}
                              >
                                {publishingThisRow ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Award className="h-3 w-3 shrink-0" aria-hidden />
                                )}
                                {t("teacher.grades.actions.publish")}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("teacher.grades.footnote")}</p>
        </div>
      ) : null}
      {reviewStudent ? (
        <StudentReviewDialog
          open
          onOpenChange={(open) => {
            if (!open) setReviewStudent(null);
          }}
          studentName={reviewStudent.name}
          studentEmail={reviewStudent.email}
          reviews={reviewStudent.reviews}
        />
      ) : null}
    </div>
  );
}
