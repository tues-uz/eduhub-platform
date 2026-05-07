import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  PlayCircle,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
  Video,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { lessonProgressStore } from "@/features/student/data/lessonProgressStore";
import { eduhubCourses, eduhubLessons, eduhubModules } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { useAuthSession } from "@/features/auth/context";
import { enrollmentApplicationStore } from "@/features/enrollment/enrollmentApplicationStore";

const TEACHER_PREFIX = "teacher_";

const ENROLLED_COURSES: Record<number, { id: number; title: string; instructor: string }> = {
  1: { id: 1, title: "Introduction to Economics", instructor: "Dr. Dilshod Karimov" },
  2: { id: 2, title: "Business Management Fundamentals", instructor: "Prof. Sarah Johnson" },
  3: { id: 3, title: "Digital Marketing Essentials", instructor: "Dr. Ahmed Hassan" },
  4: { id: 4, title: "Financial Accounting", instructor: "Prof. Maria Garcia" },
  5: { id: 5, title: "English for Business", instructor: "Ms. Elena Petrova" },
  6: { id: 6, title: "Data Analysis with Excel", instructor: "Dr. James Wilson" },
};

const LESSONS_BY_COURSE: Record<number, { id: number; title: string; duration: string }[]> = {
  1: [
    { id: 1, title: "Introduction to Microeconomics", duration: "12 min" },
    { id: 2, title: "Supply and Demand", duration: "18 min" },
    { id: 3, title: "Market Structures", duration: "22 min" },
    { id: 4, title: "Monopoly and Competition", duration: "15 min" },
    { id: 5, title: "International Trade", duration: "20 min" },
  ],
  2: [
    { id: 1, title: "Introduction to Management", duration: "14 min" },
    { id: 2, title: "Strategic Planning", duration: "25 min" },
    { id: 3, title: "Organizational Behavior", duration: "18 min" },
  ],
  3: [
    { id: 1, title: "Marketing Fundamentals", duration: "16 min" },
    { id: 2, title: "Digital Channels", duration: "20 min" },
    { id: 3, title: "Final Project", duration: "—" },
  ],
  4: [
    { id: 1, title: "Accounting Basics", duration: "15 min" },
    { id: 2, title: "Balance Sheets", duration: "22 min" },
  ],
  5: [
    { id: 1, title: "Business Writing Basics", duration: "12 min" },
    { id: 2, title: "Writing Reports", duration: "18 min" },
  ],
  6: [
    { id: 1, title: "Excel Fundamentals", duration: "20 min" },
    { id: 2, title: "Data Analysis", duration: "25 min" },
  ],
};

const DUMMY_DESCRIPTION =
  "This lesson covers the key concepts and practical applications. Watch the video above and use the resources below to reinforce your learning. You can pause and rewatch any section as needed.";

/** Convert YouTube URL to embed URL if needed */
function toEmbedUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  const ytMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return trimmed;
}

