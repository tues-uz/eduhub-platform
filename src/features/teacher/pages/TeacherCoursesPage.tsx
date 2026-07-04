import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarDays, Plus, UserPlus, Users } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { teacherCoursesStore } from "../data/teacherCoursesStore";
import { eduhubCourses } from "@/api/eduhubClient";
import type { TeacherCourse } from "../types";
import { TeacherAttendanceSessionPanel } from "@/features/teacher/components/TeacherAttendanceSessionPanel";
import { TeacherSubstituteCoverPanel } from "@/features/teacher/components/TeacherSubstituteCoverPanel";
import { useTranslation } from "react-i18next";

const TeacherCoursesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const local = teacherCoursesStore.getAll();
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
          }));
          const merged = [...apiCourses, ...local];
          if (!cancelled) setCourses(merged);
        } catch {
          if (!cancelled) setCourses(local);
        }
      } else {
        if (!cancelled) setCourses(local);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <div className="container mx-auto px-6">
          <Link
            to="/dashboard/teacher"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />{t("teacherSettings.backToDashboard")}</Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
              >{t("teacherNav.myClass")}</h1>
              <p className="text-foreground/60 text-sm mt-1">
                New classes stay in draft until an admin sets a price and publishes them. Add lessons with PDF or video
                content, then wait for approval.
              </p>
            </div>
            <Button asChild className="rounded-full shrink-0" style={{ backgroundColor: "#1e40af" }}>
              <Link to="/dashboard/teacher/courses/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />{t("teacher.courses.addClass")}</Link>
            </Button>
          </div>

          <Tabs defaultValue="courses" className="w-full">
            <TabsList className="mb-6 h-11 w-full sm:w-auto justify-start bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <TabsTrigger value="courses" className="rounded-lg px-4 data-[state=active]:shadow-sm">
                Classes
              </TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-lg px-4 gap-2 data-[state=active]:shadow-sm">
                <Users className="h-4 w-4 shrink-0 opacity-70" />{t("teacher.courses.tabs.attendance")}</TabsTrigger>
              <TabsTrigger value="schedule" className="rounded-lg px-4 gap-2 data-[state=active]:shadow-sm">
                <CalendarDays className="h-4 w-4 shrink-0 opacity-70" />{t("teacher.roster.tabs.schedule")}</TabsTrigger>
              <TabsTrigger value="substitute" className="rounded-lg px-4 gap-2 data-[state=active]:shadow-sm">
                <UserPlus className="h-4 w-4 shrink-0 opacity-70" />{t("teacher.courses.tabs.substitute")}</TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          {loading ? (
            <Card className="teacher-course-card border-dashed border-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-foreground/60">{t("teacher.courses.loading")}</p>
              </CardContent>
            </Card>
          ) : courses.length === 0 ? (
            <Card className="teacher-course-card border-dashed border-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="h-14 w-14 text-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">{t("teacher.courses.empty.title")}</h3>
                <p className="text-sm text-foreground/60 mb-6 max-w-sm">
                  Create your first class and add lessons with PDF materials or video links.
                </p>
                <Button asChild className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
                  <Link to="/dashboard/teacher/courses/new" className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />{t("teacher.courses.empty.cta")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {courses.map((course) => {
                const enrolled = course.enrollmentCount ?? 0;
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
                          {course.status ? (
                            <span
                              className={`absolute right-2 top-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium shadow-sm ${
                                course.status === "PUBLISHED"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {course.status}
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
                              {course.classMeetingsInSixMonths != null ? (
                                <>
                                  <span className="font-medium text-foreground tabular-nums">
                                    {course.classMeetingsInSixMonths}
                                  </span>{" "}
                                  sessions in 6 months
                                </>
                              ) : (
                                <span className="text-muted-foreground/80">Sessions in 6 months not set</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Users className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                            <span>
                              <span className="font-medium text-foreground tabular-nums">{enrolled}</span>{" "}
                              student{enrolled === 1 ? "" : "s"}
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

            <TabsContent value="attendance" className="mt-0 max-w-3xl focus-visible:outline-none focus-visible:ring-0">
              <p className="text-sm text-foreground/60 mb-4">
                Name each meeting and generate a QR; past meetings stay on this device. Full-page tool:{" "}
                <Link to="/dashboard/teacher/attendance" className="text-[#1e40af] font-medium underline">{t("teacherNav.attendanceQr")}</Link>
                .
              </p>
              <TeacherAttendanceSessionPanel embedded />
            </TabsContent>

            <TabsContent value="schedule" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <p className="text-sm text-foreground/60 mb-4 max-w-3xl">
                Edit the planned sessions (title, date, time) for each class. This uses the same schedule section from the
                class setup form.
              </p>

              {loading ? (
                <Card className="border-dashed border-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm text-foreground/60">{t("teacher.courses.scheduleTab.loading")}</p>
                  </CardContent>
                </Card>
              ) : courses.length === 0 ? (
                <Card className="border-dashed border-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <CalendarDays className="h-14 w-14 text-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">{t("teacher.courses.empty.title")}</h3>
                    <p className="text-sm text-foreground/60 mb-6 max-w-sm">
                      Create a class first, then come back here to set up the per-session schedule.
                    </p>
                    <Button asChild className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
                      <Link to="/dashboard/teacher/courses/new" className="inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />{t("teacher.courses.empty.cta")}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 max-w-3xl">
                  {courses.map((course) => {
                    const sessions = course.classMeetingsInSixMonths ?? null;
                    const filled =
                      Array.isArray(course.classMeetingSlots) && course.classMeetingSlots.length
                        ? course.classMeetingSlots.filter(
                            (s) => (s.title ?? "").trim() || (s.sessionDate ?? "").trim() || (s.sessionTime ?? "").trim(),
                          ).length
                        : 0;
                    return (
                      <Card key={course.id} className="rounded-2xl border-slate-200/90 shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <CardTitle className="text-base font-semibold text-slate-900 line-clamp-2">
                                {course.title}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {sessions != null ? (
                                  <>
                                    <span className="font-medium text-slate-900 tabular-nums">{sessions}</span> sessions in 6
                                    months
                                    {filled ? (
                                      <>
                                        {" "}
                                        · <span className="font-medium text-slate-900 tabular-nums">{filled}</span> filled
                                      </>
                                    ) : null}
                                  </>
                                ) : (
                                  "Sessions in 6 months not set yet"
                                )}
                              </CardDescription>
                            </div>
                            <Button asChild variant="outline" className="rounded-full shrink-0">
                              <Link to={`/dashboard/teacher/courses/${course.id}/edit/schedule`}>{t("teacher.courses.scheduleTab.editSchedule")}</Link>
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="substitute" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <TeacherSubstituteCoverPanel embedded />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TeacherCoursesPage;
