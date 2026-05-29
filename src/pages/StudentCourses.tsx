import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  PlayCircle,
  Search,
} from "@/lib/icons";
import { InstructorAvatar } from "@/components/InstructorAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";
import { useStudentCourseScheduleSummaries } from "@/features/student/hooks/useStudentCourseScheduleSummaries";
import { formatDisplayPersonName } from "@/lib/formatPersonName";
import { StudentPromoCarousel } from "@/features/student/components/StudentPromoCarousel";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

type StatusFilter = "all" | "In Progress" | "Almost Complete" | "Completed";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "In Progress", label: "In Progress" },
  { value: "Almost Complete", label: "Almost Complete" },
  { value: "Completed", label: "Completed" },
];

type EnrollmentStat = {
  label: string;
  value: number;
  icon: typeof BookOpen;
};

function EnrollmentStatCard({ label, value, icon: Icon }: EnrollmentStat) {
  return (
    <div className="flex flex-1 flex-col bg-white px-6 py-5">
      <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
        <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
        {label}
      </span>
      <span
        className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {value}
      </span>
    </div>
  );
}

function statusBadgeClass(status: string): string {
  if (status === "Completed") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80";
  if (status === "Almost Complete") return "bg-blue-50 text-blue-900 ring-1 ring-blue-200/80";
  return "bg-yellow-50 text-yellow-900 ring-1 ring-yellow-200/80";
}

function isEmptyMeta(value: string | undefined): boolean {
  const t = value?.trim() ?? "";
  return !t || t === "—" || t === "-";
}

function lessonSummary(modules: number, duration: string): string | null {
  const parts: string[] = [];
  if (modules > 0) {
    parts.push(`${modules} lesson${modules === 1 ? "" : "s"}`);
  }
  if (!isEmptyMeta(duration)) {
    parts.push(duration.trim());
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

const StudentCourses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: enrolledCourses = [] } = useStudentCoursesQuery();
  const scheduleSummaries = useStudentCourseScheduleSummaries(enrolledCourses);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const filteredCourses = enrolledCourses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const inProgressCount = enrolledCourses.filter((c) => c.status !== "Completed").length;
  const completedCount = enrolledCourses.filter((c) => c.status === "Completed").length;

  const enrollmentStats: EnrollmentStat[] = [
    { label: "Total enrolled", value: enrolledCourses.length, icon: BookOpen },
    { label: "In progress", value: inProgressCount, icon: PlayCircle },
    { label: "Completed", value: completedCount, icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-0 pb-8">
      <StudentPromoCarousel placement="my-class" className="mb-6" fullWidth />

      <div className="container mx-auto min-h-0 px-0">
          <div className="mb-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <h1
                  className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  My Class
                </h1>
                <p className="mt-2 text-sm text-foreground/70">
                  Information about the classes you are enrolled in. Continue learning or review completed classes.
                </p>
              </div>
              <Link to="/eduhub" className="shrink-0">
                <Button
                  variant="outline"
                  className="rounded-full border-gray-200 bg-white text-foreground hover:bg-gray-50"
                >
                  More Classes
                </Button>
              </Link>
            </div>

            <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-200/80">
              <div className="grid grid-cols-1 divide-y divide-zinc-200/80 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {enrollmentStats.map((stat) => (
                  <EnrollmentStatCard key={stat.label} {...stat} />
                ))}
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                type="search"
                placeholder="Search by class name, instructor, or category..."
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
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={statusFilter === value ? "default" : "outline"}
                  size="sm"
                  className={`rounded-full px-5 text-xs ${statusFilter !== value ? "hover:border-gray-200 hover:bg-gray-100" : ""}`}
                  style={statusFilter === value ? { backgroundColor: "#3954d0" } : undefined}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-foreground/60">
              {filteredCourses.length} class{filteredCourses.length !== 1 ? "es" : ""} found
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 min-[1300px]:grid-cols-4">
            {filteredCourses.map((course) => {
              const hasNextLesson = !isEmptyMeta(course.nextLesson);
              const lessonsLabel = lessonSummary(course.modules, course.duration);
              const category = course.category.trim();
              const scheduleSummary = scheduleSummaries.get(String(course.id));

              return (
              <div
                key={course.id}
                className="group relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition-shadow hover:shadow-lg"
              >
                <Link
                  to={`/dashboard/courses/${course.id}`}
                  className="relative mx-3 mt-3 flex h-52 overflow-hidden rounded-xl bg-gray-100 sm:h-56"
                >
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center" aria-hidden>
                      <BookOpen className="h-12 w-12 text-gray-400/90" />
                    </div>
                  )}
                  <span
                    className={`absolute left-0 top-0 m-2 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm ${statusBadgeClass(course.status)}`}
                  >
                    {course.status}
                  </span>
                </Link>

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
                    <time
                      className="shrink-0 text-xs text-slate-400"
                      dateTime={course.enrolledDate}
                    >
                      Joined {formatDate(course.enrolledDate)}
                    </time>
                  </div>

                  <Link to={`/dashboard/courses/${course.id}`} className="mt-2 block">
                    <h5
                      className="line-clamp-2 text-lg font-bold leading-snug tracking-tight text-slate-900"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {course.title}
                    </h5>
                  </Link>

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
                        <p className="text-xs text-slate-500">Instructor</p>
                      </div>
                    </div>
                    {lessonsLabel ? (
                      <p className="shrink-0 text-right text-xs font-medium text-slate-500">
                        {lessonsLabel}
                      </p>
                    ) : null}
                  </div>

                  {scheduleSummary ? (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#3954d0]/70" aria-hidden />
                        Schedule
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-slate-900">
                        {scheduleSummary.reached}
                        <span className="text-slate-500"> / </span>
                        {scheduleSummary.total}
                        <span className="text-slate-700"> sessions</span>
                      </span>
                    </div>
                  ) : null}

                  {hasNextLesson ? (
                    <p className="mt-4 flex min-w-0 items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                      <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#3954d0]" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                          Up next
                        </span>
                        <span className="line-clamp-2 font-medium text-slate-800">{course.nextLesson}</span>
                      </span>
                    </p>
                  ) : null}
                  </div>

                  <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                      <span>Your progress</span>
                      <span className="tabular-nums text-slate-900">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-2 bg-slate-100" />
                  </div>

                  <Link
                    to={`/dashboard/courses/${course.id}`}
                    className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300"
                  >
                    <PlayCircle className="mr-2 h-5 w-5" aria-hidden />
                    {course.status === "Completed" ? "Review class" : "Continue learning"}
                  </Link>
                  </div>
                </div>
              </div>
            );
            })}
          </div>

          {filteredCourses.length === 0 && (
            <div className="rounded-xl border border-gray-200/50 bg-white/50 py-16 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-foreground/30" />
              <p className="font-medium text-foreground/70">No classes match your filters.</p>
              <p className="mt-1 text-sm text-foreground/50">Try a different search or status filter.</p>
              <Button
                variant="outline"
                className="mt-4 rounded-full"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      next.delete("q");
                      return next;
                    },
                    { replace: true },
                  );
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
      </div>
    </div>
  );
};

export default StudentCourses;