const StudentLessonPage = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user } = useAuthSession();
  const [searchParams] = useSearchParams();
  const moduleIdParam = searchParams.get("moduleId");

  const [apiLesson, setApiLesson] = useState<{ title: string; duration: string; type: string; contentUrl?: string } | null>(null);
  const [apiCourse, setApiCourse] = useState<{ title: string; instructor: string } | null>(null);
  const [apiLessons, setApiLessons] = useState<{ id: string; title: string; duration: string; moduleId?: string }[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  const isTeacherCourse = courseId?.startsWith(TEACHER_PREFIX);
  const teacherCourseId = isTeacherCourse && courseId ? courseId.slice(TEACHER_PREFIX.length) : null;
  const teacherCourse = teacherCourseId ? teacherCoursesStore.getById(teacherCourseId) : null;
  const teacherLessons = teacherCourse ? [...teacherCourse.lessons].sort((a, b) => a.order - b.order) : [];
  const teacherLesson = lessonId ? teacherLessons.find((l) => l.id === lessonId) : null;

  const isApiCourse = courseId && isUuid(courseId) && !isTeacherCourse;

  useEffect(() => {
    if (isApiCourse && courseId && lessonId) {
      setApiLoading(true);
      const moduleId = moduleIdParam;
      if (moduleId) {
        eduhubCourses.getById(courseId).then((c) => setApiCourse({ title: c.title, instructor: c.lecturer?.fullName ?? "—" }));
        Promise.all([
          eduhubLessons.getContent(courseId, moduleId, lessonId),
          eduhubLessons.getByModule(courseId, moduleId),
        ]).then(([content, lessonList]) => {
          const durationStr = content.durationMinutes
            ? content.type === "DOCUMENT"
              ? `${content.durationMinutes} min read`
              : `${content.durationMinutes} min`
            : "—";
          setApiLesson({
            title: content.title,
            duration: durationStr,
            type: content.type,
            contentUrl: content.contentUrl,
          });
          setApiLessons(
            lessonList.map((l) => ({
              id: l.id,
              title: l.title,
              duration: l.durationMinutes
                ? l.type === "DOCUMENT"
                  ? `${l.durationMinutes} min read`
                  : `${l.durationMinutes} min`
                : "—",
              moduleId,
            }))
          );
        }).catch(() => setApiLesson(null)).finally(() => setApiLoading(false));
      } else {
        eduhubCourses.getById(courseId).then((c) => {
          setApiCourse({ title: c.title, instructor: c.lecturer?.fullName ?? "—" });
          return eduhubModules.getByCourse(courseId);
        }).then((modules) => {
          const findLesson = (i: number): Promise<void> => {
            if (i >= modules.length) {
              setApiLoading(false);
              return Promise.resolve();
            }
            return eduhubLessons.getByModule(courseId!, modules[i].id).then((lessons) => {
              const l = lessons.find((le) => le.id === lessonId);
              if (l) {
                return eduhubLessons.getContent(courseId!, modules[i].id, lessonId!).then((content) => {
                  const d = content.durationMinutes ? (content.type === "DOCUMENT" ? `${content.durationMinutes} min read` : `${content.durationMinutes} min`) : "—";
                  setApiLesson({ title: content.title, duration: d, type: content.type, contentUrl: content.contentUrl });
                  setApiLessons(
                    lessons.map((le) => ({
                      id: le.id,
                      title: le.title,
                      duration: le.durationMinutes ? (le.type === "DOCUMENT" ? `${le.durationMinutes} min read` : `${le.durationMinutes} min`) : "—",
                      moduleId: modules[i].id,
                    }))
                  );
                });
              }
              return findLesson(i + 1);
            });
          };
          return findLesson(0);
        }).catch(() => setApiLoading(false));
      }
    }
  }, [isApiCourse, courseId, lessonId, moduleIdParam]);

  const cid = courseId && !isTeacherCourse && !isApiCourse ? parseInt(courseId, 10) : NaN;
  const lid = lessonId && !isTeacherCourse && !isApiCourse ? parseInt(lessonId, 10) : NaN;
  const course = apiCourse
    ? { id: courseId!, title: apiCourse.title, instructor: apiCourse.instructor }
    : teacherCourse
      ? { id: courseId!, title: teacherCourse.title, instructor: teacherCourse.instructorName }
      : cid
        ? ENROLLED_COURSES[cid]
        : undefined;
  const lessons = apiLessons.length
    ? apiLessons
    : teacherCourse
      ? teacherLessons.map((l) => ({ id: l.id, title: l.title, duration: l.duration ?? "—" }))
      : (cid && LESSONS_BY_COURSE[cid]) || [];
  const lesson = apiLesson
    ? { id: lessonId!, title: apiLesson.title, duration: apiLesson.duration }
    : teacherLesson
      ? { id: teacherLesson.id, title: teacherLesson.title, duration: teacherLesson.duration ?? "—" }
      : lessons.find((l) => l.id === lid || l.id === lessonId);
  const lessonIndex = lesson ? lessons.findIndex((l) => l.id === lesson.id) : -1;
  const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  const [markedComplete, setMarkedComplete] = useState(false);
  useEffect(() => {
    if (courseId && lessonId) setMarkedComplete(lessonProgressStore.isComplete(courseId, lessonId));
  }, [courseId, lessonId]);

  if (apiLoading) {
    return (
      <div className="flex items-center justify-center py-24" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p className="text-foreground/60">Loading lesson…</p>
      </div>
    );
  }

  if (!course || !lesson) {
    return (
      <div className="py-16 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p className="mb-4 text-foreground/70">Lesson not found.</p>
        <Link to="/dashboard/courses">
          <Button variant="outline" className="rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Class
          </Button>
        </Link>
      </div>
    );
  }

  const teacherEnrollmentAccess =
    isTeacherCourse && courseId
      ? enrollmentApplicationStore.getTeacherCourseAccess(courseId, user.email.trim().toLowerCase())
      : "approved";

  if (isTeacherCourse && teacherEnrollmentAccess !== "approved") {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <BookOpen className="mx-auto mb-4 h-12 w-12 text-foreground/25" />
        <h1 className="text-xl font-semibold text-foreground">
          {teacherEnrollmentAccess === "pending"
            ? "Enrollment pending review"
            : teacherEnrollmentAccess === "rejected"
              ? "Enrollment not approved"
              : "Enrollment required"}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {teacherEnrollmentAccess === "pending"
            ? "An administrator is reviewing your application. Lesson content unlocks after approval."
            : teacherEnrollmentAccess === "rejected"
              ? "You can’t access lessons for this class. Check Notifications for details."
              : "Request access from Available Classes first."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard/available-courses">Browse classes</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard/notifications">Notifications</Link>
          </Button>
        </div>
      </div>
    );
  }

  const backToCourseUrl = `/dashboard/courses/${courseId}`;
  const isTeacherLesson = !!teacherLesson;
  const isApiLesson = !!apiLesson;
  const lessonModuleId = (lesson as { moduleId?: string }).moduleId;
  const lessonUrl = (lid: string, mid?: string) => `/dashboard/courses/${courseId}/lessons/${lid}${mid ? `?moduleId=${mid}` : ""}`;

  return (
    <div className="container mx-auto max-w-4xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <div className="mb-4 flex items-center gap-2 text-xs text-foreground/60">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{course.title}</span>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px", fontSize: "26px" }}>
              {lesson.title}
            </h1>
            {markedComplete && (
              <span className="flex-shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Completed
              </span>
            )}
          </div>
          {lesson.duration !== "—" && (
            <p className="flex items-center gap-1.5 text-sm text-foreground/60 mb-6">
              <Clock className="h-4 w-4" />
              {lesson.duration}
            </p>
          )}

          {/* API or Teacher lesson: PDF or Video */}
          {isApiLesson && apiLesson && (
            <div className="mb-6">
              {apiLesson.type === "VIDEO" && apiLesson.contentUrl ? (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-900">
                  {toEmbedUrl(apiLesson.contentUrl).includes("youtube.com/embed") ? (
                    <iframe title={apiLesson.title} src={toEmbedUrl(apiLesson.contentUrl)} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  ) : (
                    <video className="w-full h-full object-contain" controls src={apiLesson.contentUrl} title={apiLesson.title}>Your browser does not support the video tag.</video>
                  )}
                </div>
              ) : apiLesson.type === "DOCUMENT" && apiLesson.contentUrl ? (
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white">
                    <FileText className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">PDF document</span>
                    <a href={apiLesson.contentUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">Open in new tab <ExternalLink className="h-3.5 w-3.5" /></a>
                  </div>
                  <iframe title={apiLesson.title} src={apiLesson.contentUrl} className="w-full min-h-[60vh] aspect-[8.5/11] max-h-[70vh]" />
                </div>
              ) : apiLesson.contentUrl ? (
                <div className="rounded-xl border p-4"><a href={apiLesson.contentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open content</a></div>
              ) : null}
            </div>
          )}
          {isTeacherLesson && teacherLesson && (
            <div className="mb-6">
              {(teacherLesson.contentType === "video" || teacherLesson.contentType === "video_upload") ? (
                teacherLesson.contentUrl ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-900">
                    {toEmbedUrl(teacherLesson.contentUrl).includes("youtube.com/embed") || toEmbedUrl(teacherLesson.contentUrl).includes("youtu.be") ? (
                      <iframe
                        title={teacherLesson.title}
                        src={toEmbedUrl(teacherLesson.contentUrl)}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        className="w-full h-full object-contain"
                        controls
                        src={teacherLesson.contentUrl}
                        title={teacherLesson.title}
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-100 border border-gray-200">
                    <div className="text-center text-foreground/60">
                      <Video className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">No video URL provided for this lesson.</p>
                    </div>
                  </div>
                )
              ) : (
                teacherLesson.contentUrl ? (
                  <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white">
                      <FileText className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">PDF document</span>
                      <a
                        href={teacherLesson.contentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        Open in new tab
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <iframe
                      title={teacherLesson.title}
                      src={teacherLesson.contentUrl}
                      className="w-full min-h-[60vh] aspect-[8.5/11] max-h-[70vh]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-100 border border-gray-200">
                    <div className="text-center text-foreground/60">
                      <FileText className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">No PDF URL provided for this lesson.</p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Mock lesson: placeholder */}
          {!isTeacherLesson && (
            <>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-900 mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/90">
                    <div className="flex justify-center mb-3">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors cursor-pointer">
                        <PlayCircle className="h-12 w-12 text-white" strokeWidth={1.5} />
                      </div>
                    </div>
                    <p className="text-sm font-medium">Lesson video</p>
                    <p className="text-xs text-white/70 mt-1">Click to play (demo)</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm mb-8">
                <h2 className="font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                  About this lesson
                </h2>
                <p className="text-sm text-foreground/80 leading-relaxed">{DUMMY_DESCRIPTION}</p>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {prevLesson ? (
                <Link to={lessonUrl(String(prevLesson.id), (prevLesson as { moduleId?: string }).moduleId)}>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <ChevronLeft className="mr-1.5 h-4 w-4" />
                    Previous
                  </Button>
                </Link>
              ) : (
                <Link to={backToCourseUrl}>
                  <Button variant="outline" size="sm" className="rounded-full">
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Back to class
                  </Button>
                </Link>
              )}
              {nextLesson ? (
                <Link to={lessonUrl(String(nextLesson.id), (nextLesson as { moduleId?: string }).moduleId)}>
                  <Button size="sm" className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
                    Next lesson
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Link to={backToCourseUrl}>
                  <Button size="sm" className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Finish class
                  </Button>
                </Link>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => {
                if (!courseId || !lessonId) return;
                const next = !markedComplete;
                setMarkedComplete(next);
                if (next) lessonProgressStore.markComplete(courseId, lessonId);
                else lessonProgressStore.unmarkComplete(courseId, lessonId);
              }}
            >
              {markedComplete ? (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-600" />
                  Marked complete
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Mark as complete
                </>
              )}
            </Button>
          </div>
    </div>
  );
};

export default StudentLessonPage;
