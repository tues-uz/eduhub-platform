import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, ChevronRight, Loader2, Plus, UserPlus, Users } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { useAuthSession } from "@/features/auth/context";
import { eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import type { CourseStatus } from "@/api/eduhubTypes";
import type { TeacherCourse } from "../types";
import { TeacherAttendanceSessionPanel } from "@/features/teacher/components/TeacherAttendanceSessionPanel";
import { TeacherSubstituteCoverPanel } from "@/features/teacher/components/TeacherSubstituteCoverPanel";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { cn } from "@/lib/utils";
import {
  parseOptionalPositiveInt,
  resolveClassScheduleFormState,
} from "@/features/teacher/pages/teacherCourseFormHelpers";

function courseStatusBadge(t: TFunction, status?: CourseStatus) {
  if (!status) return null;

  const base = "absolute right-2 top-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium shadow-sm";

  switch (status) {
    case "PUBLISHED":
      return {
        label: t("teacher.scheduleApprovals.status.published"),
        className: cn(base, "bg-green-100 text-green-800"),
      };
    case "SCHEDULE_PENDING":
      return {
        label: t("teacher.scheduleApprovals.status.actionNeeded"),
        className: cn(base, "bg-amber-100 text-amber-800"),
      };
    case "SCHEDULE_APPROVED":
      return {
        label: t("teacher.courses.card.statusScheduleApproved"),
        className: cn(base, "bg-emerald-100 text-emerald-800"),
      };
    case "REJECTED":
      return {
        label: t("teacher.scheduleApprovals.status.rejected"),
        className: cn(base, "bg-red-100 text-red-800"),
      };
    case "DRAFT":
      return {
        label: t("teacher.scheduleApprovals.status.draft"),
        className: cn(base, "bg-slate-100 text-slate-700"),
      };
    default:
      return {
        label: status,
        className: cn(base, "bg-amber-100 text-amber-800"),
      };
  }
}

async function enrichTeacherCourses(courses: TeacherCourse[]): Promise<TeacherCourse[]> {
  return Promise.all(
    courses.map(async (course) => {
      let classMeetingsInSixMonths = course.classMeetingsInSixMonths;
      let classMeetingSlots = course.classMeetingSlots;

      try {
        const proposal = await eduhubSchedule.getProposal(course.id);
        if (proposal) {
          classMeetingsInSixMonths = proposal.sessionCount;
          classMeetingSlots = proposal.sessions.map((session) => ({
            title: session.title,
            sessionDate: session.sessionDate,
            sessionTime: session.sessionTime,
          }));
        }
      } catch {
        /* no proposal yet */
      }

      const resolved = resolveClassScheduleFormState(
        {
          classMeetingsInSixMonths,
          classMeetingSlots,
        },
        course.id,
      );
      const resolvedCount = parseOptionalPositiveInt(resolved.meetingsSixMonthsStr);

      return {
        ...course,
        classMeetingsInSixMonths: resolvedCount ?? classMeetingsInSixMonths,
        classMeetingSlots: resolved.slots.length ? resolved.slots : classMeetingSlots,
      };
    }),
  );
}

const TeacherCoursesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      if (user.id) {
        try {
          const res = await eduhubCourses.getByLecturer(user.id);
          const apiCourses: TeacherCourse[] = (res || []).map((c) => ({
            id: c.id,
            title: c.title,
            description: "",
            instructorName: c.lecturerName,
            thumbnailUrl: c.thumbnailUrl,
            enrollmentCount: c.enrollmentCount,
            lessons: [],
            createdAt: c.createdAt,
            updatedAt: c.createdAt,
            status: c.status,
            classMeetingsInSixMonths: c.classMeetingsInSixMonths,
            classMeetingSlots: c.classMeetingSlots?.map((session) => ({
              title: session.title,
              sessionDate: session.sessionDate,
              sessionTime: session.sessionTime,
            })),
          }));
          const enriched = await enrichTeacherCourses(apiCourses);
          if (!cancelled) setCourses(enriched);
        } catch {
          if (!cancelled) setCourses([]);
        }
      } else {
        if (!cancelled) setCourses([]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6 md:gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("teacherNav.myClass")}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("teacher.courses.description")}
            </p>
          </div>
          <Button asChild className="shrink-0 bg-teal-700 hover:bg-teal-800">
            <Link to="/dashboard/teacher/courses/new" className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("teacher.courses.addClass")}
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="courses"
              className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {t("teacher.courses.tabs.classes")}
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <Users className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {t("teacher.courses.tabs.attendance")}
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {t("teacher.courses.tabs.schedule")}
            </TabsTrigger>
            <TabsTrigger
              value="substitute"
              className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {t("teacher.courses.tabs.substitute")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            {loading ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("teacher.courses.loading")}
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-left">
                <p className="text-sm font-medium text-foreground">{t("teacher.courses.empty.title")}</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {t("teacher.courses.empty.description")}
                </p>
                <Button asChild size="sm" className="mt-4 bg-teal-700 text-white hover:bg-teal-800">
                  <Link to="/dashboard/teacher/courses/new" className="inline-flex items-center gap-1.5">
                    <Plus className="h-4 w-4" />
                    {t("teacher.courses.empty.cta")}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {courses.map((course) => {
                  const enrolled = course.enrollmentCount ?? 0;
                  const statusBadge = courseStatusBadge(t, course.status);
                  const sessionsCount = course.classMeetingsInSixMonths ?? null;
                  return (
                    <Card
                      key={course.id}
                      className="teacher-course-card group relative flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-gray-50/30 transition-shadow hover:shadow-md"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <Link
                        to={`/dashboard/teacher/courses/${course.id}`}
                        className="block flex flex-1 flex-col rounded-t-xl outline-none transition-colors hover:bg-gray-100/40 focus-visible:ring-2 focus-visible:ring-[#1e40af]/30 focus-visible:ring-inset"
                      >
                        <div className="px-2 pt-2">
                          <div className="relative h-44 w-full overflow-hidden rounded-xl bg-gray-200 sm:h-56">
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
                                <BookOpen className="h-10 w-10 text-gray-400/90" />
                              </div>
                            )}
                            <div
                              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"
                              aria-hidden
                            />
                            {statusBadge ? (
                              <span className={statusBadge.className} title={course.status === "SCHEDULE_APPROVED" ? t("teacher.scheduleApprovals.statusDescriptions.scheduleApproved") : undefined}>
                                {statusBadge.label}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col px-4 pb-5 pt-4">
                          <CardTitle className="text-base font-semibold text-foreground line-clamp-2">
                            {course.title}
                          </CardTitle>
                          {course.description ? (
                            <CardDescription className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                              {course.description}
                            </CardDescription>
                          ) : null}

                          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2.5">
                              <CalendarDays className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                              <span>
                                {sessionsCount != null ? (
                                  t("teacher.courses.card.sessionsInSixMonths", { count: sessionsCount })
                                ) : (
                                  <span className="text-muted-foreground/80">
                                    {t("teacher.courses.card.sessionsNotSet")}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <Users className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                              <span>
                                {t("teacher.courses.card.studentCount", { count: enrolled })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attendance" className="mt-6 max-w-3xl focus-visible:outline-none focus-visible:ring-0">
            <p className="mb-4 text-sm text-muted-foreground">
              {t("teacher.courses.attendanceTab.intro")}{" "}
              <Link
                to="/dashboard/teacher/attendance"
                className="font-medium text-teal-700 underline-offset-2 hover:underline"
              >
                {t("teacher.courses.attendanceTab.attendanceQrLink")}
              </Link>
            </p>
            <TeacherAttendanceSessionPanel embedded />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6 space-y-4 focus-visible:outline-none focus-visible:ring-0">
            <p className="max-w-xl text-sm text-muted-foreground">
              {t("teacher.courses.scheduleTab.intro")}
            </p>

            {loading ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("teacher.courses.scheduleTab.loading")}
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-left">
                <p className="text-sm font-medium text-foreground">{t("teacher.courses.empty.title")}</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {t("teacher.courses.scheduleTab.emptyDescription")}
                </p>
                <Button asChild size="sm" className="mt-4 bg-teal-700 text-white hover:bg-teal-800">
                  <Link to="/dashboard/teacher/courses/new" className="inline-flex items-center gap-1.5">
                    <Plus className="h-4 w-4" />
                    {t("teacher.courses.empty.cta")}
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
                {courses.map((course) => {
                  const sessions = course.classMeetingsInSixMonths ?? null;
                  const filled =
                    Array.isArray(course.classMeetingSlots) && course.classMeetingSlots.length
                      ? course.classMeetingSlots.filter(
                          (s) => (s.title ?? "").trim() || (s.sessionDate ?? "").trim() || (s.sessionTime ?? "").trim(),
                        ).length
                      : 0;
                  return (
                    <li key={course.id}>
                      <Link
                        to={`/dashboard/teacher/courses/${course.id}/edit/schedule`}
                        className="flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 sm:px-5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{course.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {sessions != null
                              ? filled
                                ? t("teacher.courses.scheduleTab.sessionsSummaryFilled", {
                                    sessions,
                                    filled,
                                  })
                                : t("teacher.courses.scheduleTab.sessionsSummary", { sessions })
                              : t("teacher.courses.scheduleTab.notSetYet")}
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-teal-800">
                          {t("teacher.courses.scheduleTab.editSchedule")}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="substitute" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <TeacherSubstituteCoverPanel embedded />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeacherCoursesPage;
