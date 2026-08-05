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
  ExternalLink,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { lessonProgressStore } from "@/features/student/data/lessonProgressStore";
import { eduhubCourses, eduhubLessons, eduhubLessonProgress } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";



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
  const [searchParams] = useSearchParams();
  const moduleIdParam = searchParams.get("moduleId");

  const [apiLesson, setApiLesson] = useState<{ title: string; duration: string; type: string; contentUrl?: string } | null>(null);
  const [apiCourse, setApiCourse] = useState<{ title: string; instructor: string } | null>(null);
  const [apiLessons, setApiLessons] = useState<{ id: string; title: string; duration: string; moduleId?: string }[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  const isApiCourse = courseId && isUuid(courseId);
  const currentLessonModuleId = lessonId
    ? apiLessons.find((l) => l.id === lessonId)?.moduleId
    : undefined;

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
        Promise.all([
          eduhubCourses.getById(courseId),
          eduhubCourses.getAllLessons(courseId),
        ]).then(([c, allLessons]) => {
          setApiCourse({ title: c.title, instructor: c.lecturer?.fullName ?? "—" });
          const found = allLessons.find((l) => l.id === lessonId);
          if (found) {
            return eduhubLessons.getContent(courseId!, found.moduleId, lessonId!).then((content) => {
              const d = content.durationMinutes ? (content.type === "DOCUMENT" ? `${content.durationMinutes} min read` : `${content.durationMinutes} min`) : "—";
              setApiLesson({ title: content.title, duration: d, type: content.type, contentUrl: content.contentUrl });
              const moduleLessons = allLessons.filter((l) => l.moduleId === found.moduleId);
              setApiLessons(
                moduleLessons.map((l) => ({
                  id: l.id,
                  title: l.title,
                  duration: l.durationMinutes ? (l.type === "DOCUMENT" ? `${l.durationMinutes} min read` : `${l.durationMinutes} min`) : "—",
                  moduleId: l.moduleId,
                }))
              );
            });
          }
          return Promise.resolve();
        }).catch(() => setApiLesson(null)).finally(() => setApiLoading(false));
      }
    }
  }, [isApiCourse, courseId, lessonId, moduleIdParam]);

  const course = apiCourse
    ? { id: courseId!, title: apiCourse.title, instructor: apiCourse.instructor }
    : undefined;
  const lessons = apiLessons;
  const lesson = apiLesson
    ? { id: lessonId!, title: apiLesson.title, duration: apiLesson.duration }
    : lessons.find((l) => l.id === lessonId);
  const lessonIndex = lesson ? lessons.findIndex((l) => l.id === lesson.id) : -1;
  const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  const [markedComplete, setMarkedComplete] = useState(false);
  useEffect(() => {
    if (!courseId || !lessonId) return;
    if (!isApiCourse) {
      setMarkedComplete(lessonProgressStore.isComplete(courseId, lessonId));
      return;
    }
    if (!currentLessonModuleId) return;
    let cancelled = false;
    eduhubLessonProgress
      .get(courseId, currentLessonModuleId, lessonId)
      .then((res) => {
        if (!cancelled) setMarkedComplete(res.isCompleted);
      })
      .catch(() => {
        if (!cancelled) setMarkedComplete(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId, isApiCourse, currentLessonModuleId]);

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

  const backToCourseUrl = `/dashboard/courses/${courseId}`;
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

          {/* API lesson: PDF or Video */}
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
          {!isApiLesson && (
            <>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-6 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <PlayCircle className="h-12 w-12 text-slate-400 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm font-medium">Video material pending upload</p>
                  <p className="text-xs text-slate-400 mt-1">Check back once your instructor publishes the lesson media.</p>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm mb-8">
                <h2 className="font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                  About this lesson
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No lesson description provided.
                </p>
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
                if (isApiCourse && currentLessonModuleId) {
                  eduhubLessonProgress
                    .mark(courseId, currentLessonModuleId, lessonId, { completed: next })
                    .catch(() => setMarkedComplete(!next));
                  return;
                }
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
