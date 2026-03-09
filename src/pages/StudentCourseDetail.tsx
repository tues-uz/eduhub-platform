import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BookOpen,
  PlayCircle,
  User,
  Clock,
  Layers,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DashboardSidebar from "@/components/DashboardSidebar";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { lessonProgressStore } from "@/features/student/data/lessonProgressStore";
import { eduhubCourses, eduhubModules, eduhubLessons } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";

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

const TEACHER_PREFIX = "teacher_";

type LessonRow = { id: string; title: string; duration: string; completed: boolean; moduleId?: string };

const StudentCourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [apiCourse, setApiCourse] = useState<{ id: string; title: string; instructor: string; category: string; duration: string; modules: number; enrolledDate: string } | null>(null);
  const [apiLessons, setApiLessons] = useState<LessonRow[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  const isTeacherCourse = courseId?.startsWith(TEACHER_PREFIX);
  const teacherCourseId = isTeacherCourse ? courseId!.slice(TEACHER_PREFIX.length) : null;
  const teacherCourse = teacherCourseId ? teacherCoursesStore.getById(teacherCourseId) : null;

  const id = courseId && !isTeacherCourse && !isUuid(courseId ?? "") ? parseInt(courseId, 10) : NaN;

  useEffect(() => {
    if (courseId && isUuid(courseId) && !isTeacherCourse) {
      setApiLoading(true);
      eduhubCourses.getById(courseId).then((c) => {
        setApiCourse({
          id: c.id,
          title: c.title,
          instructor: c.lecturer?.fullName ?? "—",
          category: c.category ?? "Course",
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
          category: "Course",
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

  if (apiLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: "'Comfortaa', cursive" }}>
        <p className="text-foreground/60">Loading course…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" style={{ fontFamily: "'Comfortaa', cursive" }}>
        <div className="text-center">
          <p className="text-foreground/70 mb-4">Course not found.</p>
          <Link to="/dashboard/courses">
            <Button variant="outline" className="rounded-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Courses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const nextLesson = lessons.find((l) => !l.completed) ?? lessons[0];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6 max-w-4xl">
          <Link
            to="/dashboard/courses"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Courses
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
                  <span>Enrolled {formatDate(course.enrolledDate)}</span>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs text-foreground/60">
                    <span>Progress</span>
                    <span className="font-semibold text-foreground">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-2 bg-gray-200" />
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  course.status === "Completed" ? "bg-green-100 text-green-700" : course.status === "Almost Complete" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {course.status}
              </span>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
              Course content
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
                  After finishing the course content, take the quiz to test your knowledge and see your score.
                </p>
              </div>
              <Link to="/dashboard/quiz">
                <Button className="rounded-full mt-2" style={{ backgroundColor: "#3954d0" }}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Go to Quiz
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentCourseDetail;
