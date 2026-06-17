import { useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/features/auth/context";
import { EnrollmentStatusBadge } from "@/features/enrollment/EnrollmentStatusBadge";
import { resolveStudentCourseEnrollmentDisplayStatus } from "@/features/enrollment/studentCourseEnrollmentStatus";
import { useMyEnrollmentApplicationsByCourse } from "@/features/enrollment/useMyEnrollmentApplicationsByCourse";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock,
  Images,
  Loader2,
  Star,
  Users,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLayoutContext } from "@/features/layout/context";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";
import { cn } from "@/lib/utils";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { instructorProfileAvatarsStore } from "@/features/teacher/data/instructorProfileAvatarsStore";
import type { TeacherCourse } from "@/features/teacher/types";
import { eduhubCompletion, eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import type { CourseResponse, CourseReviewResponse, ScheduleProposalResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import {
  boundsFromMeetingSlots,
  mergeScheduleDisplayForAdminReview,
  resolvedSessionsSixMonths,
  useAdminCourseLocalDataVersion,
} from "@/features/admin/utils/adminCourseScheduleDisplay";
import { courseScheduleProposalStore } from "@/features/courses/courseScheduleProposalStore";
import { courseScheduleWorkflowStore } from "@/features/courses/courseScheduleWorkflowStore";
import { formatSessionTimeLabel, resolveEnrollmentSessionTimingStatus, buildScheduleMonthTabs, sessionDateMs } from "@/features/courses/classSchedulePreview";
import { useScheduleAttendanceState } from "@/features/courses/useScheduleAttendanceState";
import { SessionTimingChip } from "@/features/courses/SessionTimingChip";
import { enrollmentApplicationStore } from "@/features/enrollment/enrollmentApplicationStore";
import {
  COURSE_REVIEWS_CHANGED,
  listInstructorReviewsForCourse,
} from "@/features/student/courseReviewsStorage";
import { formatDisplayPersonName, formatDisplayTitle, profileInitials } from "@/lib/formatPersonName";

const TEACHER_PREFIX = "teacher_";
const MAX_CLASS_PHOTOS = 8;

function nameInitials(name: string, max = 2): string {
  const t = name.trim();
  if (!t) return "—";
  return t
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, max)
    .toUpperCase();
}

function formatPrice(price: number | undefined, currency = "USD"): string {
  if (price == null || price <= 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

/** ISO 8601 date string → localized short date, or null if missing/invalid. */
function formatClassDateLabel(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatSessionWeekdayLabel(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

type SessionSlotLike = { title?: string; sessionDate?: string; sessionTime?: string };

/** Same resolution order as enrolled student course detail: API proposal → approved local → course slots. */
function resolvePreviewSessionSlots(
  courseId: string,
  apiDetail: CourseResponse | null,
  scheduleProposal: ScheduleProposalResponse | null,
  isApiCourse: boolean,
  tc: TeacherCourse | null,
): SessionSlotLike[] {
  if (isApiCourse && apiDetail) {
    if (scheduleProposal?.sessions.length) {
      return scheduleProposal.sessions.map((s) => ({
        title: s.title,
        sessionDate: s.sessionDate ?? "",
        sessionTime: s.sessionTime ?? "",
      }));
    }
    const wf = courseScheduleWorkflowStore.get(courseId);
    const useProposal = wf?.status === "approved";
    if (useProposal) {
      const p = courseScheduleProposalStore.get(courseId);
      if (p?.classMeetingSlots?.length) return p.classMeetingSlots;
    }
    if (apiDetail.classMeetingSlots?.length) return apiDetail.classMeetingSlots;
    return [];
  }
  if (tc?.classMeetingSlots?.length) return tc.classMeetingSlots;
  return [];
}

type LessonPreview = { id: string; title: string };

function formatReviewAuthorName(courseId: string, emailNorm: string): string {
  const app = enrollmentApplicationStore.findLatestForCourseAndEmail(courseId, emailNorm);
  if (app?.fullName?.trim()) {
    const parts = formatDisplayPersonName(app.fullName).split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1]![0]}.`;
    }
    return parts[0] ?? "Student";
  }
  const local = emailNorm.split("@")[0] ?? "";
  const bits = local.split(/[._-]+/).filter(Boolean);
  if (bits.length >= 2) {
    const lastInitial = bits[bits.length - 1]![0]?.toUpperCase() ?? "";
    return `${formatDisplayPersonName(bits[0])} ${lastInitial}.`.trim();
  }
  if (bits[0]) return formatDisplayPersonName(bits[0]);
  return "Student";
}

function formatReviewDateLabel(iso: string | undefined): string {
  if (!iso?.trim()) return "Recently";
  const submitted = new Date(iso.trim());
  if (Number.isNaN(submitted.getTime())) return "Recently";
  const diffMs = submitted.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (absMs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
  if (absMs < day) return rtf.format(Math.round(diffMs / hour), "hour");
  if (absMs < month) return rtf.format(Math.round(diffMs / day), "day");
  return submitted.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-px" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3 shrink-0",
            i < rating ? "fill-amber-400 text-amber-400" : "fill-zinc-200/80 text-zinc-200/80",
          )}
        />
      ))}
    </span>
  );
}

const StudentAvailableCourseDetailPage = () => {
  const { courseId: rawParam } = useParams<{ courseId: string }>();
  const linkId = rawParam ? decodeURIComponent(rawParam) : "";
  const { user } = useAuthSession();
  const { data: enrolledCourses = [] } = useStudentCoursesQuery();
  const { isSidebarCollapsed } = useLayoutContext();
  const [, setEnrollmentStoreTick] = useState(0);
  const [reviewsTick, setReviewsTick] = useState(0);
  const scheduleLocalTick = useAdminCourseLocalDataVersion();
  const scheduleAttendance = useScheduleAttendanceState(linkId || undefined);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [teacherCourse, setTeacherCourse] = useState<TeacherCourse | null>(null);
  const [apiCourse, setApiCourse] = useState<CourseResponse | null>(null);
  const [lessonRows, setLessonRows] = useState<LessonPreview[]>([]);
  const [scheduleProposal, setScheduleProposal] = useState<ScheduleProposalResponse | null>(null);
  const [studentReviews, setStudentReviews] = useState<CourseReviewResponse[]>([]);
  const [reviewsError, setReviewsError] = useState(false);

  const isTeacher = linkId.startsWith(TEACHER_PREFIX);
  const teacherId = isTeacher ? linkId.slice(TEACHER_PREFIX.length) : null;

  useEffect(() => {
    const bump = () => setEnrollmentStoreTick((n) => n + 1);
    window.addEventListener("eduhub-enrollment-applications-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("eduhub-enrollment-applications-changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    const bump = () => setReviewsTick((n) => n + 1);
    window.addEventListener(COURSE_REVIEWS_CHANGED, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(COURSE_REVIEWS_CHANGED, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const emailNorm = user.email.trim().toLowerCase();
  const { byCourse: applicationsByCourse } = useMyEnrollmentApplicationsByCourse(emailNorm);
  const enrollmentStatus = useMemo(
    () =>
      resolveStudentCourseEnrollmentDisplayStatus(
        linkId,
        emailNorm,
        enrolledCourses.some((c) => String(c.id) === linkId),
        applicationsByCourse.get(linkId),
      ),
    [linkId, emailNorm, enrolledCourses, applicationsByCourse],
  );
  const isEnrolled = enrollmentStatus === "enrolled";
  const enrollSuccessPath = `/dashboard/available-courses/enroll/${encodeURIComponent(linkId)}/success`;

  useEffect(() => {
    if (!linkId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setTeacherCourse(null);
    setApiCourse(null);
    setLessonRows([]);
    setScheduleProposal(null);
    setStudentReviews([]);
    setReviewsError(false);

    if (isTeacher && teacherId) {
      const tc = teacherCoursesStore.getById(teacherId);
      if (!tc) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return () => {
          cancelled = true;
        };
      }
      const sorted = [...tc.lessons].sort((a, b) => a.order - b.order);
      if (!cancelled) {
        setTeacherCourse(tc);
        setLessonRows(sorted.map((l) => ({ id: l.id, title: l.title })));
        setLoading(false);
      }
      return () => {
        cancelled = true;
      };
    }

    if (isUuid(linkId)) {
      Promise.all([
        eduhubCourses.getById(linkId),
        eduhubCourses.getAllLessons(linkId).catch(() => [] as LessonPreview[]),
        eduhubSchedule.getProposal(linkId).catch(() => null),
        eduhubCompletion
          .listCourseReviews(linkId, { target: "INSTRUCTOR", limit: 3 })
          .then((reviews) => ({ reviews, failed: false }))
          .catch(() => ({ reviews: [] as CourseReviewResponse[], failed: true })),
      ])
        .then(([c, allLessons, proposal, reviewsResult]) => {
          if (cancelled) return;
          setApiCourse(c);
          setScheduleProposal(proposal);
          setLessonRows(allLessons.map((l) => ({ id: l.id, title: l.title })));
          setStudentReviews(reviewsResult.reviews);
          setReviewsError(reviewsResult.failed);
        })
        .catch(() => {
          if (!cancelled) setNotFound(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    setNotFound(true);
    setLoading(false);
    return () => {
      cancelled = true;
    };
  }, [linkId, isTeacher, teacherId]);

  const title = apiCourse?.title ?? teacherCourse?.title ?? "";
  const instructor =
    apiCourse?.lecturer?.fullName ?? teacherCourse?.instructorName ?? "—";
  const instructorAvatarUrl =
    apiCourse?.lecturer?.avatarUrl?.trim() ||
    teacherCourse?.instructorAvatarUrl?.trim() ||
    instructorProfileAvatarsStore.getByEmail(apiCourse?.lecturer?.email ?? "") ||
    instructorProfileAvatarsStore.getByName(instructor) ||
    undefined;
  const category = apiCourse?.category ?? "Class";
  const description = apiCourse?.description ?? teacherCourse?.description ?? "";
  const thumbnailUrl = apiCourse?.thumbnailUrl?.trim() || teacherCourse?.thumbnailUrl?.trim();
  const scheduleMerged = useMemo(() => {
    void scheduleLocalTick;
    if (!apiCourse || !isUuid(linkId) || isTeacher) return null;
    const wf = courseScheduleWorkflowStore.get(linkId);
    return mergeScheduleDisplayForAdminReview(linkId, apiCourse, {
      useLocalProposalSnapshot: wf?.status === "approved",
    });
  }, [apiCourse, linkId, isTeacher, scheduleLocalTick]);

  const sessionSlotsPreview = useMemo(() => {
    void scheduleLocalTick;
    const isApiCourse = Boolean(apiCourse && linkId && isUuid(linkId) && !isTeacher);
    const raw = resolvePreviewSessionSlots(linkId, apiCourse, scheduleProposal, isApiCourse, teacherCourse);
    const decorated = raw.map((slot, i) => ({ slot, i, ms: sessionDateMs(slot.sessionDate) }));
    decorated.sort((a, b) => {
      const na = Number.isNaN(a.ms) ? Infinity : a.ms;
      const nb = Number.isNaN(b.ms) ? Infinity : b.ms;
      if (na !== nb) return na - nb;
      return a.i - b.i;
    });
    return decorated.map((x) => x.slot);
  }, [apiCourse, linkId, isTeacher, scheduleProposal, teacherCourse, scheduleLocalTick]);

  const scheduleMonthTabs = useMemo(
    () => buildScheduleMonthTabs(sessionSlotsPreview),
    [sessionSlotsPreview],
  );

  const scheduleStatusHint = useMemo(() => {
    void scheduleLocalTick;
    if (!linkId || !isUuid(linkId) || isTeacher || !apiCourse) return null;
    if (scheduleProposal?.sessions.length) {
      return "Published class schedule from the school.";
    }
    const wf = courseScheduleWorkflowStore.get(linkId);
    if (wf?.status === "pending_instructor") {
      return "The proposed schedule is awaiting instructor confirmation—session dates are not finalized yet.";
    }
    if (wf?.status === "instructor_rejected") {
      return "The last proposed schedule was sent back for changes; a new plan may be published later.";
    }
    if (wf?.status === "approved" && sessionSlotsPreview.length) {
      return "Instructor-approved plan (shown here for preview before you enroll).";
    }
    return null;
  }, [
    apiCourse,
    linkId,
    isTeacher,
    scheduleProposal,
    sessionSlotsPreview.length,
    scheduleLocalTick,
  ]);

  const instructorReviews = useMemo(() => {
    void reviewsTick;
    if (!linkId) return [];
    return listInstructorReviewsForCourse(linkId).map((review) => {
      const authorName = formatReviewAuthorName(linkId, review.emailNorm);
      return {
        id: review.emailNorm,
        authorName,
        rating: review.rating,
        dateLabel: formatReviewDateLabel(review.submittedAt),
        body: review.comment?.trim() || "No written comment.",
      };
    });
  }, [linkId, reviewsTick]);

  const meetings =
    apiCourse?.classMeetingsInSixMonths ??
    (apiCourse ? resolvedSessionsSixMonths(apiCourse) : undefined) ??
    scheduleMerged?.sessionsSixMo ??
    teacherCourse?.classMeetingsInSixMonths ??
    (teacherCourse?.classMeetingSlots?.length ? teacherCourse.classMeetingSlots.length : undefined);
  const enrollmentCount = apiCourse?.enrollmentCount ?? teacherCourse?.enrollmentCount;

  const price =
    apiCourse?.pricing?.discountedAmount ?? apiCourse?.pricing?.amount ?? teacherCourse?.price;
  const currency = apiCourse?.pricing?.currency ?? "USD";

  const teacherSlotBounds = teacherCourse ? boundsFromMeetingSlots(teacherCourse.classMeetingSlots) : {};
  const resolvedClassStartIso =
    scheduleMerged?.classStartDate ||
    apiCourse?.classStartDate?.trim() ||
    teacherCourse?.classStartDate?.trim() ||
    teacherSlotBounds.start;
  const resolvedClassEndIso =
    scheduleMerged?.classEndDate ||
    apiCourse?.classEndDate?.trim() ||
    teacherCourse?.classEndDate?.trim() ||
    teacherSlotBounds.end;
  const classStartLabel = formatClassDateLabel(resolvedClassStartIso);
  const classEndLabel = formatClassDateLabel(resolvedClassEndIso);

  const enrollPath = `/dashboard/available-courses/enroll/${encodeURIComponent(linkId)}`;
  const workspacePath = `/dashboard/courses/${linkId}`;

  const classPhotoUrls = (
    apiCourse?.classPhotoUrls ?? teacherCourse?.classPhotoUrls ?? []
  ).filter((u) => typeof u === "string" && u.trim().length > 0);
  const displayedClassPhotoUrls = classPhotoUrls.slice(0, MAX_CLASS_PHOTOS);
  const hasMoreClassPhotos = classPhotoUrls.length > MAX_CLASS_PHOTOS;

  const showCourseFooter = !loading && !notFound;

  return (
    <>
      <div className="-mx-6 box-border min-w-0 w-[calc(100%+3rem)] max-w-[calc(100%+3rem)]">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-foreground/40" />
          </div>
        ) : notFound ? (
          <div className="bg-white/80 py-16 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-foreground/30" />
            <p className="font-medium text-foreground/70">This class could not be found.</p>
            <p className="mt-1 text-sm text-foreground/50">
              It may have been removed or the link is invalid.
            </p>
            <Button asChild className="mt-6 rounded-full" style={{ backgroundColor: "#3954d0" }}>
              <Link to="/dashboard/available-courses">Browse classes</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden bg-white/80 backdrop-blur-sm">
            <div className="relative h-52 w-full bg-gray-200 sm:h-64">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" aria-hidden>
                  <BookOpen className="h-14 w-14 text-gray-400/90" />
                </div>
              )}
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
                aria-hidden
              />
              <EnrollmentStatusBadge status={enrollmentStatus} className="absolute right-3 top-3" />
            </div>

            <div className="p-6 pb-28 sm:p-8 sm:pb-32">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">{category}</p>
                  <h1
                    className="mt-1 capitalize text-2xl font-bold text-foreground sm:text-3xl"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.3px" }}
                  >
                    {title}
                  </h1>
                </div>
                <div className="w-full min-w-0 sm:w-auto sm:max-w-md sm:shrink-0">
                  <div
                    className="grid w-full grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-end sm:justify-end sm:gap-x-8 sm:gap-y-2"
                    aria-label="Class start and end dates"
                  >
                  <div className="min-w-0 text-left sm:text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
                      Class start
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      {classStartLabel ?? (
                        <span className="font-normal text-foreground/45">To be announced</span>
                      )}
                    </p>
                  </div>
                  <div className="min-w-0 text-left sm:text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
                      Class end
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      {classEndLabel ?? (
                        <span className="font-normal text-foreground/45">To be announced</span>
                      )}
                    </p>
                  </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-8">
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 ring-1 ring-zinc-100/80">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
                      <div className="flex min-w-0 items-center gap-4">
                        {instructorAvatarUrl ? (
                          <img
                            src={instructorAvatarUrl}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-zinc-100"
                          />
                        ) : (
                          <span
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold uppercase tracking-wide text-zinc-600 ring-2 ring-zinc-100"
                            aria-hidden
                          >
                            {nameInitials(instructor)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                            Taught by
                          </p>
                          <p className="mt-1 text-base font-semibold leading-snug text-zinc-900">{instructor}</p>
                        </div>
                      </div>
                      <div className="shrink-0 border-t border-zinc-100 pt-5 sm:border-l sm:border-t-0 sm:pl-10 sm:pt-0 sm:text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Tuition
                        </p>
                        <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-[#3954d0]">
                          {formatPrice(price, currency)}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-6 grid grid-cols-2 gap-5 border-t border-zinc-100 pt-7 sm:grid-cols-3 sm:gap-6">
                      <div className="min-w-0">
                        <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          <BookOpen
                            className="size-3.5 shrink-0 text-[#3954d0]/65"
                            aria-hidden
                          />
                          Lessons
                        </dt>
                        <dd className="mt-1.5 text-sm font-semibold tabular-nums text-zinc-900">
                          {lessonRows.length}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          <Users
                            className="size-3.5 shrink-0 text-[#3954d0]/65"
                            aria-hidden
                          />
                          Students joined
                        </dt>
                        <dd className="mt-1.5 text-sm font-semibold tabular-nums text-zinc-900">
                          {enrollmentCount != null ? (
                            enrollmentCount
                          ) : (
                            <span className="font-normal text-zinc-400">—</span>
                          )}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          <CalendarDays
                            className="size-3.5 shrink-0 text-[#3954d0]/65"
                            aria-hidden
                          />
                          Total sessions
                        </dt>
                        <dd className="mt-1.5 text-sm font-semibold tabular-nums text-zinc-900">
                          {meetings != null && meetings > 0 ? (
                            <>
                              {meetings}
                              <span className="font-normal text-zinc-500"> / 6 mo</span>
                            </>
                          ) : (
                            <span className="font-normal text-zinc-400">—</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-6 rounded-2xl border border-zinc-200/80 bg-white p-5 ring-1 ring-zinc-100/80">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                          <Clock className="h-5 w-5 shrink-0 text-[#3954d0]/80" aria-hidden />
                          Class schedule
                        </h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                          Planned live sessions (date and time). Review this before you enroll so you know when
                          class meets.
                        </p>
                        {scheduleStatusHint ? (
                          <p className="mt-2 text-xs leading-relaxed text-zinc-500">{scheduleStatusHint}</p>
                        ) : null}
                      </div>
                    </div>
                    {sessionSlotsPreview.length > 0 ? (
                      <Tabs
                        key={scheduleMonthTabs.map((t) => `${t.value}:${t.slots.length}`).join("|")}
                        defaultValue={scheduleMonthTabs[0]?.value ?? "m1"}
                        className="mt-5 border-t border-zinc-100 pt-4"
                      >
                        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-full border border-zinc-200/80 bg-zinc-100/90 p-1.5 text-zinc-600">
                          {scheduleMonthTabs.map((t) => (
                            <TabsTrigger
                              key={t.value}
                              value={t.value}
                              className="group flex min-h-[3.25rem] flex-col gap-0.5 whitespace-normal rounded-full px-2 py-2 text-center data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
                            >
                              <span className="text-sm font-semibold leading-tight text-zinc-800 group-data-[state=active]:text-white">
                                {t.tabLabel}
                              </span>
                              {t.monthLine ? (
                                <span className="text-[10px] font-normal leading-snug text-zinc-500 group-data-[state=active]:text-white/75">
                                  {t.monthLine}
                                </span>
                              ) : null}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {scheduleMonthTabs.map((t) => (
                          <TabsContent
                            key={t.value}
                            value={t.value}
                            className="mt-4 focus-visible:outline-none focus-visible:ring-0"
                          >
                            {t.slots.length > 0 ? (
                              <ul className="divide-y divide-zinc-100">
                                {t.slots.map((row, idx) => {
                                  const dateLabel = formatClassDateLabel(row.sessionDate) ?? "Date TBA";
                                  const weekdayLabel = formatSessionWeekdayLabel(row.sessionDate);
                                  const timeLabel = formatSessionTimeLabel(row.sessionTime) ?? "—";
                                  const timeWithDay =
                                    weekdayLabel && timeLabel !== "—"
                                      ? `${weekdayLabel} · ${timeLabel}`
                                      : timeLabel;
                                  const title = formatDisplayTitle(row.title?.trim() || `Session ${idx + 1}`);
                                  const timingStatus = resolveEnrollmentSessionTimingStatus(
                                    row,
                                    scheduleAttendance.heldSlotKeys,
                                    scheduleAttendance.activeSlotKeys,
                                  );
                                  return (
                                    <li
                                      key={`${t.value}-${row.sessionDate}-${idx}-${title}`}
                                      className={cn(
                                        "flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
                                        timingStatus === "finished" && "opacity-75",
                                      )}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-col items-start gap-1">
                                          <SessionTimingChip status={timingStatus} />
                                          <p className="text-sm font-medium text-zinc-900">{title}</p>
                                        </div>
                                        <p className="mt-0.5 text-xs tabular-nums text-zinc-500 sm:hidden">
                                          {dateLabel} · {timeWithDay}
                                        </p>
                                      </div>
                                      <div className="hidden shrink-0 text-right text-sm tabular-nums text-zinc-700 sm:block">
                                        <p className="font-medium">{dateLabel}</p>
                                        <p className="mt-0.5 text-xs text-zinc-500">{timeWithDay}</p>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="text-sm text-zinc-500">No sessions in this period.</p>
                            )}
                          </TabsContent>
                        ))}
                      </Tabs>
                    ) : (
                      <p className="mt-4 border-t border-zinc-100 pt-4 text-sm leading-relaxed text-zinc-500">
                        No session dates are listed yet. Check back after the school publishes the schedule, or ask
                        the school before you enroll.
                      </p>
                    )}
                  </div>

                  {description.trim() ? (
                    <div className="mt-8">
                      <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                        About this class
                      </h2>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                        {description.trim()}
                      </p>
                    </div>
                  ) : null}

                  {lessonRows.length > 0 ? (
                    <div className="mt-8">
                      <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                        What you&apos;ll cover
                      </h2>
                      <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/80">
                        {lessonRows.map((l) => (
                          <li key={l.id}>{l.title}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>

                <aside className="lg:col-span-4">
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 ring-1 ring-zinc-100/80 sm:p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-base font-semibold tracking-tight text-foreground">
                        Reviews from students
                      </h2>
                      {studentReviews.length > 0 || instructorReviews.length > 0 ? (
                        <p className="text-xs text-foreground/55">
                          {studentReviews.length + instructorReviews.length} review
                          {studentReviews.length + instructorReviews.length === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>
                    {reviewsError ? (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-medium text-amber-950">Reviews could not be loaded.</p>
                        <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
                          The class details are still available. Try again if you want to check student feedback.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 h-10 rounded-xl border-amber-300 bg-white text-sm font-semibold text-amber-950 hover:bg-amber-100"
                          onClick={() => window.location.reload()}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : studentReviews.length > 0 ? (
                      <ul className="mt-3 divide-y divide-zinc-100">
                        {studentReviews.map((r) => {
                          const authorName = r.studentName?.trim() || "Student";
                          const reviewBody = r.comment?.trim() || "Rated this class after completing the course.";
                          return (
                            <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                              <div className="flex gap-3">
                                {r.studentAvatarUrl?.trim() ? (
                                  <img
                                    src={r.studentAvatarUrl}
                                    alt=""
                                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-200"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold tracking-wide text-zinc-600"
                                    aria-hidden
                                  >
                                    {nameInitials(authorName)}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-zinc-900">{authorName}</p>
                                      <p className="mt-0.5 text-xs text-zinc-500">
                                        {formatReviewDateLabel(r.submittedAt)}
                                      </p>
                                    </div>
                                    <ReviewStars rating={r.rating} />
                                  </div>
                                  <p className="line-clamp-3 text-sm leading-relaxed text-zinc-600">{reviewBody}</p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : instructorReviews.length > 0 ? (
                      <ul className="mt-3 divide-y divide-zinc-100">
                        {instructorReviews.map((r) => (
                          <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex gap-3">
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold tracking-wide text-zinc-600"
                                aria-hidden
                              >
                                {profileInitials(r.authorName)}
                              </div>
                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-zinc-900">{r.authorName}</p>
                                    {r.dateLabel ? (
                                      <p className="mt-0.5 text-xs text-zinc-400">{r.dateLabel}</p>
                                    ) : null}
                                  </div>
                                  <ReviewStars rating={r.rating} />
                                </div>
                                <p className="line-clamp-4 text-sm leading-relaxed text-zinc-600">{r.body}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-sm font-medium text-zinc-900">No student reviews yet.</p>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                          Feedback from students will appear here after they finish and review this class.
                        </p>
                      </div>
                    )}
                  </div>
                </aside>
              </div>

              <div className="mt-10">
                <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  Class photos
                </h2>
                <p className="mt-1 text-xs text-foreground/55">
                  Your instructor can share photos of the space, materials, or sessions here.
                </p>
                {classPhotoUrls.length > 0 ? (
                  <>
                    <ul
                      className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
                      aria-label="Class photo gallery"
                    >
                      {displayedClassPhotoUrls.map((url, i) => (
                        <li
                          key={`${url}-${i}`}
                          className="aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/80"
                        >
                          <img
                            src={url}
                            alt={`Class photo ${i + 1}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </li>
                      ))}
                    </ul>
                    {hasMoreClassPhotos ? (
                      <p className="mt-3 text-xs text-foreground/50">
                        Showing {MAX_CLASS_PHOTOS} of {classPhotoUrls.length} photos.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-4">
                    <ul
                      className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
                      aria-label="Class photo gallery (empty slots)"
                    >
                      {Array.from({ length: MAX_CLASS_PHOTOS }, (_, i) => (
                        <li
                          key={`class-photo-placeholder-${i}`}
                          className="aspect-[4/3] overflow-hidden rounded-xl border border-dashed border-zinc-200 bg-zinc-50 ring-1 ring-zinc-200/70"
                        >
                          <div
                            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100/90 to-zinc-50/90"
                            aria-hidden
                          >
                            <Images className="h-7 w-7 text-zinc-300/90" />
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-foreground/55">
                      No photos yet. Your instructor can add up to eight images; they will replace these
                      placeholders.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCourseFooter
        ? createPortal(
            <footer
              className={cn(
                "fixed bottom-0 z-40 border-t border-zinc-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md",
                "left-0 right-0",
                isSidebarCollapsed ? "lg:left-20 lg:right-0" : "lg:left-64 lg:right-0",
              )}
            >
              <div className="flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <Link
                  to="/dashboard/available-courses"
                  title="Back to available classes"
                  aria-label="Back to available classes"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                </Link>
                <div className="flex min-w-0 shrink-0 justify-end">
                  {enrollmentStatus === "enrolled" ? (
                    <Button
                      asChild
                      className="h-10 shrink-0 rounded-xl border-0 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#2f47b3] hover:text-white sm:px-5"
                      style={{ backgroundColor: "#3954d0" }}
                    >
                      <Link to={workspacePath}>Continue to Class</Link>
                    </Button>
                  ) : enrollmentStatus === "pending_review" ? (
                    <Button
                      asChild
                      variant="outline"
                      className="h-10 shrink-0 rounded-xl border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 sm:px-5"
                    >
                      <Link to={enrollSuccessPath}>View application</Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="h-10 shrink-0 rounded-xl border-0 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#2f47b3] hover:text-white sm:px-5"
                      style={{ backgroundColor: "#3954d0" }}
                    >
                      <Link to={enrollPath}>
                        {enrollmentStatus === "rejected" ? "Apply again" : "Join Class"}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </footer>,
            document.body,
          )
        : null}
    </>
  );
};

export default StudentAvailableCourseDetailPage;
