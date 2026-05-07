import { useEffect, useState } from "react";
import { useAuthSession } from "@/features/auth/context";
import { enrollmentApplicationStore } from "@/features/enrollment/enrollmentApplicationStore";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Images,
  Loader2,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLayoutContext } from "@/features/layout/context";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";
import { cn } from "@/lib/utils";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import type { TeacherCourse } from "@/features/teacher/types";
import { eduhubCourses, eduhubLessons, eduhubModules } from "@/api/eduhubClient";
import type { CourseResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import {
  boundsFromMeetingSlots,
  mergeScheduleDisplayForAdminReview,
  resolvedSessionsSixMonths,
} from "@/features/admin/utils/adminCourseScheduleDisplay";

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

type LessonPreview = { id: string; title: string };

type DummyReview = {
  id: string;
  authorName: string;
  rating: number;
  dateLabel: string;
  body: string;
};

const DUMMY_STUDENT_REVIEWS: DummyReview[] = [
  {
    id: "r1",
    authorName: "Maya R.",
    rating: 5,
    dateLabel: "3 weeks ago",
    body: "Clear explanations and homework that actually helped. The instructor replies quickly in the forum.",
  },
  {
    id: "r2",
    authorName: "Jonas T.",
    rating: 4,
    dateLabel: "Last month",
    body: "Pace was comfortable for working full-time. Would love a few more practice quizzes.",
  },
  {
    id: "r3",
    authorName: "Priya S.",
    rating: 5,
    dateLabel: "2 months ago",
    body: "Loved the structure—each lesson built on the last. Finished feeling confident for the final project.",
  },
];

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

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [teacherCourse, setTeacherCourse] = useState<TeacherCourse | null>(null);
  const [apiCourse, setApiCourse] = useState<CourseResponse | null>(null);
  const [lessonRows, setLessonRows] = useState<LessonPreview[]>([]);

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

  const emailNorm = user.email.trim().toLowerCase();
  const isApprovedLocally =
    linkId && emailNorm ? enrollmentApplicationStore.isApprovedForCourse(linkId, emailNorm) : false;
  const isEnrolled =
    enrolledCourses.some((c) => String(c.id) === linkId) || isApprovedLocally;

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
      eduhubCourses
        .getById(linkId)
        .then((c) => {
          if (cancelled) return null;
          setApiCourse(c);
          return eduhubModules
            .getByCourse(linkId)
            .then((modules) =>
              Promise.all(
                modules.map((m) =>
                  eduhubLessons
                    .getByModule(linkId, m.id)
                    .then((lessons) => lessons.map((l) => ({ id: l.id, title: l.title })))
                    .catch(() => [] as LessonPreview[])
                )
              )
            )
            .catch(() => [] as LessonPreview[][]);
        })
        .then((arrays) => {
          if (cancelled) return;
          if (Array.isArray(arrays)) {
            setLessonRows(arrays.flat());
          }
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
    apiCourse?.lecturer?.avatarUrl?.trim() || teacherCourse?.instructorAvatarUrl?.trim() || undefined;
  const category = apiCourse?.category ?? "Class";
  const description = apiCourse?.description ?? teacherCourse?.description ?? "";
  const thumbnailUrl = apiCourse?.thumbnailUrl?.trim() || teacherCourse?.thumbnailUrl?.trim();
  const scheduleMerged =
    apiCourse && isUuid(linkId) ? mergeScheduleDisplayForAdminReview(linkId, apiCourse) : null;

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
              {isEnrolled ? (
                <span className="absolute right-3 top-3 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm">
                  Enrolled
                </span>
              ) : null}
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
                <div
                  className="flex shrink-0 flex-row flex-wrap items-end justify-end gap-x-6 gap-y-2 sm:gap-x-8 sm:text-right"
                  aria-label="Class start and end dates"
                >
                  <div className="min-w-0 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
                      Class start
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      {classStartLabel ?? (
                        <span className="font-normal text-foreground/45">To be announced</span>
                      )}
                    </p>
                  </div>
                  <div className="min-w-0 text-right">
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
                      <p className="text-xs text-foreground/55">Sample feedback</p>
                    </div>
                    <ul className="mt-3 divide-y divide-zinc-100">
                      {DUMMY_STUDENT_REVIEWS.map((r) => (
                        <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold tracking-wide text-zinc-600"
                              aria-hidden
                            >
                              {r.authorName
                                .split(/\s+/)
                                .map((p) => p[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-zinc-900">{r.authorName}</p>
                                  <p className="mt-0.5 text-xs text-zinc-400">{r.dateLabel}</p>
                                </div>
                                <ReviewStars rating={r.rating} />
                              </div>
                              <p className="line-clamp-3 text-sm leading-relaxed text-zinc-600">{r.body}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
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
                "fixed bottom-0 z-50 border-t border-zinc-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md",
                "left-0 right-0",
                isSidebarCollapsed ? "lg:left-20 lg:right-0" : "lg:left-64 lg:right-0",
              )}
            >
              <div className="grid w-full min-w-0 grid-cols-1 gap-3 px-4 py-3 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-4 lg:px-6 xl:gap-6 xl:px-8">
                <div className="order-1 flex min-w-0 items-center justify-center lg:order-1 lg:justify-start">
                  <Link
                    to="/dashboard/available-courses"
                    title="Back to available classes"
                    aria-label="Back to available classes"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  </Link>
                </div>
                <div className="order-first flex min-w-0 justify-center lg:order-2 lg:justify-end">
                  {isEnrolled ? (
                    <Button
                      asChild
                      className="h-10 w-auto shrink-0 rounded-xl border-0 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#2f47b3] hover:text-white"
                      style={{ backgroundColor: "#3954d0" }}
                    >
                      <Link to={workspacePath}>Continue to Class</Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      className="h-10 w-full max-w-[140px] rounded-xl border-0 text-sm font-semibold text-white shadow-sm hover:bg-[#2f47b3] hover:text-white sm:max-w-[160px]"
                      style={{ backgroundColor: "#3954d0" }}
                    >
                      <Link to={enrollPath}>Join Class</Link>
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
