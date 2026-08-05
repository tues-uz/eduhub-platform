import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import type { TeacherCourse } from "@/features/teacher/types";
import type { PayrollClassSummaryResponse } from "@/api/eduhubTypes";
import {
  useTeacherCoursesQuery,
  useTeacherStatsQuery,
  usePayrollClassesQuery,
} from "@/features/teacher/hooks/useTeacherQueries";
import { formatDisplayPersonName } from "@/lib/formatPersonName";

/** Seat counts from course rows when lecturer stats API is unavailable. */
function sumEnrollmentSeats(courses: TeacherCourse[]): number {
  return courses.reduce((n, c) => n + (c.enrollmentCount ?? 0), 0);
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCollectedPaymentsTotal(classes: PayrollClassSummaryResponse[]): string {
  const byCurrency = new Map<string, number>();
  for (const cls of classes) {
    for (const student of cls.students) {
      if (student.status !== "paid" || student.amount == null) continue;
      const cur = (student.currency ?? "USD").trim() || "USD";
      byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + student.amount);
    }
  }
  if (byCurrency.size === 0) return "—";
  return [...byCurrency.entries()]
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(" · ");
}

const TeacherDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const { data: payrollClasses = [] } = usePayrollClassesQuery(user.id);
  const userName = formatDisplayPersonName(user.name || "Teacher");

  const { data: apiCourses = [], isLoading: apiCoursesLoading } = useTeacherCoursesQuery(user.id);
  const { data: lecturerStats } = useTeacherStatsQuery();

  const courses = apiCourses;
  const coursesLoading = apiCoursesLoading && apiCourses.length === 0;

  const courseCount = courses.length;
  const collectedPaymentsDisplay = useMemo(
    () => formatCollectedPaymentsTotal(payrollClasses),
    [payrollClasses],
  );
  const seatsFromCourses = useMemo(() => sumEnrollmentSeats(courses), [courses]);

  const totalStudentsDisplay = useMemo(() => {
    if (lecturerStats != null) return String(lecturerStats.totalStudents);
    if (seatsFromCourses > 0) return String(seatsFromCourses);
    return "—";
  }, [lecturerStats, seatsFromCourses]);

  const statsData = useMemo(
    () => [
      {
        label: t("teacher.dashboard.stats.activeClasses"),
        value: String((lecturerStats?.totalCourses ?? 0) || courseCount),
        href: "/dashboard/teacher/courses",
      },
      {
        label: t("teacher.dashboard.stats.totalStudents"),
        value: totalStudentsDisplay,
        href: "/dashboard/teacher/students",
      },
      {
        label: t("teacher.dashboard.stats.pendingGrading"),
        value: lecturerStats != null ? String(lecturerStats.pendingGrading) : "—",
        href: "/dashboard/teacher/assignments",
      },
      {
        label: t("teacher.dashboard.stats.collectedPayments"),
        value: collectedPaymentsDisplay,
        href: "/dashboard/teacher/payroll",
        valueClassName: "text-xl sm:text-2xl break-words leading-snug",
      },
    ],
    [t, lecturerStats, courseCount, collectedPaymentsDisplay, totalStudentsDisplay],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6 md:gap-6">
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("teacher.dashboard.overviewTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("teacher.dashboard.managingSubtitle", { name: userName })}
            </p>
          </div>
        </div>

        <div className="mb-0 flex flex-col gap-1 rounded-lg border border-teal-200/80 bg-teal-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("teacher.dashboard.attendanceQr.title")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("teacher.dashboard.attendanceQr.description")}
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-2 h-8 shrink-0 rounded-md border-teal-200 bg-background px-3 text-xs hover:bg-teal-50 sm:mt-0"
          >
            <Link to="/dashboard/teacher/attendance">
              {t("teacher.dashboard.attendanceQr.cta")}
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {statsData.map((stat) => {
            const valClass =
              "valueClassName" in stat && stat.valueClassName
                ? stat.valueClassName
                : "text-2xl tabular-nums";
            const cardClass =
              "flex h-full flex-col rounded-xl border border-border bg-card text-card-foreground gap-0 py-4 transition-colors hover:border-teal-200 hover:bg-teal-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500";
            return (
              <Link key={stat.href} to={stat.href} className={cardClass}>
                <div className="grid auto-rows-min items-start gap-2 px-6">
                  <div className="text-sm capitalize text-muted-foreground">{stat.label}</div>
                  <div className={`font-semibold tracking-tight text-foreground ${valClass}`}>
                    {stat.value}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground">
          <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {t("teacher.dashboard.classesTable.title")}
            </h2>
            <Link
              to="/dashboard/teacher/courses"
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {t("common.viewAll")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {coursesLoading ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              {t("teacher.courses.loading")}
            </p>
          ) : courses.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              {t("teacher.dashboard.classesTable.emptyPrefix")}{" "}
              <Link
                to="/dashboard/teacher/courses/new"
                className="font-medium text-teal-700 underline underline-offset-2"
              >
                {t("teacher.dashboard.classesTable.createFirstClass")}
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {courses.map((course) => (
                <li key={course.id}>
                  <div className="flex items-center justify-between gap-3 px-6 py-3.5">
                    <Link
                      to={`/dashboard/teacher/courses/${course.id}/edit`}
                      className="flex min-w-0 items-center gap-3 hover:opacity-90"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-teal-50 text-teal-700">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {course.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("teacher.dashboard.classesTable.lessonCount", {
                            count: course.lessons.length,
                          })}
                        </p>
                      </div>
                    </Link>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 rounded-md px-3 text-xs"
                    >
                      <Link to={`/dashboard/teacher/courses/${course.id}/edit`}>
                        {t("teacher.dashboard.classesTable.action.editClass")}
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
