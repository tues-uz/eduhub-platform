import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Download, Eye, GraduationCap, Loader2, Star } from "@/lib/icons";
import { toast } from "sonner";
import { eduhubCompletion } from "@/api/eduhubClient";
import type { CourseGradebookRowResponse } from "@/api/eduhubTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ATTENDANCE_ROLL_CHANGED,
  ATTENDANCE_ROLL_STORAGE_KEY,
  countSessionsStudentAttended,
} from "@/features/attendance/attendanceRollStorage";
import {
  COURSE_CERTIFICATES_CHANGED,
  getCourseCertificate,
  issueCourseCertificate,
  listCourseCertificates,
} from "@/features/courses/courseCertificatesStorage";
import { downloadCourseCertificatePdf } from "@/features/courses/courseCertificatePdf";
import { formatDisplayPersonName } from "@/lib/formatPersonName";
import {
  COURSE_REVIEWS_CHANGED,
  getStudentCourseReviewSummary,
  type StudentCourseReviewSummary,
} from "@/features/student/courseReviewsStorage";
import { useTranslation } from "react-i18next";
import {
  computeAttendanceScore,
  computeTotalFinalScore,
  COURSE_FINAL_GRADES_CHANGED,
  listCourseFinalGrades,
  parseFinalScoreInput,
  readInstructorScore,
  saveCourseFinalGrade,
  type CourseFinalGradeRecord,
} from "@/features/teacher/data/courseFinalGradesStorage";

export type RosterStudentRow = {
  id: string;
  fullName: string;
  email: string;
};

type DraftRow = {
  score: string;
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
  instructorScore?: number | null;
  totalFinalScore: number | null;
  draft: DraftRow;
  dirty: boolean;
  reviews: GradeReviewSummary;
  published: boolean;
  certificate?: CourseGradebookRowResponse["certificate"] | ReturnType<typeof getCourseCertificate>;
  apiRow?: CourseGradebookRowResponse;
  localStudent?: RosterStudentRow;
  localSaved?: CourseFinalGradeRecord;
};

type TeacherCourseGradesPanelProps = {
  courseId: string;
  courseTitle: string;
  students: RosterStudentRow[];
  instructorEmail: string;
  instructorName?: string;
  isSubstituteViewer?: boolean;
  isApiCourse: boolean;
  isLoading?: boolean;
  isError?: boolean;
  /** Planned sessions in six months (from class settings). */
  plannedSessions?: number | null;
};

function draftFromRecord(record?: CourseFinalGradeRecord): DraftRow {
  const instructor = readInstructorScore(record);
  return {
    score: instructor != null ? String(instructor) : "",
  };
}

function draftFromApiRow(row?: CourseGradebookRowResponse): DraftRow {
  return {
    score: row?.instructorScore != null ? String(row.instructorScore) : "",
  };
}

function ReviewStarsRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 shrink-0 ${
            n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
          }`}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Student review</DialogTitle>
          <DialogDescription>
            Feedback from {formatDisplayPersonName(studentName)} ({studentEmail}) after completing this class.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-1">
          {reviews.instructorRating != null ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Instructor rating</h3>
              <ReviewStarsRow rating={reviews.instructorRating} />
              {reviews.instructorComment?.trim() ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{reviews.instructorComment.trim()}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No comment.</p>
              )}
              {instructorDate ? (
                <p className="text-xs text-muted-foreground">{t("teacher.assignments.submissions.table.submitted")}{instructorDate}</p>
              ) : null}
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">No instructor review yet.</p>
          )}
          {reviews.platformRating != null ? (
            <section className="space-y-2 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-medium text-foreground">Platform rating</h3>
              <ReviewStarsRow rating={reviews.platformRating} />
              {reviews.platformComment?.trim() ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{reviews.platformComment.trim()}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No comment.</p>
              )}
              {platformDate ? (
                <p className="text-xs text-muted-foreground">{t("teacher.assignments.submissions.table.submitted")}{platformDate}</p>
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
  isSubstituteViewer,
  isApiCourse,
  isLoading,
  isError,
  studentsLength,
}: {
  isSubstituteViewer: boolean;
  isApiCourse: boolean;
  isLoading: boolean;
  isError: boolean;
  studentsLength: number;
}) {
  const { t } = useTranslation();
  if (isSubstituteViewer) {
    return (
      <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 leading-relaxed">
        <p className="font-semibold text-amber-950">{t("teacher.grades.empty.substitute")}</p>
        <p className="mt-2 text-amber-950/90">
          {t("teacher.grades.empty.substitute")}
        </p>
      </div>
    );
  }
  if (!isApiCourse) {
    return (
      <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
        {t("teacher.grades.empty.connectApi")}
      </p>
    );
  }
  if (isLoading) {
    return <p className="text-sm text-foreground/60">{t("teacher.grades.empty.loading")}</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-600">{t("teacher.grades.empty.error")}</p>;
  }
  if (studentsLength === 0) {
    return (
      <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">{t("teacher.grades.empty.noStudents")}</p>
    );
  }
  return null;
}

export function TeacherCourseGradesPanel({
  courseId,
  courseTitle,
  students,
  instructorEmail,
  instructorName,
  isSubstituteViewer = false,
  isApiCourse,
  isLoading = false,
  isError = false,
  plannedSessions = null,
}: TeacherCourseGradesPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [gradesTick, setGradesTick] = useState(0);
  const [certTick, setCertTick] = useState(0);
  const [attendanceTick, setAttendanceTick] = useState(0);
  const [reviewsTick, setReviewsTick] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | "all" | null>(null);
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [reviewStudent, setReviewStudent] = useState<{
    name: string;
    email: string;
    reviews: StudentCourseReviewSummary;
  } | null>(null);

  const apiGradesQuery = useQuery({
    queryKey: ["teacher", "course-gradebook", courseId],
    queryFn: () => eduhubCompletion.gradebook(courseId),
    enabled: isApiCourse && !isSubstituteViewer,
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

  const savedGrades = useMemo(() => {
    void gradesTick;
    return listCourseFinalGrades(courseId);
  }, [courseId, gradesTick]);

  useEffect(() => {
    const bumpGrades = (e: Event) => {
      const ce = e as CustomEvent<{ courseId?: string }>;
      if (!ce.detail?.courseId || ce.detail.courseId === courseId) {
        setGradesTick((t) => t + 1);
      }
    };
    window.addEventListener(COURSE_FINAL_GRADES_CHANGED, bumpGrades);
    return () => window.removeEventListener(COURSE_FINAL_GRADES_CHANGED, bumpGrades);
  }, [courseId]);

  useEffect(() => {
    const bump = () => setCertTick((t) => t + 1);
    window.addEventListener(COURSE_CERTIFICATES_CHANGED, bump);
    return () => window.removeEventListener(COURSE_CERTIFICATES_CHANGED, bump);
  }, []);

  useEffect(() => {
    const bump = () => setAttendanceTick((t) => t + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === ATTENDANCE_ROLL_STORAGE_KEY) bump();
    };
    window.addEventListener(ATTENDANCE_ROLL_CHANGED, bump);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ATTENDANCE_ROLL_CHANGED, bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const bump = (e: Event) => {
      const ce = e as CustomEvent<{ courseId?: string }>;
      if (!ce.detail?.courseId || ce.detail.courseId === courseId) {
        setReviewsTick((t) => t + 1);
      }
    };
    window.addEventListener(COURSE_REVIEWS_CHANGED, bump);
    return () => window.removeEventListener(COURSE_REVIEWS_CHANGED, bump);
  }, [courseId]);

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, DraftRow> = {};
      if (isApiCourse) {
        for (const row of apiGradesQuery.data ?? []) {
          next[row.studentId] = prev[row.studentId] ?? draftFromApiRow(row);
        }
      } else {
        for (const s of students) {
          next[s.id] = prev[s.id] ?? draftFromRecord(savedGrades[s.id]);
        }
      }
      return next;
    });
  }, [apiGradesQuery.data, isApiCourse, savedGrades, students]);

  const updateDraft = useCallback((studentId: string, patch: Partial<DraftRow>) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...patch },
    }));
  }, []);

  const handleSave = useCallback(
    (student: RosterStudentRow, attendanceScore: number | null) => {
      const draft = drafts[student.id] ?? { score: "" };
      const instructorScore = parseFinalScoreInput(draft.score);
      if (instructorScore == null) {
        toast.error("Enter an instructor score from 0 to 100.");
        return;
      }
      setSavingId(student.id);
      try {
        const existing = savedGrades[student.id];
        const totalFinalScore = computeTotalFinalScore(attendanceScore, instructorScore);
        const record: CourseFinalGradeRecord = {
          studentId: student.id,
          instructorScore,
          attendanceScore: attendanceScore ?? undefined,
          totalFinalScore: totalFinalScore ?? undefined,
          comment: existing?.comment,
          updatedAt: new Date().toISOString(),
          updatedByEmail: instructorEmail.trim().toLowerCase() || undefined,
        };
        saveCourseFinalGrade(courseId, record);
        setDrafts((prev) => ({ ...prev, [student.id]: draftFromRecord(record) }));
        toast.success(`Saved grades for ${student.fullName}`);
        setGradesTick((t) => t + 1);
      } finally {
        setSavingId(null);
      }
    },
    [courseId, drafts, instructorEmail, savedGrades],
  );

  const publishedCerts = useMemo(() => {
    void certTick;
    const map = new Map<string, ReturnType<typeof getCourseCertificate>>();
    for (const c of listCourseCertificates(courseId)) {
      map.set(c.studentId, c);
    }
    return map;
  }, [courseId, certTick]);

  const publishCertificate = useCallback(
    async (student: RosterStudentRow, saved: CourseFinalGradeRecord | undefined, total: number | null) => {
      if (total == null) {
        toast.error("Save the final score before publishing a certificate.");
        return;
      }
      if (publishedCerts.has(student.id)) {
        toast.info("Certificate already published for this student.");
        return;
      }
      setPublishingId(student.id);
      try {
        const cert = issueCourseCertificate({
          courseId,
          courseTitle,
          studentId: student.id,
          studentEmail: student.email,
          studentName: formatDisplayPersonName(student.fullName),
          totalFinalScore: total,
          attendanceScore: saved?.attendanceScore,
          instructorScore: readInstructorScore(saved),
          instructorName: instructorName?.trim()
            ? formatDisplayPersonName(instructorName.trim())
            : undefined,
          publishedByEmail: instructorEmail,
        });
        try {
          await downloadCourseCertificatePdf(cert, instructorName);
          toast.success("Certificate published", {
            description: `${student.fullName} — PDF downloaded`,
          });
        } catch {
          toast.success("Certificate published", {
            description: `${student.fullName} — PDF download failed; retry from Certificates.`,
          });
        }
        setCertTick((t) => t + 1);
      } finally {
        setPublishingId(null);
      }
    },
    [courseId, courseTitle, instructorEmail, instructorName, publishedCerts],
  );

  const publishAllEligible = useCallback(() => {
    let count = 0;
    setPublishingId("all");
    try {
      for (const s of students) {
        const saved = savedGrades[s.id];
        const total =
          saved?.totalFinalScore ??
          computeTotalFinalScore(
            saved?.attendanceScore ??
              computeAttendanceScore(
                countSessionsStudentAttended(courseId, s.id, s.email),
                plannedSessions,
              ),
            readInstructorScore(saved) ?? null,
          );
        if (total == null || publishedCerts.has(s.id)) continue;
        issueCourseCertificate({
          courseId,
          courseTitle,
          studentId: s.id,
          studentEmail: s.email,
          studentName: formatDisplayPersonName(s.fullName),
          totalFinalScore: total,
          attendanceScore: saved?.attendanceScore,
          instructorScore: readInstructorScore(saved),
          instructorName: instructorName?.trim()
            ? formatDisplayPersonName(instructorName.trim())
            : undefined,
          publishedByEmail: instructorEmail,
        });
        count += 1;
      }
      if (count === 0) {
        toast.info("No students ready to publish — save final scores first.");
      } else {
        toast.success(`Published ${count} certificate${count === 1 ? "" : "s"}`);
        setCertTick((t) => t + 1);
      }
    } finally {
      setPublishingId(null);
    }
  }, [courseId, courseTitle, instructorEmail, instructorName, plannedSessions, publishedCerts, savedGrades, students]);

  const downloadPublishedCertificate = useCallback(
    async (studentId: string) => {
      const cert = publishedCerts.get(studentId);
      if (!cert) return;
      setDownloadingCertId(studentId);
      try {
        await downloadCourseCertificatePdf(cert, instructorName);
        toast.success("Certificate downloaded");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not generate certificate PDF");
      } finally {
        setDownloadingCertId(null);
      }
    },
    [instructorName, publishedCerts],
  );

  const effectiveLoading = isApiCourse ? apiGradesQuery.isLoading : isLoading;
  const effectiveError = isApiCourse ? apiGradesQuery.isError : isError;
  const apiRows = apiGradesQuery.data ?? [];

  const tableRows = useMemo((): GradeTableRow[] => {
    if (isSubstituteViewer) return [];
    if (isApiCourse) {
      return apiRows.map((row) => {
        const draft = drafts[row.studentId] ?? draftFromApiRow(row);
        const draftInstructor = parseFinalScoreInput(draft.score);
        const liveTotal = computeTotalFinalScore(row.attendanceScore, draftInstructor);
        return {
          studentId: row.studentId,
          fullName: row.studentName,
          email: row.studentEmail,
          attended: row.attendanceAttended,
          plannedTotal: row.attendanceTotal,
          attendanceScore: row.attendanceScore,
          instructorScore: row.instructorScore,
          totalFinalScore: row.totalFinalScore,
          draft,
          dirty: draft.score !== (row.instructorScore != null ? String(row.instructorScore) : ""),
          reviews: row.reviewSummary,
          published: Boolean(row.certificate),
          certificate: row.certificate,
          apiRow: row,
        };
      });
    }

    void attendanceTick;
    void reviewsTick;
    return students.map((s) => {
      const emailNorm = s.email.trim().toLowerCase();
      const reviews = getStudentCourseReviewSummary(courseId, emailNorm);
      const saved = savedGrades[s.id];
      const draft = drafts[s.id] ?? draftFromRecord(saved);
      const savedInstructor = readInstructorScore(saved);
      const attended = countSessionsStudentAttended(courseId, s.id, s.email);
      const attendanceScore = computeAttendanceScore(attended, plannedSessions);
      const draftInstructor = parseFinalScoreInput(draft.score);
      const savedTotal =
        saved?.totalFinalScore ??
        computeTotalFinalScore(
          saved?.attendanceScore ?? attendanceScore,
          savedInstructor ?? null,
        );
      const published = publishedCerts.get(s.id);
      return {
        studentId: s.id,
        fullName: s.fullName,
        email: s.email,
        attended,
        plannedTotal: plannedSessions ?? null,
        attendanceScore,
        instructorScore: savedInstructor,
        totalFinalScore: savedTotal,
        draft,
        dirty: draft.score !== (savedInstructor != null ? String(savedInstructor) : ""),
        reviews,
        published: Boolean(published),
        certificate: published,
        localStudent: s,
        localSaved: saved,
      };
    });
  }, [
    apiRows,
    attendanceTick,
    courseId,
    drafts,
    isApiCourse,
    isSubstituteViewer,
    plannedSessions,
    publishedCerts,
    reviewsTick,
    savedGrades,
    students,
  ]);

  const rosterGate = (
    <RosterEmptyState
      isSubstituteViewer={isSubstituteViewer}
      isApiCourse={isApiCourse}
      isLoading={effectiveLoading}
      isError={effectiveError}
      studentsLength={tableRows.length}
    />
  );

  const showTable = !effectiveLoading && !effectiveError && tableRows.length > 0 && !isSubstituteViewer;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-[#1e40af]" />{t("teacher.grades.title")}</h2>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/60 min-w-0 flex-1 max-w-2xl">
          <span className="font-medium text-foreground/80">Total</span> = average of attendance % and instructor
          score. Save scores, then publish a certificate so the student sees it under{" "}
          <span className="font-medium text-foreground/80">Certificates</span>
          {isApiCourse ? "." : " (demo: this browser until an API exists)."}
        </p>
        {showTable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full gap-1.5 border-[#3954d0]/40 text-[#3954d0] hover:bg-[#3954d0]/5"
            disabled={isApiCourse ? publishAllApiCertificatesMutation.isPending : publishingId === "all"}
            onClick={() => {
              if (isApiCourse) {
                publishAllApiCertificatesMutation.mutate();
              } else {
                publishAllEligible();
              }
            }}
          >
            {(isApiCourse ? publishAllApiCertificatesMutation.isPending : publishingId === "all") ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Award className="h-3.5 w-3.5" />
            )}
            Publish all certificates
          </Button>
        ) : null}
      </div>

      {rosterGate}
      {showTable ? (
        <div className="space-y-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50/30 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
            <Table className="min-w-[40rem] w-full table-auto">
              <TableHeader>
                <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                  <TableHead className="min-w-[10rem] whitespace-nowrap">{t("teacher.assignments.submissions.table.student")}</TableHead>
                  <TableHead
                    className="min-w-[5rem] whitespace-nowrap"
                    title="QR check-ins vs planned schedule sessions."
                  >
                    Sessions
                  </TableHead>
                  <TableHead
                    className="min-w-[4.75rem] whitespace-nowrap text-right"
                    title="Auto: sessions attended ÷ planned (0–100)."
                  >
                    Attend. %
                  </TableHead>
                  <TableHead className="min-w-[6.5rem] whitespace-nowrap">Instructor</TableHead>
                  <TableHead
                    className="min-w-[4.25rem] whitespace-nowrap text-right"
                    title="Average of attendance score and instructor score."
                  >
                    Total
                  </TableHead>
                  <TableHead
                    className="min-w-[6.5rem] whitespace-nowrap"
                    title="Student feedback from the class completion page."
                  >
                    Feedback
                  </TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-right px-2">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row) => {
                  const draftInstructor = parseFinalScoreInput(row.draft.score);
                  const liveTotal = computeTotalFinalScore(row.attendanceScore, draftInstructor);
                  const canPublish = row.totalFinalScore != null && !row.published;
                  const savingThisRow = isApiCourse
                    ? saveApiGradeMutation.isPending && saveApiGradeMutation.variables?.row.studentId === row.studentId
                    : savingId === row.studentId;
                  const publishingThisRow = isApiCourse
                    ? publishApiCertificateMutation.isPending &&
                      publishApiCertificateMutation.variables === row.studentId
                    : publishingId === row.studentId;
                  const downloadingThisRow = downloadingCertId === row.studentId;
                  return (
                    <TableRow key={row.studentId}>
                      <TableCell className="max-w-[14rem]">
                        <p className="font-medium text-foreground truncate">
                          {formatDisplayPersonName(row.fullName)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm tabular-nums align-middle">
                        {row.plannedTotal != null ? (
                          <span>
                            <span className="font-medium text-foreground">{row.attended}</span>
                            <span className="text-muted-foreground">/{row.plannedTotal}</span>
                          </span>
                        ) : (
                          <span>
                            <span className="font-medium text-foreground">{row.attended}</span>
                            <span className="text-muted-foreground text-xs"> sess.</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right align-middle tabular-nums text-sm whitespace-nowrap">
                        {row.attendanceScore != null ? (
                          <span className="font-medium text-foreground">{row.attendanceScore}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-middle whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            inputMode="decimal"
                            placeholder="0–100"
                            value={row.draft.score}
                            className="h-9 w-16 tabular-nums bg-white"
                            onChange={(e) => updateDraft(row.studentId, { score: e.target.value })}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-middle tabular-nums whitespace-nowrap">
                        {liveTotal != null ? (
                          <span className="font-semibold text-[#1e40af]">{liveTotal}%</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-middle whitespace-nowrap">
                        {row.reviews.instructorRating != null ? (
                          <div className="inline-flex flex-col gap-1">
                            <div
                              className="inline-flex flex-col gap-0.5"
                              title={[
                                `Instructor: ${row.reviews.instructorRating}/5`,
                                row.reviews.instructorComment
                                  ? `"${row.reviews.instructorComment}"`
                                  : null,
                                row.reviews.platformRating != null
                                  ? `Platform: ${row.reviews.platformRating}/5`
                                  : "Platform review pending",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            >
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                                <Star
                                  className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400"
                                  aria-hidden
                                />
                                {row.reviews.instructorRating}/5
                              </span>
                              {row.reviews.platformRating != null ? (
                                <span className="text-[10px] font-medium text-emerald-700">+ platform</span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Platform pending</span>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-fit px-2 text-xs text-[#3954d0] hover:bg-[#3954d0]/5 hover:text-[#3954d0]"
                              onClick={() =>
                                setReviewStudent({
                                  name: row.fullName,
                                  email: row.email,
                                  reviews: isApiCourse
                                    ? gradeReviewToSummary(row.reviews)
                                    : getStudentCourseReviewSummary(
                                        courseId,
                                        row.email.trim().toLowerCase(),
                                      ),
                                })
                              }
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" aria-hidden />
                              Read review
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="w-[1%] whitespace-nowrap px-2 py-3 text-right align-middle">
                        <div className="inline-flex flex-row items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 rounded-full px-3 text-xs shrink-0"
                            style={{ backgroundColor: "#3954d0" }}
                            disabled={savingThisRow || !row.dirty}
                            onClick={() => {
                              const score = parseFinalScoreInput(row.draft.score);
                              if (score == null) {
                                toast.error("Enter an instructor score from 0 to 100.");
                                return;
                              }
                              if (isApiCourse && row.apiRow) {
                                saveApiGradeMutation.mutate({ row: row.apiRow, score });
                                return;
                              }
                              if (row.localStudent) {
                                handleSave(row.localStudent, row.attendanceScore);
                              }
                            }}
                          >
                            {savingThisRow ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : row.instructorScore != null ? (
                              "Update"
                            ) : (
                              "Save"
                            )}
                          </Button>
                          {row.published ? (
                            <div className="inline-flex shrink-0 items-center gap-1">
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                                title="Certificate published"
                              >
                                <Award className="h-3 w-3" aria-hidden />
                                Done
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 shrink-0 rounded-full px-2 text-xs"
                                disabled={downloadingThisRow}
                                onClick={() => {
                                  if (isApiCourse && row.certificate) {
                                    setDownloadingCertId(row.studentId);
                                    void downloadCourseCertificatePdf(row.certificate, instructorName)
                                      .then(() => toast.success("Certificate downloaded"))
                                      .catch((e) =>
                                        toast.error(e instanceof Error ? e.message : "Could not generate certificate PDF"),
                                      )
                                      .finally(() => setDownloadingCertId(null));
                                    return;
                                  }
                                  void downloadPublishedCertificate(row.studentId);
                                }}
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
                              className="h-7 shrink-0 rounded-full px-2.5 text-xs gap-0.5"
                              disabled={!canPublish || publishingThisRow}
                              onClick={() => {
                                if (isApiCourse) {
                                  publishApiCertificateMutation.mutate(row.studentId);
                                  return;
                                }
                                if (row.localStudent) {
                                  void publishCertificate(row.localStudent, row.localSaved, row.totalFinalScore);
                                }
                              }}
                            >
                              {publishingThisRow ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Award className="h-3 w-3" aria-hidden />
                              )}
                              Publish
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground px-0.5 leading-relaxed">
            <span className="font-medium text-foreground/80">Attend. %</span> = sessions checked in via QR ÷
            planned schedule meetings. <span className="font-medium text-foreground/80">Total</span> = average of
            attendance % and instructor score.{" "}
            <span className="font-medium text-foreground/80">Feedback</span> shows the student&apos;s
            instructor rating after they complete the class survey
            {isApiCourse ? "." : " (demo: this browser)."}
          </p>
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
