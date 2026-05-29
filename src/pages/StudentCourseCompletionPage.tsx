import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  Star,
  X,
} from "@/lib/icons";
import { toast } from "sonner";
import { eduhubCompletion } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import type { CourseReviewSummaryResponse } from "@/api/eduhubTypes";
import { useAuthSession } from "@/features/auth/context";
import { markCourseCongratsSeen } from "@/features/student/courseCongratsSeenStorage";
import {
  COURSE_CERTIFICATES_CHANGED,
  listCertificatesForStudent,
} from "@/features/courses/courseCertificatesStorage";
import {
  getCourseReview,
  hasSubmittedBothReviews,
  saveCourseReview,
  type CourseReviewRecord,
  type CourseReviewTarget,
} from "@/features/student/courseReviewsStorage";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { enrollmentApplicationStore } from "@/features/enrollment/enrollmentApplicationStore";
import { resolveStudentCourseEnrollmentDisplayStatus } from "@/features/enrollment/studentCourseEnrollmentStatus";
import { useMyEnrollmentApplicationsByCourse } from "@/features/enrollment/useMyEnrollmentApplicationsByCourse";
import { formatDisplayPersonName } from "@/lib/formatPersonName";
import { cn } from "@/lib/utils";
import "@/features/student/courseCompletionPage.css";

const TEACHER_PREFIX = "teacher_";
const CONGRATS_PREVIEW_PATH = "/dashboard/congrats-preview";
const COMMENT_MAX = 200;

type LocationState = {
  courseTitle?: string;
  instructor?: string;
};

type ApiReviewSnapshot = {
  target: CourseReviewTarget;
  rating: number;
  comment?: string;
  submittedAt: string;
};

function FieldLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <span className="text-sm font-medium text-zinc-800">{children}</span>
      {hint ? (
        <span title={hint} className="inline-flex text-zinc-400">
          <CircleHelp className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">{hint}</span>
        </span>
      ) : null}
    </div>
  );
}

function RatingHeaderIcon() {
  return (
    <div
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50"
      aria-hidden
    >
      <Star className="h-5 w-5 text-zinc-500" strokeWidth={1.75} />
      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 shadow-sm">
        <Star className="h-2.5 w-2.5 fill-white text-white" strokeWidth={0} />
      </span>
    </div>
  );
}

function SquareRatingStars({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap justify-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "completion-star-tile",
              active && "completion-star-tile--active",
            )}
            aria-label={`${n} out of 5`}
            aria-pressed={active}
          >
            <Star
              className={cn(
                "h-6 w-6",
                active ? "fill-amber-400 text-amber-400" : "text-zinc-300",
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}

function SavedReviewSummary({
  title,
  subtitle,
  saved,
}: {
  title: string;
  subtitle: string;
  saved: CourseReviewRecord;
}) {
  return (
    <article className="completion-review-card overflow-hidden">
      <div className="completion-review-card__header flex items-start gap-3 px-5 py-4 sm:px-6 sm:py-5">
        <RatingHeaderIcon />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
        </div>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <div>
          <p className="text-sm font-medium text-zinc-800">Your rating</p>
          <div className="mt-2 flex justify-center gap-2" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={cn(
                  "completion-star-tile pointer-events-none",
                  n <= saved.rating && "completion-star-tile--active",
                )}
              >
                <Star
                  className={cn(
                    "h-6 w-6",
                    n <= saved.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-zinc-300",
                  )}
                />
              </div>
            ))}
          </div>
        </div>
        {saved.comment ? (
          <div>
            <p className="text-sm font-medium text-zinc-800">Your review</p>
            <p className="mt-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3.5 py-3 text-sm leading-relaxed text-zinc-600">
              {saved.comment}
            </p>
          </div>
        ) : null}
        <p className="text-xs text-zinc-400">Submitted — thank you</p>
      </div>
    </article>
  );
}

