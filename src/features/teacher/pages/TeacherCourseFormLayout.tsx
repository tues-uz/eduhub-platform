import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Outlet, useNavigate, useMatch, NavLink, useLocation } from "react-router-dom";
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
import { Check } from "@/lib/icons";
import { useAuthSession } from "@/features/auth/context";
import { createEmptyLesson } from "../data/teacherLessonDefaults";
import { eduhubCourses, eduhubModules, eduhubLessons, eduhubUploadFile } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import type { ClassMeetingSlot, TeacherLesson } from "../types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchPdfReadingTimeEstimate,
  fetchVideoDurationFromUrl,
  padMeetingSlotsForCourse,
  parseDurationMinutes,
  parseOptionalPositiveInt,
  resolveClassScheduleFormState,
} from "./teacherCourseFormHelpers";
import { TeacherCourseFormContext, type TeacherCourseFormContextValue } from "./TeacherCourseFormContext";
import { resolveInstructorCategory, INSTRUCTOR_CATEGORY_MISSING } from "../resolveInstructorCategory";
import { COURSE_LEVEL_REQUIRED } from "../data/courseLevels";
import { useTranslation } from "react-i18next";

type FormStepId = "details" | "schedule" | "lessons";

const FORM_STEPS: { id: FormStepId; path: string; labelKey: string; number: number }[] = [
  { id: "details", path: "details", labelKey: "teacher.courseForm.steps.details", number: 1 },
  { id: "schedule", path: "schedule", labelKey: "teacher.courseForm.steps.schedule", number: 2 },
  { id: "lessons", path: "lessons", labelKey: "teacher.courseForm.steps.lessons", number: 3 },
];

function stepIndexFromPath(pathname: string): number {
  if (pathname.includes("/schedule")) return 1;
  if (pathname.includes("/lessons")) return 2;
  return 0;
}

const TeacherCourseFormLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const newMatch = useMatch("/dashboard/teacher/courses/new/*");
  const editMatch = useMatch("/dashboard/teacher/courses/:courseId/edit/*");

  const isNewFlow = !!newMatch;
  const courseId = editMatch?.params.courseId;
  const basePath = isNewFlow ? "/dashboard/teacher/courses/new" : `/dashboard/teacher/courses/${courseId}/edit`;
  const isEdit = !isNewFlow && !!courseId;

  const { user } = useAuthSession();

  const instructorCategory = useMemo(
    () => resolveInstructorCategory(user.email, user.category),
    [user.email, user.category],
  );

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [description, setDescription] = useState("");
  const [classMeetingsInSixMonths, setClassMeetingsInSixMonths] = useState("");
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
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
  const [classMeetingSlots, setClassMeetingSlots] = useState<ClassMeetingSlot[]>([]);

  /** When a YouTube/Vimeo URL is pasted, try to fill duration in the background (no spinner — use "Get from link" for explicit fetch + loading UI). */
  const videoUrlKey = lessons.map((l) => `${l.contentType}:${l.contentUrl ?? ""}`).join("|");
  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    lessons.forEach((lesson, index) => {
      if (lesson.contentType !== "video" || !lesson.contentUrl?.trim()) return;
      const url = lesson.contentUrl.trim();
      const t = setTimeout(() => {
        void fetchVideoDurationFromUrl(url).then((formatted) => {
          if (!formatted) return;
          setLessons((prev) =>
            prev.map((l, i) => (i === index ? { ...l, duration: formatted, order: i } : { ...l, order: i })),
          );
        });
      }, 1000);
      timeouts.push(t);
    });
    return () => timeouts.forEach((id) => clearTimeout(id));
  }, [videoUrlKey]);

  useEffect(() => {
    if (isEdit && courseId) {
      if (isUuid(courseId)) {
        eduhubCourses
          .getById(courseId)
          .then((course) => {
            setTitle(course.title);
            setLevel(course.level ?? "");
            setDescription(course.description ?? "");
            setThumbnailUrl(course.thumbnailUrl ?? "");
            {
              const { meetingsSixMonthsStr, slots } = resolveClassScheduleFormState(course, courseId);
              setClassMeetingsInSixMonths(meetingsSixMonthsStr);
              setClassMeetingSlots(slots);
            }
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
        setError("Class not found.");
      }
    } else if (isNewFlow) {
      setLessons([createEmptyLesson(0)]);
      setClassMeetingsInSixMonths("1");
      setClassMeetingSlots(padMeetingSlotsForCourse(1, []));
    }
  }, [courseId, isEdit, isNewFlow]);

  useEffect(() => {
    const n = parseOptionalPositiveInt(classMeetingsInSixMonths.trim());
    if (n === undefined) return;
    setClassMeetingSlots((prev) => padMeetingSlotsForCourse(n, prev));
  }, [classMeetingsInSixMonths]);

  const updateMeetingSlot = useCallback((index: number, patch: Partial<ClassMeetingSlot>) => {
    setClassMeetingSlots((prev) => {
      const next = prev.map((s) => ({ ...s }));
      while (next.length <= index) {
        next.push({ title: "", sessionDate: "", sessionTime: "" });
      }
      next[index] = {
        title: next[index]?.title ?? "",
        sessionDate: next[index]?.sessionDate ?? "",
        sessionTime: next[index]?.sessionTime ?? "",
        ...patch,
      };
      return next;
    });
  }, []);

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
    if (!instructorCategory.trim()) {
      setError(INSTRUCTOR_CATEGORY_MISSING);
      return false;
    }
    if (!level.trim()) {
      setError(COURSE_LEVEL_REQUIRED);
      return false;
    }
    return true;
  }, [title, instructorCategory, level]);

  /** Schedule is owned by admin; this step is informational / approval only. */
  const validateScheduleStep = useCallback((): boolean => {
    return true;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Class title is required.");
      return;
    }
    if (!instructorCategory.trim()) {
      setError(INSTRUCTOR_CATEGORY_MISSING);
      return;
    }
    if (!level.trim()) {
      setError(COURSE_LEVEL_REQUIRED);
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
        const meetingsSixMo = parseOptionalPositiveInt(classMeetingsInSixMonths.trim()) ?? 1;
        const meetingSlotsForSave = Array.from({ length: meetingsSixMo }, (_, i) => ({
          title: classMeetingSlots[i]?.title ?? "",
          sessionDate: classMeetingSlots[i]?.sessionDate ?? "",
          sessionTime: classMeetingSlots[i]?.sessionTime ?? "",
        }));
        const meetingTitlesForSave = meetingSlotsForSave.map((s) => s.title);
        const thumbTrim = thumbnailUrl.trim();
        const course = await eduhubCourses.create({
          title: trimmedTitle,
          description: description.trim() || "—",
          category: instructorCategory.trim(),
          level: level.trim(),
          status: "DRAFT",
          classMeetingsInSixMonths: meetingsSixMo,
          classMeetingTitles: meetingTitlesForSave,
          classMeetingSlots: meetingSlotsForSave,
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
        const existingCourse = await eduhubCourses.getById(courseId);
        const meetingsSixMo =
          parseOptionalPositiveInt(classMeetingsInSixMonths.trim()) ??
          existingCourse.classMeetingsInSixMonths ??
          1;
        const meetingSlotsForSave = padMeetingSlotsForCourse(meetingsSixMo, classMeetingSlots);
        const meetingTitlesForSave = meetingSlotsForSave.map((s) => s.title);
        const thumbTrimEdit = thumbnailUrl.trim();
        await eduhubCourses.update(courseId, {
          title: trimmedTitle,
          description: description.trim() || "—",
          category: instructorCategory.trim() || existingCourse.category,
          level: level.trim(),
          status: existingCourse.status,
          classMeetingsInSixMonths: meetingsSixMo,
          classMeetingTitles: meetingTitlesForSave,
          classMeetingSlots: meetingSlotsForSave,
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

      throw new Error(
        "Your session could not be verified. Please refresh the page and sign in again before creating a class.",
      );
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
    category: instructorCategory,
    level,
    setLevel,
    description,
    setDescription,
    classMeetingsInSixMonths,
    setClassMeetingsInSixMonths,
    classMeetingSlots,
    setClassMeetingSlots,
    updateMeetingSlot,
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
    validateScheduleStep,
    handleSubmit,
    showAddLessonModal,
    setShowAddLessonModal,
    lessonToRemoveIndex,
    setLessonToRemoveIndex,
  };

  const location = useLocation();
  const activeStepIndex = stepIndexFromPath(location.pathname);

  if (!newMatch && !editMatch) {
    return null;
  }

  return (
    <TeacherCourseFormContext.Provider value={contextValue}>
      <div className="teacher-course-form-page flex min-h-full w-full min-w-0 flex-col px-4 pb-4 pt-0 lg:px-6 md:pb-6">
        <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-background px-4 py-4 lg:-mx-6 lg:px-6">
          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
            {isEdit ? t("teacher.courseForm.title.edit") : t("teacher.courseForm.title.new")}
          </h1>
          <nav
            className="flex w-full items-center gap-0 overflow-x-auto"
            aria-label={t("teacher.courseForm.steps.ariaLabel")}
          >
            {FORM_STEPS.map((step, index) => {
              const isActive = index === activeStepIndex;
              const isCompleted = index < activeStepIndex;
              return (
                <div key={step.id} className="flex min-w-0 items-center">
                  {index > 0 ? (
                    <div
                      className={cn(
                        "mx-1 h-px w-6 shrink-0 sm:mx-2 sm:w-10",
                        isCompleted || isActive ? "bg-teal-600/50" : "bg-border",
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <NavLink
                    to={`${basePath}/${step.path}`}
                    end={step.id === "details"}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium transition-colors sm:px-2.5",
                      isActive
                        ? "text-teal-800"
                        : isCompleted
                          ? "text-foreground hover:text-teal-800"
                          : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                        isActive && "bg-teal-700 text-white",
                        isCompleted && !isActive && "bg-teal-700/15 text-teal-800 ring-1 ring-teal-700/30",
                        !isActive && !isCompleted && "bg-muted text-muted-foreground",
                      )}
                    >
                      {isCompleted && !isActive ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        step.number
                      )}
                    </span>
                    <span className="whitespace-nowrap">{t(step.labelKey)}</span>
                  </NavLink>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="min-h-0 min-w-0 flex-1">
          <Outlet />
        </div>

        <AlertDialog open={showAddLessonModal} onOpenChange={setShowAddLessonModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("teacher.courseForm.dialog.completeLesson.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("teacher.courseForm.dialog.completeLesson.description")}
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
              <AlertDialogTitle>{t("teacher.courseForm.dialog.removeLesson.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("teacher.courseForm.dialog.removeLesson.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (lessonToRemoveIndex !== null) {
                    removeLesson(lessonToRemoveIndex);
                    setLessonToRemoveIndex(null);
                  }
                }}
              >
                {t("teacherSettings.remove")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TeacherCourseFormContext.Provider>
  );
};

export default TeacherCourseFormLayout;
