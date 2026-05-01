import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  PlayCircle,
  User,
  Clock,
  Layers,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Camera,
  X,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DashboardSidebar from "@/components/DashboardSidebar";
import { loadStoredMeetings } from "@/features/teacher/attendance/attendanceMeetingsStorage";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { lessonProgressStore } from "@/features/student/data/lessonProgressStore";
import { eduhubCourses, eduhubModules, eduhubLessons } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { useEnrollMutation } from "@/features/student/hooks/useStudentQueries";
import { useStudentCoursesQuery } from "@/features/student/hooks/useStudentQueries";

const ENROLLED_COURSES: Record<
  number,
  {
    id: number;
    title: string;
    instructor: string;
    progress: number;
    status: string;
    nextLesson: string;
    category: string;
    duration: string;
    modules: number;
    enrolledDate: string;
  }
> = {
  1: {
    id: 1,
    title: "Introduction to Economics",
    instructor: "Dr. Dilshod Karimov",
    progress: 75,
    status: "In Progress",
    nextLesson: "Market Structures",
    category: "Business",
    duration: "8 weeks",
    modules: 12,
    enrolledDate: "2024-09-01",
  },
  2: {
    id: 2,
    title: "Business Management Fundamentals",
    instructor: "Prof. Sarah Johnson",
    progress: 45,
    status: "In Progress",
    nextLesson: "Strategic Planning",
    category: "Management",
    duration: "10 weeks",
    modules: 14,
    enrolledDate: "2024-10-15",
  },
  3: {
    id: 3,
    title: "Digital Marketing Essentials",
    instructor: "Dr. Ahmed Hassan",
    progress: 90,
    status: "Almost Complete",
    nextLesson: "Final Project",
    category: "Marketing",
    duration: "6 weeks",
    modules: 8,
    enrolledDate: "2024-08-20",
  },
  4: {
    id: 4,
    title: "Financial Accounting",
    instructor: "Prof. Maria Garcia",
    progress: 30,
    status: "In Progress",
    nextLesson: "Balance Sheets",
    category: "Finance",
    duration: "12 weeks",
    modules: 16,
    enrolledDate: "2024-11-01",
  },
  5: {
    id: 5,
    title: "English for Business",
    instructor: "Ms. Elena Petrova",
    progress: 60,
    status: "In Progress",
    nextLesson: "Writing Reports",
    category: "Language",
    duration: "8 weeks",
    modules: 10,
    enrolledDate: "2024-09-15",
  },
  6: {
    id: 6,
    title: "Data Analysis with Excel",
    instructor: "Dr. James Wilson",
    progress: 100,
    status: "Completed",
    nextLesson: "—",
    category: "Analytics",
    duration: "6 weeks",
    modules: 8,
    enrolledDate: "2024-07-01",
  },
};

const LESSONS_BY_COURSE: Record<number, { id: number; title: string; duration: string; completed: boolean }[]> = {
  1: [
    { id: 1, title: "Introduction to Microeconomics", duration: "12 min", completed: true },
    { id: 2, title: "Supply and Demand", duration: "18 min", completed: true },
    { id: 3, title: "Market Structures", duration: "22 min", completed: false },
    { id: 4, title: "Monopoly and Competition", duration: "15 min", completed: false },
    { id: 5, title: "International Trade", duration: "20 min", completed: false },
  ],
  2: [
    { id: 1, title: "Introduction to Management", duration: "14 min", completed: true },
    { id: 2, title: "Strategic Planning", duration: "25 min", completed: false },
    { id: 3, title: "Organizational Behavior", duration: "18 min", completed: false },
  ],
  3: [
    { id: 1, title: "Marketing Fundamentals", duration: "16 min", completed: true },
    { id: 2, title: "Digital Channels", duration: "20 min", completed: true },
    { id: 3, title: "Final Project", duration: "—", completed: false },
  ],
  4: [
    { id: 1, title: "Accounting Basics", duration: "15 min", completed: true },
    { id: 2, title: "Balance Sheets", duration: "22 min", completed: false },
  ],
  5: [
    { id: 1, title: "Business Writing Basics", duration: "12 min", completed: true },
    { id: 2, title: "Writing Reports", duration: "18 min", completed: false },
  ],
  6: [
    { id: 1, title: "Excel Fundamentals", duration: "20 min", completed: true },
    { id: 2, title: "Data Analysis", duration: "25 min", completed: true },
  ],
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function parseSessionIdFromAttendanceKey(key: string, courseIdStr: string): string | null {
  const prefix = `attendance-checkin:${courseIdStr}:`;
  if (!key.startsWith(prefix)) return null;
  const sessionId = key.slice(prefix.length);
  return sessionId.length > 0 ? sessionId : null;
}

/** Instructor-named meetings live in localStorage when this browser also created the QR (same device). */
function meetingNameForSession(courseIdStr: string, sessionId: string): string {
  const meetings = loadStoredMeetings(courseIdStr);
  const m = meetings.find((x) => x.sessionId === sessionId);
  if (m?.name?.trim()) return m.name.trim();
  return "Class meeting";
}

const TEACHER_PREFIX = "teacher_";

type LessonRow = { id: string; title: string; duration: string; completed: boolean; moduleId?: string };
type QrBarcode = { rawValue?: string };
type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<QrBarcode[]>;
};
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

const StudentCourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [apiCourse, setApiCourse] = useState<{ id: string; title: string; instructor: string; category: string; duration: string; modules: number; enrolledDate: string } | null>(null);
  const [apiLessons, setApiLessons] = useState<LessonRow[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState("Point the camera at attendance QR");
  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scannerRafRef = useRef<number | null>(null);

  const { data: enrolledCourses = [] } = useStudentCoursesQuery();
  const enrollMutation = useEnrollMutation();

  const isTeacherCourse = courseId?.startsWith(TEACHER_PREFIX);
  const teacherCourseId = isTeacherCourse ? courseId!.slice(TEACHER_PREFIX.length) : null;
  const teacherCourse = teacherCourseId ? teacherCoursesStore.getById(teacherCourseId) : null;

  const id = courseId && !isTeacherCourse && !isUuid(courseId ?? "") ? parseInt(courseId, 10) : NaN;

  const isEnrolled = courseId ? enrolledCourses.some((c) => c.id === courseId || c.id === courseId) : false;

  useEffect(() => {
    if (courseId && isUuid(courseId) && !isTeacherCourse) {
      setApiLoading(true);
      eduhubCourses.getById(courseId).then((c) => {
        setApiCourse({
          id: c.id,
          title: c.title,
          instructor: c.lecturer?.fullName ?? "—",
          category: c.category ?? "Class",
          duration: "—",
          modules: 0,
          enrolledDate: c.createdAt.slice(0, 10),
        });
        return eduhubModules.getByCourse(courseId!);
      }).then((modules) => {
        return Promise.all(
          modules.map((m) =>
            eduhubLessons.getByModule(courseId!, m.id).then((lessons) =>
              lessons.map((l) => ({
                id: l.id,
                title: l.title,
                duration: l.durationMinutes ? `${l.durationMinutes} min` : "—",
                completed: false,
                moduleId: m.id,
              }))
            )
          )
        );
      }).then((arrays) => {
        const flat = arrays.flat();
        setApiLessons(flat);
        setApiCourse((prev) => prev ? { ...prev, modules: flat.length } : null);
      }).catch(() => setApiCourse(null)).finally(() => setApiLoading(false));
    }
  }, [courseId, isTeacherCourse]);

  const handleEnroll = async () => {
    if (!courseId || isTeacherCourse) return;
    await enrollMutation.mutateAsync(courseId);
    navigate(`/dashboard/courses/${courseId}`);
  };

  const lessonsFromApi = apiLessons.map((l) => ({
    ...l,
    completed: lessonProgressStore.isComplete(courseId ?? "", l.id),
  }));
  const lessonsFromTeacher = teacherCourse
    ? [...teacherCourse.lessons].sort((a, b) => a.order - b.order).map((l) => ({
        id: l.id,
        title: l.title,
        duration: l.duration ?? "—",
        completed: lessonProgressStore.isComplete(courseId ?? "", l.id),
      }))
    : [];
  const lessonsFromMock =
    id && LESSONS_BY_COURSE[id]
      ? LESSONS_BY_COURSE[id].map((l) => ({
          id: String(l.id),
          title: l.title,
          duration: l.duration,
          completed: l.completed || lessonProgressStore.isComplete(String(id), String(l.id)),
        }))
      : [];

  const lessons: LessonRow[] = apiCourse ? lessonsFromApi : teacherCourse ? lessonsFromTeacher : lessonsFromMock;

  const completedCount = lessons.filter((l) => l.completed).length;
  const progressPercent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const statusFromProgress =
    progressPercent >= 100 ? "Completed" : progressPercent >= 75 ? "Almost Complete" : "In Progress";

  const course = apiCourse
    ? { id: courseId!, ...apiCourse, progress: progressPercent, status: statusFromProgress, nextLesson: lessons.find((l) => !l.completed)?.title ?? apiLessons[0]?.title ?? "—" }
    : teacherCourse
      ? {
          id: courseId!,
          title: teacherCourse.title,
          instructor: teacherCourse.instructorName,
          progress: progressPercent,
          status: statusFromProgress,
          nextLesson: lessons.find((l) => !l.completed)?.title ?? teacherCourse.lessons.sort((a, b) => a.order - b.order)[0]?.title ?? "—",
          category: "Class",
          duration: `${teacherCourse.lessons.length} lessons`,
          modules: teacherCourse.lessons.length,
          enrolledDate: teacherCourse.createdAt.slice(0, 10),
        }
      : id
        ? {
            ...ENROLLED_COURSES[id],
            progress: progressPercent,
            status: statusFromProgress,
            nextLesson: lessons.find((l) => !l.completed)?.title ?? ENROLLED_COURSES[id].nextLesson ?? "—",
          }
        : undefined;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    const idInterval = setInterval(check, 100);
    return () => clearInterval(idInterval);
  }, []);

  const stopScanner = () => {
    if (scannerRafRef.current != null) {
      cancelAnimationFrame(scannerRafRef.current);
      scannerRafRef.current = null;
    }
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((t) => t.stop());
      scannerStreamRef.current = null;
    }
    if (scannerVideoRef.current) {
      scannerVideoRef.current.srcObject = null;
    }
  };

  const onScanResult = (raw: string) => {
    try {
      const url = new URL(raw, window.location.origin);
      if (url.pathname !== "/dashboard/attendance/join") {
        setScannerError("This QR is not an attendance check-in link.");
        setScannerStatus("Try scanning the class attendance QR.");
        return;
      }
      setScannerStatus("Attendance QR detected. Opening check-in…");
      setScannerOpen(false);
      stopScanner();
      navigate(`${url.pathname}${url.search}`);
    } catch {
      setScannerError("Could not read this QR link.");
      setScannerStatus("Try again with a clearer QR image.");
    }
  };

  useEffect(() => {
    if (!scannerOpen) {
      stopScanner();
      return;
    }

    let cancelled = false;
    const start = async () => {
      setScannerError(null);
      setScannerStatus("Requesting camera permission…");
      const media = navigator.mediaDevices;
      if (!media?.getUserMedia) {
        setScannerError("Camera is not supported on this browser.");
        return;
      }

      try {
        const stream = await media.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        scannerStreamRef.current = stream;
        if (scannerVideoRef.current) {
          scannerVideoRef.current.srcObject = stream;
          await scannerVideoRef.current.play();
        }
        setScannerStatus("Point the camera at attendance QR");

        const Detector = (
          window as Window & { BarcodeDetector?: BarcodeDetectorCtor }
        ).BarcodeDetector;

        if (!Detector) {
          setScannerError("QR detection is unsupported on this browser. Use Chrome/Edge on mobile or open attendance link manually.");
          return;
        }

        const detector = new Detector({ formats: ["qr_code"] });
        const scanLoop = async () => {
          if (cancelled || !scannerVideoRef.current) return;
          try {
            const barcodes = await detector.detect(scannerVideoRef.current);
            const value = barcodes[0]?.rawValue?.trim();
            if (value) {
              onScanResult(value);
              return;
            }
          } catch {
            // ignore transient frame decode errors
          }
          scannerRafRef.current = requestAnimationFrame(scanLoop);
        };
        scannerRafRef.current = requestAnimationFrame(scanLoop);
      } catch {
        setScannerError("Camera permission denied or unavailable. Allow camera access in browser settings.");
        setScannerStatus("Unable to start camera");
      }
    };

    start();
    return () => {
      cancelled = true;
      stopScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen]);

  if (apiLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: "'Comfortaa', cursive" }}>
        <p className="text-foreground/60">Loading class…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: "'Comfortaa', cursive" }}>
        <div className="text-center">
          <p className="text-foreground/70 mb-4">Class not found.</p>
          <Link to="/dashboard/courses">
            <Button variant="outline" className="rounded-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Class
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const nextLesson = lessons.find((l) => !l.completed) ?? lessons[0];
  const courseIdStr = String(course.id);
  const attendanceEntries =
    typeof window !== "undefined"
      ? Object.entries(sessionStorage)
          .filter(([k]) => k.startsWith("attendance-checkin:"))
          .map(([k, raw]) => {
            let checkedAt = raw;
            let storedMeetingName: string | undefined;
            try {
              const p = JSON.parse(raw) as { checkedAt?: string; meetingName?: string };
              if (p && typeof p.checkedAt === "string") {
                checkedAt = p.checkedAt;
                if (typeof p.meetingName === "string" && p.meetingName.trim()) {
                  storedMeetingName = p.meetingName.trim();
                }
              }
            } catch {
              /* legacy: plain ISO timestamp string */
            }
            return { key: k, checkedAt, storedMeetingName };
          })
          .filter(({ key }) => key.includes(`:${courseIdStr}:`))
          .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
      : [];
  const attendanceTableRows = attendanceEntries.map((entry) => {
    const sessionId = parseSessionIdFromAttendanceKey(entry.key, courseIdStr);
    const resolved =
      entry.storedMeetingName ??
      (sessionId ? meetingNameForSession(courseIdStr, sessionId) : null);
    return {
      ...entry,
      meetingName: resolved ?? "Class meeting",
    };
  });

  return (
    <div className="min-h-dvh bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6 max-w-4xl">
          <Link
            to="/dashboard/courses"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Class
          </Link>

          <div className="mb-8 rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">{course.category}</span>
                  <h1 className="font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px", fontSize: "28px" }}>
                    {course.title}
                  </h1>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-foreground/60">
                  <User className="h-4 w-4" />
                  {course.instructor}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-foreground/60">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {course.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {course.modules} modules
                  </span>
                  {isEnrolled && <span>Enrolled {formatDate(course.enrolledDate)}</span>}
                </div>
                {isEnrolled ? (
                  <div className="mt-4">
                    <div className="mb-2 flex justify-between text-xs text-foreground/60">
                      <span>Progress</span>
                      <span className="font-semibold text-foreground">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-2 bg-gray-200" />
                  </div>
                ) : (
                  <div className="mt-4">
                    <Button
                      className="rounded-full"
                      style={{ backgroundColor: "#3954d0" }}
                      onClick={handleEnroll}
                      disabled={enrollMutation.isPending}
                    >
                      {enrollMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Enroll Now
                    </Button>
                  </div>
                )}
              </div>
              {isEnrolled && (
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    course.status === "Completed" ? "bg-green-100 text-green-700" : course.status === "Almost Complete" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {course.status}
                </span>
              )}
            </div>
          </div>

          <Tabs defaultValue="content" className="w-full">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <TabsList>
                <TabsTrigger value="content">Class content</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
              </TabsList>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setScannerOpen(true)}
                title="Scan attendance QR"
              >
                <Camera className="mr-2 h-4 w-4" />
                Scan QR
              </Button>
            </div>

            <TabsContent value="content" className="mt-0">
              {isEnrolled && (
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                    Class content
                  </h2>
                  {nextLesson && (
                    <Link to={`/dashboard/courses/${String(course.id)}/lessons/${nextLesson.id}${nextLesson.moduleId ? `?moduleId=${nextLesson.moduleId}` : ""}`}>
                      <Button size="sm" className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Continue: {nextLesson.title}
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              {isEnrolled && (
                <div className="space-y-2">
                  {lessons.map((lesson, index) => {
                  const isUnlocked = teacherCourse ? true : index === 0 || lessons[index - 1].completed;
                  return (
                    <div
                      key={lesson.id}
                      className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                        lesson.completed ? "border-gray-200/50 bg-gray-50/50" : "border-gray-200/50 bg-white/80 hover:border-gray-300/50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                          lesson.completed ? "bg-green-100" : "bg-gray-200/80"
                        }`}
                      >
                        {lesson.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <span className="text-sm font-medium text-foreground/60">{index + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <p className={`font-bold ${lesson.completed ? "text-foreground/70" : "text-foreground"}`}>
                            {lesson.title}
                          </p>
                          {lesson.completed && (
                            <span className="flex-shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                              Completed
                            </span>
                          )}
                        </div>
                        {lesson.duration !== "—" && (
                          <p className="text-xs text-foreground/50 mt-0.5">{lesson.duration}</p>
                        )}
                      </div>
                      {lesson.completed ? (
                        <Link to={`/dashboard/courses/${String(course.id)}/lessons/${lesson.id}${lesson.moduleId ? `?moduleId=${lesson.moduleId}` : ""}`}>
                          <Button size="sm" variant="outline" className="rounded-full flex-shrink-0 px-5">
                            View
                          </Button>
                        </Link>
                      ) : isUnlocked ? (
                        <Link to={`/dashboard/courses/${String(course.id)}/lessons/${lesson.id}${lesson.moduleId ? `?moduleId=${lesson.moduleId}` : ""}`}>
                          <Button size="sm" className="rounded-full flex-shrink-0" style={{ backgroundColor: "#1e40af" }}>
                            <PlayCircle className="mr-1.5 h-4 w-4" />
                            Start
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-full flex-shrink-0"
                          style={{ backgroundColor: "#1e40af" }}
                          disabled
                          title="Complete the previous lesson first"
                        >
                          <PlayCircle className="mr-1.5 h-4 w-4" />
                          Start
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              )}

              <div className="mt-8 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                    <ClipboardList className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                      Placement test / Quiz
                    </h3>
                    <p className="mt-1 text-sm text-foreground/60 max-w-md mx-auto">
                      After finishing the class content, take the quiz to test your knowledge and see your score.
                    </p>
                  </div>
                  <Link to={`/dashboard/quiz?courseId=${course.id}`}>
                    <Button className="rounded-full mt-2" style={{ backgroundColor: "#3954d0" }}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Go to Quiz
                    </Button>
                  </Link>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attendance" className="mt-0">
              {!isEnrolled ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                  Enroll in this class first to access attendance records and session check-ins.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-5">
                    <h3 className="font-semibold text-blue-900">Attendance check-in</h3>
                    <p className="mt-1 text-sm text-blue-800/90">
                      Your instructor shows a QR code in class. Scan it to check in. Meeting titles appear when this device
                      also has the instructor&apos;s saved meeting names (same browser profile).
                    </p>
                  </div>

                  {attendanceTableRows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-6 text-sm text-foreground/65">
                      No check-ins recorded on this browser for this class yet.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04] overflow-hidden">
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="border-0 bg-gradient-to-r from-slate-50 via-slate-50 to-blue-50/30 hover:from-slate-50 hover:via-slate-50 hover:to-blue-50/30">
                            <TableHead className="h-12 min-w-[140px] border-0 pl-5 pr-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                              Class
                            </TableHead>
                            <TableHead className="h-12 min-w-[120px] border-0 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                              Lecturer
                            </TableHead>
                            <TableHead className="h-12 border-0 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                              Meeting
                            </TableHead>
                            <TableHead className="h-12 border-0 pl-3 pr-5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 whitespace-nowrap">
                              Checked in
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceTableRows.map((row, idx) => {
                            const dt = new Date(row.checkedAt);
                            return (
                              <TableRow
                                key={row.key}
                                className={`border-slate-100 transition-colors hover:bg-slate-50/70 ${idx === attendanceTableRows.length - 1 ? "border-0" : ""}`}
                              >
                                <TableCell className="border-0 py-4 pl-5 pr-3 align-top">
                                  <p className="max-w-[220px] font-medium leading-snug text-slate-800 line-clamp-2">
                                    {course.title}
                                  </p>
                                </TableCell>
                                <TableCell className="border-0 py-4 px-3 align-top text-slate-700">
                                  <p className="max-w-[200px] leading-snug line-clamp-2">{course.instructor}</p>
                                </TableCell>
                                <TableCell className="border-0 py-4 px-3 align-middle">
                                  <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/10 to-indigo-600/10 text-[#3954d0] ring-1 ring-blue-900/5">
                                      <CalendarDays className="h-4 w-4" aria-hidden />
                                    </span>
                                    <div className="min-w-0 pt-0.5">
                                      <p className="font-medium leading-snug text-slate-900">{row.meetingName}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="border-0 py-4 pl-3 pr-5 align-middle text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-slate-800">
                                      <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                                      {dt.toLocaleTimeString(undefined, {
                                        hour: "numeric",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    <span className="text-xs tabular-nums text-slate-500">
                                      {dt.toLocaleDateString(undefined, {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      {scannerOpen ? (
        <div className="fixed inset-0 z-[120] bg-black/80 p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Scan attendance QR</h3>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full"
                onClick={() => setScannerOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
              <video ref={scannerVideoRef} className="h-72 w-full object-cover" playsInline muted />
            </div>
            <p className="mt-3 text-xs text-foreground/65">{scannerStatus}</p>
            {scannerError ? (
              <p className="mt-2 text-xs text-red-600">{scannerError}</p>
            ) : null}
            <p className="mt-2 text-[11px] text-foreground/50">
              Use HTTPS on phone browsers so camera access works.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StudentCourseDetail;