function ReviewFormCard({
  target,
  title,
  subtitle,
  ratingHint,
  courseLabel,
  courseId,
  emailNorm,
  onReviewSaved,
  apiReview,
  onApiSubmit,
  isSubmitting = false,
}: {
  target: CourseReviewTarget;
  title: string;
  subtitle: string;
  ratingHint: string;
  courseLabel: string;
  courseId: string;
  emailNorm: string;
  onReviewSaved?: () => void;
  apiReview?: ApiReviewSnapshot;
  onApiSubmit?: (review: CourseReviewRecord) => void;
  isSubmitting?: boolean;
}) {
  const existing = useMemo(
    () => apiReview ?? getCourseReview(courseId, emailNorm, target),
    [apiReview, courseId, emailNorm, target],
  );
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saved, setSaved] = useState(existing);

  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setComment(existing.comment ?? "");
      setSaved(existing);
    }
  }, [existing]);

  const handleCancel = () => {
    setRating(0);
    setComment("");
  };

  const handleSubmit = () => {
    if (rating < 1) {
      toast.error("Choose a rating from 1 to 5.");
      return;
    }
    const record = {
      target,
      rating,
      comment: comment.trim() || undefined,
      submittedAt: new Date().toISOString(),
    };
    if (onApiSubmit) {
      onApiSubmit(record);
      return;
    }
    saveCourseReview(courseId, emailNorm, record);
    setSaved(record);
    onReviewSaved?.();
    toast.success("Feedback saved.");
  };

  if (saved) {
    return <SavedReviewSummary title={title} subtitle={subtitle} saved={saved} />;
  }

  const commentLen = comment.length;

  return (
    <article className="completion-review-card overflow-hidden">
      <div className="completion-review-card__header flex items-start gap-3 px-5 py-4 sm:px-6 sm:py-5">
        <RatingHeaderIcon />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          <p className="mt-0.5 text-sm leading-snug text-zinc-500">{subtitle}</p>
        </div>
        <Link
          to="/dashboard/courses"
          className="-mr-1 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="Back to my classes"
        >
          <X className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <div className="space-y-5 px-5 py-5 sm:space-y-6 sm:px-6 sm:py-6">
        <div>
          <FieldLabel hint={ratingHint}>Your rating</FieldLabel>
          <SquareRatingStars
            value={rating}
            onChange={setRating}
            label={`Rate ${title}`}
          />
        </div>

        <div>
          <FieldLabel hint="Shown on your feedback record for this class.">
            Class name
          </FieldLabel>
          <input
            type="text"
            readOnly
            value={courseLabel}
            className="completion-field-input cursor-default bg-zinc-50/60 text-zinc-700"
            tabIndex={-1}
            aria-readonly
          />
        </div>

        <div>
          <FieldLabel>Your review (optional)</FieldLabel>
          <div className="relative">
            <textarea
              value={comment}
              onChange={(e) =>
                setComment(e.target.value.slice(0, COMMENT_MAX))
              }
              placeholder="Provide a detailed review…"
              rows={4}
              maxLength={COMMENT_MAX}
              className="completion-field-textarea pr-16"
            />
            <span
              className="pointer-events-none absolute bottom-3 right-3 text-xs tabular-nums text-zinc-400"
              aria-live="polite"
            >
              {commentLen}/{COMMENT_MAX}
            </span>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" className="completion-btn-cancel" onClick={handleCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="completion-btn-submit"
            onClick={handleSubmit}
            disabled={rating < 1 || isSubmitting}
          >
            {isSubmitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </article>
  );
}

