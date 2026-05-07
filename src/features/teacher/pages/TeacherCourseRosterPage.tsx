import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, ArrowLeft, BookOpen, CheckCircle2, Pencil, QrCode, Trash2, Users } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { eduhubCourses } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { useAuthSession } from "@/features/auth/context";
import { AttendanceOverviewQrPicker } from "@/features/teacher/components/AttendanceOverviewQrPicker";
import { TeacherAttendanceSessionPanel } from "@/features/teacher/components/TeacherAttendanceSessionPanel";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import {
  ATTENDANCE_MEETINGS_CHANGED,
  formatMeetingOptionLabel,
  loadStoredMeetings,
  meetingsStorageKey,
} from "@/features/teacher/attendance/attendanceMeetingsStorage";
import {
  ATTENDANCE_ROLL_BROADCAST,
  ATTENDANCE_ROLL_CHANGED,
  ATTENDANCE_ROLL_STORAGE_KEY,
  countPresentForSession,
  countSessionsStudentAttended,
  getPresentForStudent,
} from "@/features/attendance/attendanceRollStorage";

export default function TeacherCourseRosterPage() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthSession();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  const apiCourseQuery = useQuery({
    queryKey: ["teacher", "roster", "course", courseId],
    queryFn: () => eduhubCourses.getById(courseId),
    enabled: Boolean(courseId) && isUuid(courseId),
  });

  const localCourse =
    !isUuid(courseId) && courseId ? teacherCoursesStore.getById(courseId) : undefined;

  const courseMeta =
    apiCourseQuery.data != null
      ? {
          id: apiCourseQuery.data.id,
          title: apiCourseQuery.data.title,
          status: apiCourseQuery.data.status,
          allowed: apiCourseQuery.data.lecturer?.id === user.id,
        }
      : localCourse
        ? {
            id: localCourse.id,
            title: localCourse.title,
            status: localCourse.status,
            allowed: true,
          }
        : null;

  const studentsQuery = useQuery({
    queryKey: ["teacher", "roster", "students", courseId],
    queryFn: () => eduhubCourses.getEnrolledStudents(courseId, 0, 100),
    enabled:
      Boolean(courseId) &&
      isUuid(courseId) &&
      apiCourseQuery.isSuccess &&
      apiCourseQuery.data.lecturer?.id === user.id,
  });

  const loadingCourse = isUuid(courseId) && apiCourseQuery.isLoading;
  const forbidden =
    apiCourseQuery.data != null && apiCourseQuery.data.lecturer?.id !== user.id;

  const [overviewSessionId, setOverviewSessionId] = useState<string | null>(null);
  const [attendanceUiKey, setAttendanceUiKey] = useState(0);
  const onOverviewSessionChange = useCallback((id: string | null) => {
    setOverviewSessionId(id);
  }, []);

  useEffect(() => {
    const bump = () => setAttendanceUiKey((k) => k + 1);
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === ATTENDANCE_ROLL_STORAGE_KEY) bump();
      if (courseMeta?.id && e.key === meetingsStorageKey(courseMeta.id)) bump();
    };
    const onFocus = () => bump();
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    window.addEventListener(ATTENDANCE_ROLL_CHANGED, bump);
    window.addEventListener(ATTENDANCE_MEETINGS_CHANGED, bump);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener(ATTENDANCE_ROLL_CHANGED, bump);
      window.removeEventListener(ATTENDANCE_MEETINGS_CHANGED, bump);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [courseMeta?.id]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined" || !courseMeta?.id) return;
    const bump = () => setAttendanceUiKey((k) => k + 1);
    const bc = new BroadcastChannel(ATTENDANCE_ROLL_BROADCAST);
    bc.onmessage = (ev: MessageEvent) => {
      const d = ev.data as { type?: string; courseId?: string } | undefined;
      if (d?.type === "check-in" && d.courseId === courseMeta.id) bump();
    };
    return () => bc.close();
  }, [courseMeta?.id]);

  useEffect(() => {
    if (!courseMeta?.id) return;
    const bump = () => {
      if (document.visibilityState === "visible") {
        setAttendanceUiKey((k) => k + 1);
      }
    };
    const id = window.setInterval(bump, 4000);
    return () => clearInterval(id);
  }, [courseMeta?.id]);

  const overviewMeetingLabel = useMemo(() => {
    if (!courseMeta?.id || !overviewSessionId) return null;
    void attendanceUiKey;
    const m = loadStoredMeetings(courseMeta.id).find((x) => x.sessionId === overviewSessionId);
    return m ? formatMeetingOptionLabel(m) : null;
  }, [courseMeta?.id, overviewSessionId, attendanceUiKey]);

  const handleDelete = async (id: string) => {
    if (isUuid(id)) {
      try {
        await eduhubCourses.delete(id);
      } catch {
        return;
      }
    } else {
      teacherCoursesStore.delete(id);
    }
    setDeleteId(null);
    navigate("/dashboard/teacher/courses");
  };

  const handleArchive = async (id: string) => {
    if (!isUuid(id)) return;
    setPublishingId(id);
    try {
      await eduhubCourses.archive(id);
      await queryClient.invalidateQueries({ queryKey: ["teacher", "roster", "course", courseId] });
    } catch {
      // ignore
    }
    setPublishingId(null);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-0 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <header
          className={`fixed z-40 flex min-h-[4.5625rem] items-center border-b border-gray-100 bg-white transition-all duration-300 ${
            isSidebarCollapsed ? "lg:left-20" : "lg:left-64"
          } left-0 right-0 top-16 lg:top-0`}
        >
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-6">
            <Link
              to="/dashboard/teacher/courses"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground/75 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Back to My Class
            </Link>
            {courseMeta ? (
              <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
                {isUuid(courseId) && courseMeta.status === "DRAFT" ? (
                  <span
                    className="max-w-[140px] shrink-0 rounded-md border border-amber-200/90 bg-amber-50 px-2.5 py-1 text-center text-xs font-medium leading-tight text-amber-900"
                    title="An admin will set the price and publish this class."
                  >
                    Awaiting admin approval
                  </span>
                ) : null}
                {isUuid(courseId) && courseMeta.status !== "DRAFT" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className={`h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-white hover:bg-gray-100 ${
                      courseMeta.status === "ARCHIVED"
                        ? "text-amber-600 hover:text-amber-700"
                        : "text-orange-600 hover:text-orange-700"
                    }`}
                    disabled={publishingId === courseMeta.id}
                    title={courseMeta.status === "ARCHIVED" ? "Unarchive" : "Archive"}
                    onClick={() => handleArchive(courseMeta.id)}
                  >
                    {courseMeta.status === "ARCHIVED" ? (
                      <ArchiveRestore className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Archive className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-8 w-8 shrink-0 rounded-full border border-gray-200 bg-white text-muted-foreground hover:bg-gray-100 hover:text-red-600"
                  title="Delete class"
                  onClick={() => setDeleteId(courseMeta.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                </Button>
                <Button asChild variant="outline" className="h-8 shrink-0 rounded-full gap-1.5 px-4">
                  <Link
                    to={`/dashboard/teacher/courses/${courseMeta.id}/edit`}
                    className="inline-flex items-center justify-center gap-1.5"
                    title="Edit class content"
                  >
                    <Pencil className="h-3.5 w-3.5 shrink-0" />
                    Edit class content
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="container mx-auto max-w-4xl px-6 pt-[calc(4.5625rem+1rem)]">
          {!courseId ? (
            <p className="text-sm text-red-600">Missing class.</p>
          ) : loadingCourse ? (
            <p className="text-sm text-foreground/60">Loading class…</p>
          ) : forbidden ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
              You don&apos;t have access to this class roster.
            </div>
          ) : apiCourseQuery.isError && isUuid(courseId) ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-800">
              Could not load this class. It may have been removed or you may need to sign in again.
            </div>
          ) : !courseMeta ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-700">
              Class not found.
            </div>
          ) : (
            <Card className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <CardHeader className="flex flex-col gap-4 space-y-0 border-b border-gray-100/80 pb-6">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1e40af]/10 ring-1 ring-[#1e40af]/15">
                    <BookOpen className="h-6 w-6 text-[#1e40af]" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{courseMeta.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {courseMeta.status ? (
                        <Badge variant="outline" className="font-normal">
                          {courseMeta.status}
                        </Badge>
                      ) : null}
                      <span className="text-xs text-foreground/55">
                        Students enrolled from the catalog appear below when the API returns roster data.
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
              <Tabs defaultValue="roster" className="w-full">
                <TabsList className="mb-6 grid h-11 w-full max-w-md grid-cols-2 rounded-xl border border-slate-200/90 bg-slate-100/80 p-1">
                  <TabsTrigger
                    value="roster"
                    className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Users className="h-4 w-4 shrink-0 opacity-80" />
                    Enrolled
                  </TabsTrigger>
                  <TabsTrigger
                    value="attendance"
                    className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <QrCode className="h-4 w-4 shrink-0 opacity-80" />
                    Attendance
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="roster" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#1e40af]" />
                    Enrolled students
                  </h2>
                  <p className="text-sm text-foreground/60 mb-4">
                    Everyone signed up for this class in the platform. Local-only classes won&apos;t show rows until the
                    class exists on the server.
                    {apiCourseQuery.data?.classMeetingsInSixMonths != null ? (
                      <>
                        {" "}
                        This class is set to{" "}
                        <span className="font-medium text-foreground">
                          {apiCourseQuery.data.classMeetingsInSixMonths} sessions in 6 months
                        </span>{" "}
                        (from class settings); the table compares local check-ins to that target.
                      </>
                    ) : null}
                  </p>

                  {!isUuid(courseId) ? (
                    <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                      This class is stored only in your browser. Connect it to the API to load enrolled students here.
                    </p>
                  ) : studentsQuery.isLoading ? (
                    <p className="text-sm text-foreground/60">Loading students…</p>
                  ) : studentsQuery.isError ? (
                    <p className="text-sm text-red-600">
                      Could not load enrollment list. Check permissions or try again later.
                    </p>
                  ) : !studentsQuery.data?.length ? (
                    <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                      No students enrolled yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-gray-200 bg-gray-50/30 overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead
                                className="text-right whitespace-nowrap min-w-[10rem]"
                                title="Check-ins recorded on this browser vs planned class meetings in six months (class settings)."
                              >
                                Sessions in 6 months *
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentsQuery.data.map((s) => {
                              void attendanceUiKey;
                              const planned = apiCourseQuery.data?.classMeetingsInSixMonths;
                              const attended = countSessionsStudentAttended(courseMeta.id, s.id, s.email);
                              const sessionsCell =
                                planned != null ? (
                                  <span className="tabular-nums">
                                    <span className="font-medium text-foreground">{attended}</span>
                                    <span className="text-muted-foreground"> / {planned}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                );
                              return (
                                <TableRow key={s.id}>
                                  <TableCell className="font-medium text-foreground">{s.fullName}</TableCell>
                                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                                  <TableCell className="text-right text-sm">{sessionsCell}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-xs text-muted-foreground px-0.5 leading-relaxed">
                        * <span className="font-medium text-foreground/80">Sessions in 6 months</span> is the planned
                        total from class settings (e.g. 32 class meetings). The first number is how many distinct sessions
                        this student checked into on this browser only — not synced across devices until an attendance API
                        exists.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="attendance" className="mt-0 space-y-8 focus-visible:outline-none focus-visible:ring-0">
                  <section>
                    <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-[#1e40af]" />
                      Class meeting check-in (QR)
                    </h2>
                    <p className="text-sm text-foreground/60 mb-4">
                      Each QR opens the check-in link; students must use it signed in as a student. The roster table
                      below only shows check-ins stored on this browser—scanning on another device will not fill those cells
                      until attendance is stored on the server.
                    </p>
                    <TeacherAttendanceSessionPanel
                      embedded
                      fixedCourse={{
                        id: courseMeta.id,
                        title: courseMeta.title,
                        classMeetingsInSixMonths: apiCourseQuery.data?.classMeetingsInSixMonths,
                      }}
                    />
                  </section>

                  <section>
                    <h2 className="text-lg font-semibold text-foreground mb-1">Student attendance overview</h2>
                    <p className="text-sm text-foreground/60 mb-4">
                      Pick the meeting that matches the QR students used. The table reads check-ins from this browser
                      only: same machine and same app URL as where the student opened the link (another tab on this
                      computer is fine). Opening the check-in on a phone stores it on the phone, not on your laptop,
                      until a server attendance API exists.
                    </p>

                    <AttendanceOverviewQrPicker
                      courseId={courseMeta.id}
                      className="mb-6"
                      onSelectionChange={onOverviewSessionChange}
                    />

                    {!isUuid(courseId) ? (
                      <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                        Connect this class to the API to align attendance tracking with enrolled students.
                      </p>
                    ) : studentsQuery.isLoading ? (
                      <p className="text-sm text-foreground/60">Loading roster for attendance table…</p>
                    ) : studentsQuery.isError ? (
                      <p className="text-sm text-red-600">Could not load students for this overview.</p>
                    ) : !studentsQuery.data?.length ? (
                      <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                        No enrolled students yet — nothing to show in the attendance overview.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-sky-200 bg-sky-50/90 px-3 py-2.5 text-xs text-sky-950/90 leading-relaxed space-y-2">
                          <p>
                            <span className="font-semibold text-sky-950">Phone scan vs this screen:</span> if the student
                            checks in on their phone, data stays on the phone until a server attendance API exists. This
                            table only reads check-ins saved in the browser where you opened this page (or another tab on
                            the same computer).
                          </p>
                          <p>
                            Also confirm the student account email matches the roster row, the meeting dropdown matches the
                            QR they scanned, and they are signed in as a student on the check-in page.
                          </p>
                        </div>
                        {overviewMeetingLabel ? (
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm text-foreground">
                              <span className="text-muted-foreground">Showing attendance for: </span>
                              <span className="font-medium">{overviewMeetingLabel}</span>
                            </p>
                            {overviewSessionId ? (
                              <p className="text-xs text-muted-foreground tabular-nums">
                                Present for this meeting (this browser):{" "}
                                <span className="font-medium text-foreground">
                                  {countPresentForSession(courseMeta.id, overviewSessionId)} / {studentsQuery.data.length}
                                </span>
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs text-amber-800/90 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2">
                            Select a meeting in the dropdown above to load check-in data for that session.
                          </p>
                        )}
                        <p className="rounded-lg border border-amber-200/90 bg-amber-50/70 px-3 py-2 text-xs text-amber-950/85 leading-relaxed">
                          Enrollment lists everyone who joined the class on the platform—it does not record scans by itself.
                          Present and Checked in update only when this browser has a matching QR check-in for the meeting
                          chosen above (student opened the link here or in another tab on this computer). Same-email roster
                          row required.
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/30 shadow-sm">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                                <TableHead>Student</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Planned meetings (6 mo.)</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Present</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Checked in</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {studentsQuery.data.map((s) => {
                                void attendanceUiKey;
                                const entry =
                                  overviewSessionId != null
                                    ? getPresentForStudent(courseMeta.id, overviewSessionId, s.id, s.email)
                                    : undefined;
                                return (
                                  <TableRow key={s.id}>
                                    <TableCell className="font-medium text-foreground">{s.fullName}</TableCell>
                                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                      {apiCourseQuery.data?.classMeetingsInSixMonths != null
                                        ? apiCourseQuery.data.classMeetingsInSixMonths
                                        : "—"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {entry ? (
                                        <span className="inline-flex items-center justify-center text-emerald-600" title="Checked in">
                                          <CheckCircle2 className="h-5 w-5" aria-label="Present" />
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                                      {entry
                                        ? new Date(entry.checkedAt).toLocaleString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : "—"}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </section>
                </TabsContent>
              </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this class and all its lessons. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) void handleDelete(deleteId);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
