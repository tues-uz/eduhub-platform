import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, useNavigate, useMatch, NavLink } from "react-router-dom";
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
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { teacherCoursesStore, createEmptyLesson } from "../data/teacherCoursesStore";
import { eduhubCourses, eduhubModules, eduhubLessons, eduhubUploadFile } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import type { TeacherLesson } from "../types";
import { toast } from "sonner";
import {
  fetchPdfReadingTimeEstimate,
  fetchVideoDurationFromUrl,
  parseDurationMinutes,
  parseOptionalPositiveInt,
} from "./teacherCourseFormHelpers";
import { TeacherCourseFormContext, type TeacherCourseFormContextValue } from "./TeacherCourseFormContext";

const TeacherCourseFormLayout = () => {
  const navigate = useNavigate();
  const newMatch = useMatch("/dashboard/teacher/courses/new/*");
  const editMatch = useMatch("/dashboard/teacher/courses/:courseId/edit/*");

  const isNewFlow = !!newMatch;
  const courseId = editMatch?.params.courseId;
  const basePath = isNewFlow ? "/dashboard/teacher/courses/new" : `/dashboard/teacher/courses/${courseId}/edit`;
  const isEdit = !isNewFlow && !!courseId;

  const { user } = useAuthSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classMeetingsInSixMonths, setClassMeetingsInSixMonths] = useState("");
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [durationLoadingIndex, setDurationLoadingIndex] = useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [collapsedLessonIds, setCollapsedLessonIds] = useState<Set<string>>(() => new Set());
  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [lessonToRemoveIndex, setLessonToRemoveIndex] = useState<number | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const videoUrlKey = lessons.map((l) => `${l.contentType}:${l.contentUrl ?? ""}`).join("|");
  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    lessons.forEach((lesson, index) => {
      if (lesson.contentType !== "video" || !lesson.contentUrl?.trim()) return;
      const url = lesson.contentUrl.trim();
      const t = setTimeout(() => {
        setDurationLoadingIndex((prev) => (prev === null ? index : prev));
        fetchVideoDurationFromUrl(url)
          .then((formatted) => {
            if (formatted) {
              setLessons((prev) =>
                prev.map((l, i) => (i === index ? { ...l, duration: formatted, order: i } : { ...l, order: i }))
              );
            }
          })
          .finally(() => setDurationLoadingIndex((prev) => (prev === index ? null : prev)));
      }, 1000);
      timeouts.push(t);
    });
    return () => timeouts.forEach((id) => clearTimeout(id));
  }, [videoUrlKey]);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isEdit && courseId) {
      if (isUuid(courseId)) {
        eduhubCourses
          .getById(courseId)
          .then((course) => {
            setTitle(course.title);
            setDescription(course.description ?? "");
            setThumbnailUrl(course.thumbnailUrl ?? "");
            setClassMeetingsInSixMonths(
              course.classMeetingsInSixMonths != null ? String(course.classMeetingsInSixMonths) : ""
            );
            return eduhubModules.getByCourse(courseId);
          })
          .then((modules) => {
            if (modules.length === 0) {
              setLessons([createEmptyLesson(0)]);
              return;
            }
            return eduhubLessons.getByModule(courseId, modules[0].id).then((apiLessons) => {
              const mapped: TeacherLesson[] = apiLessons.map((l, i) => ({
                id: l.id,
                title: l.title,
                contentType: l.type === "DOCUMENT" ? "pdf" : "video",
                contentUrl: l.contentUrl ?? "",
                duration: l.durationMinutes
                  ? l.type === "DOCUMENT"
                    ? `${l.durationMinutes} min read`
                    : `${l.durationMinutes} min`
                  : undefined,
                order: l.orderIndex ?? i,
              }));
              setLessons(mapped.length ? mapped : [createEmptyLesson(0)]);
            });
          })
          .catch(() => setError("Class not found."));
      } else {
        const course = teacherCoursesStore.getById(courseId);
        if (course) {
          setTitle(course.title);
          setDescription(course.description ?? "");
          setThumbnailUrl(course.thumbnailUrl ?? "");
          setClassMeetingsInSixMonths(
            course.classMeetingsInSixMonths != null ? String(course.classMeetingsInSixMonths) : ""
          );
          setLessons(
            course.lessons.length > 0 ? [...course.lessons].sort((a, b) => a.order - b.order) : [createEmptyLesson(0)]
          );
        } else {
          setError("Class not found.");
        }
      }
    } else if (isNewFlow) {
      setLessons([createEmptyLesson(0)]);
    }
  }, [courseId, isEdit, isNewFlow]);

  const addLesson = () => {
    setLessons((prev) => [...prev, createEmptyLesson(prev.length)]);
  };

  const isLessonComplete = (lesson: TeacherLesson): boolean => {
    const hasTitle = !!lesson.title?.trim();
    const hasContent = !!lesson.contentUrl?.trim();
    return hasTitle && hasContent;
  };

  const handleAddLessonClick = () => {
    const incomplete = lessons.find((l) => !isLessonComplete(l));
    if (incomplete) {
      setShowAddLessonModal(true);
      return;
    }
    addLesson();
  };

  const removeLesson = (index: number) => {
    setLessons((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLesson = (index: number, updates: Partial<TeacherLesson>) => {
    setLessons((prev) => prev.map((l, i) => (i === index ? { ...l, ...updates, order: i } : { ...l, order: i })));
  };

  const handleThumbnailUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPEG, PNG, WebP, etc.).");
      return;
    }
    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("Image must be 8 MB or smaller.");
      return;
    }
    setThumbnailUploading(true);
    try {
      const { url } = await eduhubUploadFile(file, "images");
      setThumbnailUrl(url);
      toast.success("Thumbnail uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thumbnail upload failed");
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleFileUpload = async (index: number, file: File) => {
    setUploadError(null);
    setUploadingIndex(index);
    try {
      const folder = lessons[index].contentType === "video_upload" ? "videos" : "materials";
      const { url } = await eduhubUploadFile(file, folder);
      updateLesson(index, { contentUrl: url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleGetDurationFromUrl = async (index: number) => {
    const lesson = lessons[index];
    if (lesson.contentType !== "video" || !lesson.contentUrl?.trim()) return;
    setDurationLoadingIndex(index);
    try {
      const formatted = await fetchVideoDurationFromUrl(lesson.contentUrl);
      if (formatted) updateLesson(index, { duration: formatted });
    } finally {
      setDurationLoadingIndex(null);
    }
  };

  const handleGetPdfReadingTime = async (index: number) => {
    const lesson = lessons[index];
    const isPdf = lesson.contentType === "pdf" || lesson.contentType === "pdf_upload";
    if (!isPdf || !lesson.contentUrl?.trim()) return;
    setDurationLoadingIndex(index);
    try {
      const formatted = await fetchPdfReadingTimeEstimate(lesson.contentUrl);
      if (formatted) {
        updateLesson(index, { duration: formatted });
      } else {
        toast.error(
          "Could not estimate reading time (link may be private or unsupported). Enter it manually (e.g. 5 min read)."
        );
      }
    } finally {
      setDurationLoadingIndex(null);
    }
  };

  const validateDetailsStep = useCallback((): boolean => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Class title is required.");
      return false;
    }
    const meetingsRaw = classMeetingsInSixMonths.trim();
    if (!meetingsRaw) {
      setError("Sessions in 6 months is required.");
      return false;
    }
    const meetingsSixMo = parseOptionalPositiveInt(meetingsRaw);
    if (meetingsSixMo === undefined) {
      setError("Sessions in 6 months must be a whole number of at least 1.");
      return false;
    }
    return true;
  }, [title, classMeetingsInSixMonths]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Class title is required.");
      return;
    }
    const meetingsRaw = classMeetingsInSixMonths.trim();
    if (!meetingsRaw) {
      setError("Sessions in 6 months is required.");
      return;
    }
    const meetingsSixMo = parseOptionalPositiveInt(meetingsRaw);
    if (meetingsSixMo === undefined) {
      setError("Sessions in 6 months must be a whole number of at least 1.");
      return;
    }
    const validLessons = lessons
      .map((l, i) => ({ ...l, title: l.title.trim(), order: i }))
      .filter((l) => l.title || l.contentUrl);
    if (validLessons.length === 0) {
      setError("Add at least one lesson with a title and PDF or video URL for this class.");
      return;
    }

    setSaving(true);
    try {
      const instructorName = user.name?.trim() || "Teacher";

      if (user.id && !isEdit) {
        const thumbTrim = thumbnailUrl.trim();
        const course = await eduhubCourses.create({
          title: trimmedTitle,
          description: description.trim() || "—",
          category: "General",
          status: "DRAFT",
          classMeetingsInSixMonths: meetingsSixMo,
          ...(thumbTrim ? { thumbnailUrl: thumbTrim } : {}),
        });
        const module = await eduhubModules.create(course.id, { title: "Main", orderIndex: 0 });
        for (let i = 0; i < validLessons.length; i++) {
          const l = validLessons[i];
          await eduhubLessons.create(course.id, module.id, {
            title: l.title,
            type: l.contentType === "pdf" || l.contentType === "pdf_upload" ? "DOCUMENT" : "VIDEO",
            contentUrl: l.contentUrl || undefined,
            orderIndex: i,
            durationMinutes: parseDurationMinutes(l.duration),
          });
        }
        navigate("/dashboard/teacher/courses");
        return;
      }

      if (user.id && isEdit && courseId && isUuid(courseId)) {
        const thumbTrimEdit = thumbnailUrl.trim();
        await eduhubCourses.update(courseId, {
          title: trimmedTitle,
          description: description.trim() || "—",
          category: "General",
          status: "DRAFT",
          classMeetingsInSixMonths: meetingsSixMo,
          ...(thumbTrimEdit ? { thumbnailUrl: thumbTrimEdit } : {}),
        });
        const modules = await eduhubModules.getByCourse(courseId);
        if (modules.length > 0) {
          const moduleId = modules[0].id;
          const existing = await eduhubLessons.getByModule(courseId, moduleId);
          for (let i = 0; i < validLessons.length; i++) {
            const l = validLessons[i];
            const body = {
              title: l.title,
              type: (l.contentType === "pdf" || l.contentType === "pdf_upload" ? "DOCUMENT" : "VIDEO") as
                | "DOCUMENT"
                | "VIDEO",
              contentUrl: l.contentUrl || undefined,
              orderIndex: i,
              durationMinutes: parseDurationMinutes(l.duration),
            };
            if (isUuid(l.id) && existing.some((ex) => ex.id === l.id)) {
              await eduhubLessons.update(courseId, moduleId, l.id, body);
            } else {
              await eduhubLessons.create(courseId, moduleId, body);
            }
          }
        }
        navigate("/dashboard/teacher/courses");
        return;
      }

      if (isEdit && courseId) {
        teacherCoursesStore.update(courseId, {
          title: trimmedTitle,
          description: description.trim(),
          instructorName,
          lessons: validLessons,
          classMeetingsInSixMonths: meetingsSixMo,
          thumbnailUrl: thumbnailUrl.trim() || undefined,
        });
      } else {
        teacherCoursesStore.create({
          title: trimmedTitle,
          description: description.trim(),
          instructorName,
          lessons: validLessons,
          classMeetingsInSixMonths: meetingsSixMo,
          thumbnailUrl: thumbnailUrl.trim() || undefined,
        });
      }
      navigate("/dashboard/teacher/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const instructorDisplayName = user.name || "Teacher";

  const contextValue: TeacherCourseFormContextValue = {
    isEdit,
    courseId,
    basePath,
    title,
    setTitle,
    description,
    setDescription,
    classMeetingsInSixMonths,
    setClassMeetingsInSixMonths,
    thumbnailUrl,
    setThumbnailUrl,
    thumbnailUploading,
    thumbnailInputRef,
    handleThumbnailUpload,
    instructorDisplayName,
    lessons,
    setLessons,
    addLesson,
    removeLesson,
    updateLesson,
    handleAddLessonClick,
    handleFileUpload,
    handleGetDurationFromUrl,
    handleGetPdfReadingTime,
    uploadingIndex,
    uploadError,
    durationLoadingIndex,
    collapsedLessonIds,
    setCollapsedLessonIds,
    saving,
    error,
    setError,
    validateDetailsStep,
    handleSubmit,
    showAddLessonModal,
    setShowAddLessonModal,
    lessonToRemoveIndex,
    setLessonToRemoveIndex,
  };

  if (!newMatch && !editMatch) {
    return null;
  }

  const stepLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <TeacherCourseFormContext.Provider value={contextValue}>
      <div className="teacher-course-form-page min-h-screen bg-white" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
        <DashboardSidebar />
        <main
          className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-0 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
        >
          <div className="w-full min-w-0 px-6 pt-0">
            <div className="sticky top-16 z-30 -mx-6 mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-100 bg-white px-6 pb-6 pt-4 lg:top-0">
              <h1
                className="min-w-0 text-2xl font-bold text-foreground"
                style={{ fontFamily: "'Geist Sans', sans-serif", letterSpacing: "0.5px" }}
              >
                {isEdit ? "Edit class" : "Add new class"}
              </h1>

              <nav className="flex shrink-0 flex-wrap items-center gap-2" aria-label="Class setup steps">
                <NavLink to={`${basePath}/details`} className={stepLinkClass} end>
                  1 · Class details
                </NavLink>
                <span className="text-slate-300 select-none" aria-hidden>
                  /
                </span>
                <NavLink to={`${basePath}/lessons`} className={stepLinkClass}>
                  2 · Lessons
                </NavLink>
              </nav>
            </div>

            <Outlet />
          </div>
        </main>

        <AlertDialog open={showAddLessonModal} onOpenChange={setShowAddLessonModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete the current lesson first</AlertDialogTitle>
              <AlertDialogDescription>
                Please add a title and video or PDF content to the current lesson before adding another. This keeps your
                lessons organized.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowAddLessonModal(false)}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={lessonToRemoveIndex !== null} onOpenChange={(open) => !open && setLessonToRemoveIndex(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this lesson?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the lesson from the class. You can add it again later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (lessonToRemoveIndex !== null) {
                    removeLesson(lessonToRemoveIndex);
                    setLessonToRemoveIndex(null);
                  }
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TeacherCourseFormContext.Provider>
  );
};

export default TeacherCourseFormLayout;
