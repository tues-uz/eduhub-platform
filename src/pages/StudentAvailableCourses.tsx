import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { BookOpen, Search, Loader2, PlayCircle } from "@/lib/icons";
import { InstructorAvatar } from "@/components/InstructorAvatar";
import { StudentAvatarGroup, type StudentAvatarPreview } from "@/components/StudentAvatarGroup";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthSession } from "@/features/auth/context";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";
import { useStudentCourseScheduleSummaries } from "@/features/student/hooks/useStudentCourseScheduleSummaries";
import { eduhubCourses, eduhubCategories } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";
import { EnrollmentStatusBadge } from "@/features/enrollment/EnrollmentStatusBadge";
import {
  resolveStudentCourseEnrollmentDisplayStatus,
  resolveEnrollmentRejectionNote,
  type StudentCourseEnrollmentDisplayStatus,
} from "@/features/enrollment/studentCourseEnrollmentStatus";
import { useMyEnrollmentApplicationsByCourse } from "@/features/enrollment/useMyEnrollmentApplicationsByCourse";
import { StudentPromoCarousel } from "@/features/student/components/StudentPromoCarousel";
import { formatDisplayPersonName } from "@/lib/formatPersonName";
import { tuitionForJoinFromMeeting } from "@/features/enrollment/enrollmentSessionTuition";
import { resolveInstructorAvatarUrl } from "@/features/teacher/resolveInstructorAvatarUrl";
import type { CourseScheduleSummary } from "@/features/student/courseScheduleSummary";
import { formatClassDateLabel } from "@/features/courses/classSchedulePreview";
import { resolveEnrolledStudentPreviews } from "@/features/student/enrolledStudentPreviews";
import { TEACHER_CLASS_MAX_STUDENTS, canApplyToTeacherClass, isTeacherClassFull } from "@/features/courses/teacherClassCapacity";

type AvailableCourseItem = {
  id: string;
  /** For teacher local courses this is teacher_${id}; for API courses same as id */
  linkId: string;
  title: string;
  instructor: string;
  instructorAvatarUrl?: string;
  category: string;
  duration: string;
  modules: number;
  price: number | undefined;
  currency?: string;
  enrollmentStatus: StudentCourseEnrollmentDisplayStatus;
  progress?: number;
  status?: string;
  nextLesson?: string;
  /** Cover image from API or teacher form upload */
  thumbnailUrl?: string;
  enrollmentCount?: number;
  enrolledStudents?: StudentAvatarPreview[];
  rejectionNote?: string;
};

function formatPrice(price: number | undefined, currency: string, t: TFunction): string {
  if (price == null || price <= 0) return t("availableCourses.free");
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

function resolveCardTuition(
  price: number | undefined,
  scheduleSummary: CourseScheduleSummary | undefined,
  enrollmentStatus: StudentCourseEnrollmentDisplayStatus,
): {
  amount: number | undefined;
  listedAmount?: number;
  allSessionsFinished: boolean;
} {
  const allSessionsFinished = scheduleSummary?.allSessionsFinished ?? false;
  if (price == null || price <= 0) {
    return { amount: price, allSessionsFinished };
  }
  if (enrollmentStatus === "enrolled" || !scheduleSummary) {
    return { amount: price, allSessionsFinished };
  }
  const quote = tuitionForJoinFromMeeting(
    price,
    scheduleSummary.total,
    scheduleSummary.joinFromMeeting,
  );
  if (!quote) {
    return { amount: price, allSessionsFinished };
  }
  return {
    amount: quote.amountDue,
    listedAmount: quote.amountDue < quote.listedTotal ? quote.listedTotal : undefined,
    allSessionsFinished,
  };
}

async function enrichWithEnrolledStudents(items: AvailableCourseItem[]): Promise<AvailableCourseItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const { students, totalCount } = await resolveEnrolledStudentPreviews({
        apiCourseId: item.id,
        enrollmentCount: item.enrollmentCount,
      });
      return {
        ...item,
        enrolledStudents: students,
        enrollmentCount: totalCount,
      };
    }),
  );
}

async function enrichWithInstructorAvatars(items: AvailableCourseItem[]): Promise<AvailableCourseItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const instructorAvatarUrl = await resolveInstructorAvatarUrl({
        instructorName: item.instructor,
        existingUrl: item.instructorAvatarUrl,
        courseId: item.id,
      });
      return instructorAvatarUrl ? { ...item, instructorAvatarUrl } : item;
    }),
  );
}