const StudentCourseCompletionPage = () => {
  const { courseId: rawCourseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isCongratsPreviewRoute = location.pathname === CONGRATS_PREVIEW_PATH;
  const isPreview =
    import.meta.env.DEV && (isCongratsPreviewRoute || searchParams.get("preview") === "1");
  const courseId = isCongratsPreviewRoute
    ? "preview"
    : rawCourseId
      ? decodeURIComponent(rawCourseId)
      : undefined;
  const state = (location.state as LocationState | null) ?? {};
  const { user } = useAuthSession();
  const queryClient = useQueryClient();
  const emailNorm = user.email.trim().toLowerCase();
  const { data: enrolledCourses = [] } = useStudentCoursesQuery();
  const { byCourse: enrollmentAppsByCourse } = useMyEnrollmentApplicationsByCourse(emailNorm);
  const [completionTick, setCompletionTick] = useState(0);
  const useApiCompletion = Boolean(courseId && isUuid(courseId) && !isPreview);

  const reviewSummaryQuery = useQuery({
    queryKey: ["student", "course-review-summary", courseId],
    queryFn: () => eduhubCompletion.myReviewSummary(courseId!),
    enabled: useApiCompletion,
    retry: false,
  });

  const certificatesQuery = useQuery({
    queryKey: ["student", "certificates"],
    queryFn: eduhubCompletion.myCertificates,
    enabled: useApiCompletion,
  });

  const saveReviewMutation = useMutation({
    mutationFn: (review: CourseReviewRecord) =>
      eduhubCompletion.submitReview(courseId!, {
        target: review.target,
        rating: review.rating,
        comment: review.comment,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["student", "course-review-summary", courseId] });
      void queryClient.invalidateQueries({ queryKey: ["student", "certificates"] });
      setCompletionTick((t) => t + 1);
      toast.success("Feedback saved.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save feedback."),
  });

  useEffect(() => {
    const bump = () => setCompletionTick((t) => t + 1);
    window.addEventListener(COURSE_CERTIFICATES_CHANGED, bump);
    return () => window.removeEventListener(COURSE_CERTIFICATES_CHANGED, bump);
  }, []);

  const hasAccess = useMemo(() => {
    if (isPreview) return true;
    if (!courseId) return false;
    const isEnrolledFromApi = enrolledCourses.some((c) => String(c.id) === courseId);
    const status = resolveStudentCourseEnrollmentDisplayStatus(
      courseId,
      emailNorm,
      isEnrolledFromApi,
      enrollmentAppsByCourse.get(courseId),
    );
    if (status === "enrolled") return true;
    if (courseId.startsWith(TEACHER_PREFIX)) {
      return (
        enrollmentApplicationStore.getTeacherCourseAccess(courseId, emailNorm) === "approved"
      );
    }
    return false;
  }, [isPreview, courseId, emailNorm, enrolledCourses, enrollmentAppsByCourse]);

  const meta = useMemo(() => {
    if (!courseId) return null;
    if (isPreview) {
      return {
        title: searchParams.get("title")?.trim() || "Introduction to Economics",
        instructor: formatDisplayPersonName(
          searchParams.get("instructor")?.trim() || "Dr. Dilshod Karimov",
        ),
      };
    }
    if (state.courseTitle) {
      return {
        title: state.courseTitle,
        instructor:
          state.instructor && state.instructor !== "—"
            ? formatDisplayPersonName(state.instructor)
            : "—",
      };
    }
    const enrolled = enrolledCourses.find((c) => String(c.id) === courseId);
    if (enrolled) {
      return {
        title: enrolled.title,
        instructor: formatDisplayPersonName(enrolled.instructor),
      };
    }
    if (courseId.startsWith(TEACHER_PREFIX)) {
      const tc = teacherCoursesStore.getById(courseId.slice(TEACHER_PREFIX.length));
      if (tc) {
        return {
          title: tc.title,
          instructor: formatDisplayPersonName(tc.instructorName),
        };
      }
    }
    const app = enrollmentApplicationStore
      .list()
      .find((r) => r.courseId === courseId && r.applicantEmailNorm === emailNorm);
    if (app) {
      return {
        title: app.courseTitle ?? courseId,
        instructor: "—",
      };
    }
    return { title: courseId, instructor: "—" };
  }, [
    courseId,
    isPreview,
    searchParams,
    state.courseTitle,
    state.instructor,
    enrolledCourses,
    emailNorm,
  ]);

  useEffect(() => {
    if (courseId && emailNorm && !isPreview) {
      markCourseCongratsSeen(courseId, emailNorm);
    }
  }, [courseId, emailNorm, isPreview]);

  const publishedCertificate = useMemo(() => {
    void completionTick;
    if (!courseId) return undefined;
    if (useApiCompletion) {
      return certificatesQuery.data?.find((c) => c.courseId === courseId);
    }
    return listCertificatesForStudent(emailNorm).find((c) => c.courseId === courseId);
  }, [completionTick, emailNorm, courseId, certificatesQuery.data, useApiCompletion]);

  const reviewsComplete = useMemo(() => {
    void completionTick;
    if (!courseId) return false;
    if (useApiCompletion) {
      const s = reviewSummaryQuery.data;
      return Boolean(s?.instructorRating && s?.platformRating);
    }
    return hasSubmittedBothReviews(courseId, emailNorm);
  }, [courseId, emailNorm, completionTick, reviewSummaryQuery.data, useApiCompletion]);

  const apiReview = (target: CourseReviewTarget): ApiReviewSnapshot | undefined => {
    const s: CourseReviewSummaryResponse | undefined = reviewSummaryQuery.data;
    if (!s) return undefined;
    if (target === "INSTRUCTOR" && s.instructorRating != null) {
      return {
        target,
        rating: s.instructorRating,
        comment: s.instructorComment,
        submittedAt: s.instructorSubmittedAt ?? new Date().toISOString(),
      };
    }
    if (target === "PLATFORM" && s.platformRating != null) {
      return {
        target,
        rating: s.platformRating,
        comment: s.platformComment,
        submittedAt: s.platformSubmittedAt ?? new Date().toISOString(),
      };
    }
    return undefined;
  };

  if (!courseId) {
    return <Navigate to="/dashboard/courses" replace />;
  }

  if (!hasAccess) {
    return <Navigate to={`/dashboard/courses/${encodeURIComponent(courseId)}`} replace />;
  }

  if (!meta) {
    return (
      <div className="course-completion-page flex min-h-dvh items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  const instructorSubtitle =
    meta.instructor !== "—"
      ? `Share feedback on ${meta.instructor}'s teaching for this class.`
      : "Share feedback on instruction for this class.";

  return (
    <div className="course-completion-page min-h-dvh">
      {isPreview ? (
        <p className="pointer-events-none fixed right-3 top-3 z-50 text-[10px] text-zinc-400">
          Preview
        </p>
      ) : null}

      <div className="mx-auto max-w-lg px-4 pb-12 pt-5 sm:px-6 sm:pt-6">
        <Link
          to="/dashboard/courses"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          My classes
        </Link>

        <header className="mt-6 text-center sm:mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3954d0]">
            Schedule complete
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            {meta.title}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
            You finished all sessions
            {meta.instructor !== "—" ? (
              <>
                {" "}
                with <span className="font-medium text-zinc-700">{meta.instructor}</span>
              </>
            ) : null}
            . Submit both reviews below to unlock your certificate download.
          </p>
        </header>

        {reviewsComplete && publishedCertificate ? (
          <p className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-center text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              Feedback complete —{" "}
              <Link
                to="/dashboard/certificates"
                className="font-semibold underline underline-offset-2"
              >
                download your certificate
              </Link>
            </span>
          </p>
        ) : null}

        <div className="mt-8 space-y-5 sm:mt-10">
          <ReviewFormCard
            target="INSTRUCTOR"
            title="Rate your instructor"
            subtitle={instructorSubtitle}
            ratingHint="1 is poor, 5 is excellent."
            courseLabel={meta.title}
            courseId={courseId}
            emailNorm={emailNorm}
            apiReview={useApiCompletion ? apiReview("INSTRUCTOR") : undefined}
            onApiSubmit={useApiCompletion ? (review) => saveReviewMutation.mutate(review) : undefined}
            isSubmitting={saveReviewMutation.isPending}
            onReviewSaved={() => setCompletionTick((t) => t + 1)}
          />

          <ReviewFormCard
            target="PLATFORM"
            title="Rate Edu Hub"
            subtitle="Tell us how the platform worked for this class."
            ratingHint="Helps us improve scheduling, materials, and support."
            courseLabel={meta.title}
            courseId={courseId}
            emailNorm={emailNorm}
            apiReview={useApiCompletion ? apiReview("PLATFORM") : undefined}
            onApiSubmit={useApiCompletion ? (review) => saveReviewMutation.mutate(review) : undefined}
            isSubmitting={saveReviewMutation.isPending}
            onReviewSaved={() => setCompletionTick((t) => t + 1)}
          />
        </div>

        <p className="mt-6 text-center">
          <Link
            to={`/dashboard/courses/${encodeURIComponent(courseId)}`}
            className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
          >
            Open class details
          </Link>
        </p>
      </div>
    </div>
  );
};

export default StudentCourseCompletionPage;