const StudentAvailableCourses = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();
  const { data: enrolledCourses = [] } = useStudentCoursesQuery();
  const { byCourse: applicationsByCourse } = useMyEnrollmentApplicationsByCourse(emailNorm);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [courses, setCourses] = useState<AvailableCourseItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentStoreTick, setEnrollmentStoreTick] = useState(0);

  useEffect(() => {
    eduhubCategories.getAll()
      .then((res) => setCategories((res || []).map((c) => c.name)))
      .catch((err) => console.error("Failed to load categories", err));
  }, []);

  const scheduleCourseItems = useMemo(
    () =>
      courses.map((course) => ({
        id: course.linkId,
        title: course.title,
        instructor: course.instructor,
        progress: course.progress ?? 0,
        status: course.status ?? "In Progress",
        nextLesson: course.nextLesson ?? "—",
        category: course.category,
        duration: course.duration,
        modules: course.modules,
        enrolledDate: "",
      })),
    [courses],
  );
  const scheduleSummaries = useStudentCourseScheduleSummaries(scheduleCourseItems);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

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
    let cancelled = false;
    const enrolledIds = new Set(enrolledCourses.map((c) => String(c.id)));
    const enrolledByLinkId = new Map(enrolledCourses.map((c) => [String(c.id), c]));

    const enrollmentStatusFor = (linkId: string): StudentCourseEnrollmentDisplayStatus =>
      resolveStudentCourseEnrollmentDisplayStatus(
        linkId,
        emailNorm,
        enrolledIds.has(linkId),
        applicationsByCourse.get(linkId),
      );

    async function load() {
      setLoading(true);

      const mapApiToItem = (c: CourseSummaryResponse) => {
        const enrolledData = enrolledByLinkId.get(c.id);
        const price = c.pricing?.discountedAmount ?? c.pricing?.amount;
        return {
          id: c.id,
          linkId: c.id,
          title: c.title,
          instructor: c.lecturerName,
          instructorAvatarUrl: c.lecturerAvatarUrl?.trim() || undefined,
          category: c.category ?? t("availableCourses.defaultCategory"),
          duration: "—",
          modules: 0,
          price: price as number | undefined,
          currency: c.pricing?.currency,
          thumbnailUrl: c.thumbnailUrl?.trim() || undefined,
          enrollmentCount: c.enrollmentCount,
          enrollmentStatus: enrollmentStatusFor(c.id),
          rejectionNote: resolveEnrollmentRejectionNote(
            c.id,
            emailNorm,
            applicationsByCourse.get(c.id),
          ),
          progress: enrolledData?.progress,
          status: enrolledData?.status,
          nextLesson: enrolledData?.nextLesson,
        };
      };

      try {
        const seenIds = new Set<string>();
        const apiItems: AvailableCourseItem[] = [];

        // 1) GET /courses = getAllPublishedCourses (Swagger): lecturer-created courses that are PUBLISHED. Students explore these.
        try {
          const pubRes = await eduhubCourses.getAll({ page: 0, size: 100 });
          pubRes.forEach((c) => {
            if (!seenIds.has(c.id)) {
              seenIds.add(c.id);
              apiItems.push(mapApiToItem(c));
            }
          });
        } catch {
          // API down or auth issue
        }

        const merged = await enrichWithInstructorAvatars(await enrichWithEnrolledStudents(apiItems));
        if (!cancelled) {
          setCourses(merged);
        }
      } catch {
        if (!cancelled) setCourses([]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [enrolledCourses, enrollmentStoreTick, emailNorm, applicationsByCourse, t]);

  const categoryOptions = useMemo(() => {
    const options = new Set<string>(categories);
    for (const course of courses) {
      const value = course.category.trim();
      if (value) options.add(value);
    }
    return Array.from(options).sort((a, b) => {
      const aIndex = categories.indexOf(a);
      const bIndex = categories.indexOf(b);
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      return a.localeCompare(b);
    });
  }, [courses, categories]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return courses.filter((course) => {
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        course.instructor.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || course.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, categoryFilter]);

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-0 pb-8">
      <StudentPromoCarousel placement="my-class" className="mb-6" fullWidth />

      <div className="container mx-auto px-0">
          <div className="mb-8">
            <h1
              className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {t("availableCourses.title")}
            </h1>
            <p className="mb-4 text-sm text-foreground/70">
              {t("availableCourses.subtitle")}
            </p>
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-0 flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                <Input
                  type="search"
                  placeholder={t("availableCourses.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchQuery(value);
                    setSearchParams(
                      (prev) => {
                        const next = new URLSearchParams(prev);
                        const trimmed = value.trim();
                        if (trimmed) next.set("q", trimmed);
                        else next.delete("q");
                        return next;
                      },
                      { replace: true },
                    );
                  }}
                  className="h-11 rounded-xl border-gray-200 pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-11 w-[150px] shrink-0 rounded-xl border-gray-200 bg-white">
                  <SelectValue placeholder={t("availableCourses.allCategories")} />
                </SelectTrigger>
                <SelectContent align="end" className="rounded-2xl border-gray-200 p-2 shadow-lg">
                  <SelectItem value="all" className="cursor-pointer rounded-xl">
                    {t("availableCourses.allCategories")}
                  </SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category} className="cursor-pointer rounded-xl">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-foreground/40" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 min-[1300px]:grid-cols-4">
                {filteredCourses.map((course) => {
                  const category = course.category.trim();
                  const metaParts: string[] = [];
                  if (course.modules > 0) {
                    metaParts.push(`${course.modules} ${t("availableCourses.module", { count: course.modules })}`);
                  }
                  if (course.duration.trim() && course.duration !== "—") {
                    metaParts.push(course.duration.trim());
                  }
                  const metaLabel = metaParts.length > 0 ? metaParts.join(" · ") : null;
                  const scheduleSummary = scheduleSummaries.get(course.linkId);
                  const tuitionDisplay = resolveCardTuition(
                    course.price,
                    scheduleSummary,
                    course.enrollmentStatus,
                  );
                  const classStartLabel = scheduleSummary
                    ? formatClassDateLabel(scheduleSummary.classStartDate)
                    : null;
                  const classEndLabel = scheduleSummary
                    ? formatClassDateLabel(scheduleSummary.classEndDate)
                    : null;
                  const isClassFull = isTeacherClassFull(course.enrollmentCount);
                  const canJoinClass = canApplyToTeacherClass(course.enrollmentStatus, course.enrollmentCount);

                  return (
                  <div
                    key={course.linkId}
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/dashboard/available-courses/class/${encodeURIComponent(course.linkId)}`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/dashboard/available-courses/class/${encodeURIComponent(course.linkId)}`);
                      }
                    }}
                    className="relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition-shadow hover:shadow-lg"
                  >
                    <div className="relative mx-3 mt-3 flex h-52 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-56">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center" aria-hidden>
                          <BookOpen className="h-12 w-12 text-gray-400/90" />
                        </div>
                      )}
                      <EnrollmentStatusBadge
                        status={course.enrollmentStatus}
                        className="absolute left-0 top-0 m-2"
                      />
                    </div>

                    <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center justify-between gap-3">
                          {category ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                              {category}
                            </span>
                          ) : (
                            <span aria-hidden />
                          )}
                        </div>

                        <h3
                          className="mt-2 line-clamp-2 text-lg font-bold leading-snug tracking-tight text-slate-900"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {course.title}
                        </h3>

                        {scheduleSummary ? (
                          <dl className="mt-2.5 grid grid-cols-2 gap-x-4">
                            <div className="min-w-0">
                              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t("availableCourses.starts")}</dt>
                              <dd className="mt-0.5 text-xs font-semibold leading-snug tabular-nums text-slate-800">
                                {classStartLabel ?? (
                                  <span className="font-normal text-slate-400">{t("availableCourses.tba")}</span>
                                )}
                              </dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t("availableCourses.ends")}</dt>
                              <dd className="mt-0.5 text-xs font-semibold leading-snug tabular-nums text-slate-800">
                                {classEndLabel ?? (
                                  <span className="font-normal text-slate-400">{t("availableCourses.tba")}</span>
                                )}
                              </dd>
                            </div>
                          </dl>
                        ) : null}

                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <InstructorAvatar
                              name={course.instructor}
                              avatarUrl={course.instructorAvatarUrl}
                              className="h-8 w-8"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800">
                                {formatDisplayPersonName(course.instructor)}
                              </p>
                              <p className="text-xs text-slate-500">{t("availableCourses.instructor")}</p>
                            </div>
                          </div>
                          {metaLabel ? (
                            <p className="shrink-0 text-right text-xs font-medium text-slate-500">{metaLabel}</p>
                          ) : null}
                        </div>

                        {scheduleSummary ? (
                          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                            <span className="text-xs font-medium text-slate-500">{t("availableCourses.sessions")}</span>
                            <span className="text-xs tabular-nums text-slate-700">
                              <span className="font-semibold text-slate-900">{scheduleSummary.reached}</span>
                              <span className="text-slate-400"> / </span>
                              <span className="font-medium">{scheduleSummary.total}</span>
                              <span className="text-slate-500"> {t("availableCourses.sessionsLabel")}</span>
                            </span>
                          </div>
                        ) : null}

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                          <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                            <span className="text-xs font-medium text-slate-500">
                              {t("availableCourses.studentsJoined")}
                            </span>
                            <div className="flex min-w-0 items-center gap-1.5">
                              {course.enrolledStudents && course.enrolledStudents.length > 0 ? (
                                <div
                                  className="min-w-0 shrink"
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => event.stopPropagation()}
                                >
                                  <StudentAvatarGroup
                                    students={course.enrolledStudents}
                                    totalCount={course.enrollmentCount}
                                    size="sm"
                                  />
                                </div>
                              ) : null}
                              <span className="shrink-0 text-xs tabular-nums text-slate-700">
                                <span className={isClassFull ? "font-semibold text-amber-700" : "font-semibold text-slate-900"}>
                                  {course.enrollmentCount ?? 0}
                                </span>
                                <span className="text-slate-400"> / </span>
                                <span className="font-medium">{TEACHER_CLASS_MAX_STUDENTS}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                            <span className="text-xs font-medium text-slate-500">{t("availableCourses.tuition")}</span>
                            {tuitionDisplay.allSessionsFinished ? (
                              <span className="text-xs font-medium leading-snug text-slate-500">
                                {t("availableCourses.scheduleComplete")}
                              </span>
                            ) : (
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="text-xs font-bold tabular-nums tracking-tight text-slate-900 sm:text-sm">
                                  {formatPrice(tuitionDisplay.amount, course.currency ?? "USD", t)}
                                </span>
                                {tuitionDisplay.listedAmount ? (
                                  <span className="text-[10px] tabular-nums text-slate-400 line-through sm:text-[11px]">
                                    {formatPrice(tuitionDisplay.listedAmount, course.currency ?? "USD", t)}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        {course.enrollmentStatus === "enrolled" ? (
                          <Link
                            to={`/dashboard/courses/${course.linkId}`}
                            className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <PlayCircle className="mr-2 h-5 w-5" aria-hidden />
                            {t("availableCourses.continueLearning")}
                          </Link>
                        ) : course.enrollmentStatus === "pending_review" ? (
                          <Link
                            to={`/dashboard/available-courses/enroll/${encodeURIComponent(course.linkId)}/success`}
                            className="block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-auto w-full rounded-xl border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                            >
                              {t("availableCourses.viewApplication")}
                            </Button>
                          </Link>
                        ) : !canJoinClass ? (
                          <Button
                            size="sm"
                            disabled
                            className="h-auto w-full cursor-not-allowed rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-500"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t("availableCourses.classFull")}
                          </Button>
                        ) : (
                          <Link
                            to={`/dashboard/available-courses/enroll/${encodeURIComponent(course.linkId)}`}
                            className="block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              className="h-auto w-full rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                            >
                              {course.enrollmentStatus === "rejected" ? t("availableCourses.applyAgain") : t("availableCourses.joinClass")}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>

              {filteredCourses.length === 0 && (
                <div className="rounded-xl border border-gray-200/50 bg-white/50 py-16 text-center">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 text-foreground/30" />
                  <p className="font-medium text-foreground/70">
                    {courses.length === 0
                      ? t("availableCourses.emptyNoClassesTitle")
                      : t("availableCourses.emptyNoMatchTitle")}
                  </p>
                  <p className="mt-1 text-sm text-foreground/50">
                    {courses.length === 0 ? t("availableCourses.emptyNoClassesHint") : t("availableCourses.emptyNoMatchHint")}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    {courses.length === 0 && (
                      <Link to="/dashboard/courses">
                        <Button className="rounded-full" style={{ backgroundColor: "#3954d0" }}>
                          {t("availableCourses.myClass")}
                        </Button>
                      </Link>
                    )}
                    {searchQuery || categoryFilter !== "all" ? (
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => {
                          setSearchQuery("");
                          setCategoryFilter("all");
                        }}
                      >
                        {t("availableCourses.clearFilters")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </>
          )}
    </div>
    </div>
    </TooltipProvider>
  );
};

export default StudentAvailableCourses;
