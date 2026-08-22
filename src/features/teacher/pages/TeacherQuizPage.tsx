import { useState, useEffect, useRef, useCallback } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, startOfDay } from "date-fns";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  CalendarClock,
  Loader2,
  Image as ImageIcon,
  X,
  CircleHelp,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  eduhubCourseQuizzes,
  eduhubCourses,
  eduhubUploadFile,
  eduhubPlacementTestsAdmin,
  type QuizResponse,
  type QuizCreateRequest,
  type PlacementTestBand,
  type PlacementTestUpsertRequest,
  type PlacementTestAdminResponse,
} from "@/api/eduhubClient";
import { useTranslation } from "react-i18next";
import { useLayoutContext } from "@/features/layout/context";
import {
  type QuizQuestion,
  type QuizType,
  LETTERS,
  TIME_LIMIT_OPTIONS,
  QUIZ_TYPE_OPTIONS,
  createEmptyQuestion,
} from "../quizTypes";
import { useCourseLevels } from "../data/courseLevels";

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const RELEASE_TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      opts.push({ value, label: format(new Date(1970, 0, 1, h, m), "h:mm a") });
    }
  }
  return opts;
})();

type MediaUploadBoxProps = {
  questionIndex: number;
  image: string | undefined;
  onImageChange: (url: string | undefined) => void;
  className?: string;
};

function MediaUploadBox({ questionIndex, image, onImageChange, className }: MediaUploadBoxProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const readFileAsDataUrl = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onImageChange(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [onImageChange]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) readFileAsDataUrl(file);
      e.target.value = "";
    },
    [readFileAsDataUrl]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) readFileAsDataUrl(file);
    },
    [readFileAsDataUrl]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleZoneClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  if (image?.trim()) {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border",
          className,
        )}
      >
        <div className="relative min-h-0 flex-1 bg-muted/30">
          <img
            src={image}
            alt={t("teacher.quiz.form.questionImageAlt")}
            className="absolute inset-0 h-full w-full object-contain"
            onError={({ currentTarget }) => {
              currentTarget.style.display = "none";
            }}
          />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border bg-muted/20 px-3 py-2.5">
          <Button type="button" variant="outline" size="sm" onClick={handleZoneClick}>
            {t("teacher.quiz.form.changeImage")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onImageChange(undefined)}
          >
            {t("teacherSettings.remove")}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={t("teacher.quiz.form.addImageAriaLabel")}
      onClick={handleZoneClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleZoneClick();
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "flex min-h-[8rem] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
        isDragging
          ? "border-teal-600 bg-teal-50/50"
          : "border-border bg-muted/20 hover:bg-muted/40",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden
      />
      <Plus className="mb-2 h-5 w-5 text-muted-foreground" strokeWidth={2} aria-hidden />
      <p
        id={`add-media-instructions-${questionIndex}`}
        className="text-sm font-medium text-foreground"
      >
        {t("teacher.quiz.form.findAndInsertMedia")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        <button
          type="button"
          className="font-medium text-teal-800 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40 rounded"
          onClick={(e) => {
            e.stopPropagation();
            handleZoneClick();
          }}
        >
          {t("teacher.quiz.form.uploadFile")}
        </button>{" "}
        {t("teacher.quiz.form.dragHere")}
      </p>
    </div>
  );
}

const QUIZ_FORM_ID = "teacher-quiz-form";

const TeacherQuizPage = () => {
  const { t } = useTranslation();
  const { isSidebarCollapsed } = useLayoutContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [editingSourceCourseId, setEditingSourceCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [quizType, setQuizType] = useState<QuizType>("quiz");
  const [subject, setSubject] = useState("");
  const [bands, setBands] = useState<PlacementTestBand[]>([]);
  const { levels: availableLevels } = useCourseLevels();
  const [thumbnailDraft, setThumbnailDraft] = useState("");
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [releaseDate, setReleaseDate] = useState("");
  const [releaseTime, setReleaseTime] = useState("");
  const [releaseDatePickerOpen, setReleaseDatePickerOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState("");
  const [questionToRemoveIndex, setQuestionToRemoveIndex] = useState<number | null>(null);
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<number>>(new Set());
  const [editLinkLoading, setEditLinkLoading] = useState(() =>
    typeof window !== "undefined" ? Boolean(new URLSearchParams(window.location.search).get("edit")?.trim()) : false,
  );

  const createQuizFromQueryRef = useRef(false);
  const editQuizFromQueryRef = useRef(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const goBackToClassQuizTab = useCallback(() => {
    if (quizType === "placement-test") {
      void navigate("/dashboard/teacher/placement-tests", { replace: true });
      return;
    }
    const cid = courseId.trim();
    if (cid) void navigate(`/dashboard/teacher/courses/${cid}?tab=quiz`, { replace: true });
    else void navigate("/dashboard/teacher/courses", { replace: true });
  }, [courseId, navigate, quizType]);

  const startNew = useCallback(() => {
    setEditingQuizId(null);
    setEditingSourceCourseId("");
    setTitle("");
    setQuizType("quiz");
    setSubject("");
    setBands([]);
    setThumbnailDraft("");
    setReleaseDate("");
    setReleaseTime("");
    setQuestions([createEmptyQuestion(randomId())]);
    setError("");
  }, []);

  const startEdit = useCallback((quiz: QuizResponse) => {
    setEditingQuizId(quiz.id);
    setEditingSourceCourseId(quiz.courseId ?? "");
    setTitle(quiz.title);
    setQuizType("quiz");
    setSubject("");
    setBands([]);
    setThumbnailDraft(quiz.thumbnailUrl?.trim() || "");
    setReleaseDate("");
    setReleaseTime("");
    setCourseId(quiz.courseId ?? "");
    setQuestions(
      quiz.questions.length > 0
        ? quiz.questions.map((q) => ({
          id: q.id,
          question: q.question,
          image: q.imageUrl,
          timeLimitSeconds: q.timeLimitSeconds ?? 30,
            options: q.options.map((o) => ({
              letter: o.letter as "A" | "B" | "C" | "D",
              text: o.text,
              correct: o.isCorrect,
            })),
          }))
        : [createEmptyQuestion(randomId())],
    );
    setError("");
  }, []);

  const startEditPlacement = useCallback((quiz: PlacementTestAdminResponse) => {
    setEditingQuizId(quiz.id);
    setEditingSourceCourseId("");
    setTitle(quiz.title);
    setQuizType("placement-test");
    setSubject(quiz.subject ?? "");
    setBands(quiz.bands ?? []);
    setThumbnailDraft("");
    setReleaseDate(quiz.releaseDate ?? "");
    setReleaseTime(quiz.releaseTime ? quiz.releaseTime.slice(0, 5) : "");
    setCourseId("");
    setQuestions(
      quiz.questions.length > 0
        ? quiz.questions.map((q) => ({
            id: q.id,
            question: q.question,
            image: q.imageUrl,
            timeLimitSeconds: 30,
            options: q.options.map((o) => ({
              letter: o.letter as "A" | "B" | "C" | "D",
              text: o.text,
              correct: o.isCorrect,
            })),
          }))
        : [createEmptyQuestion(randomId())],
    );
    setError("");
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("courseId")?.trim();
    const wantNew = searchParams.get("new") === "1";
    const editId = searchParams.get("edit")?.trim();

    if (fromUrl) setCourseId(fromUrl);

    if (!wantNew && !editId) {
      createQuizFromQueryRef.current = false;
      editQuizFromQueryRef.current = false;
      return;
    }

    if (wantNew) {
      if (createQuizFromQueryRef.current) return;
      createQuizFromQueryRef.current = true;
      startNew();
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("new");
          return next;
        },
        { replace: true },
      );
      return;
    }

    if (editId) {
      if (editQuizFromQueryRef.current) return;
      editQuizFromQueryRef.current = true;
      setEditLinkLoading(true);

      const clearEditParam = () =>
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("edit");
            return next;
          },
          { replace: true },
        );

      const loadAsPlacementTest = () =>
        eduhubPlacementTestsAdmin
          .get(editId)
          .then((placementQuiz) => {
            startEditPlacement(placementQuiz);
            clearEditParam();
          })
          .catch(() => setError(t("teacher.quiz.errors.loadFailed")))
          .finally(() => setEditLinkLoading(false));

      if (fromUrl) {
        // Most edit links come from a class roster, so try the class-scoped fetch first. If the
        // quiz turns out to be a placement test (subject-wide, not tied to any one class), or the
        // fetch fails outright — e.g. this link is stale because the test lost its class
        // association when it moved to the placement-test form — fall back to loading it as one.
        void eduhubCourseQuizzes
          .get(fromUrl, editId)
          .then((quiz) => {
            if (quiz.quizType === "PLACEMENT_TEST") {
              void loadAsPlacementTest();
              return;
            }
            startEdit(quiz);
            clearEditParam();
            setEditLinkLoading(false);
          })
          .catch(() => void loadAsPlacementTest());
      } else {
        void loadAsPlacementTest();
      }
    }
  }, [searchParams, setSearchParams, startNew, startEdit, startEditPlacement, t]);

  useEffect(() => {
    eduhubCourses.getAll().then((res) => {
      setCourses(res.map((c) => ({ id: c.id, title: c.title })));
    }).catch(() => {
      setCourses([]);
    });
  }, []);

  const [lockedClassLabel, setLockedClassLabel] = useState("");

  useEffect(() => {
    const cid = courseId.trim();
    if (!cid) {
      setLockedClassLabel("");
      return;
    }
    const fromList = courses.find((c) => c.id === cid)?.title?.trim();
    if (fromList) {
      setLockedClassLabel(fromList);
      return;
    }
    let cancelled = false;
    setLockedClassLabel("");
    void eduhubCourses
      .getById(cid)
      .then((c) => {
        if (!cancelled) setLockedClassLabel(c.title?.trim() || cid);
      })
      .catch(() => {
        if (!cancelled) setLockedClassLabel(cid);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, courses]);

  /** Quiz is always created in a class context from the roster (courseId in URL); no class picker needed. */
  const classFieldLocked = Boolean(courseId.trim());

  const onThumbnailPicked = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("teacher.resumeEdit.toast.invalidImage"));
      return;
    }
    setUploadingThumbnail(true);
    try {
      const { url } = await eduhubUploadFile(file, "quizzes");
      setThumbnailDraft(url);
    } catch {
      toast.error(t("teacher.resumeEdit.toast.uploadFailed"));
    } finally {
      setUploadingThumbnail(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    }
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion(randomId())]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...updates } : q)));
  };

  const setOptionCorrect = (questionIndex: number, letter: "A" | "B" | "C" | "D") => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
            ...q,
            options: q.options.map((opt) => ({ ...opt, correct: opt.letter === letter })),
          }
          : q
      )
    );
  };

  const saveQuiz = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Quiz title is required.");
      return;
    }
    const validQuestions = questions.filter((q) => q.question.trim());
    if (validQuestions.length === 0) {
      setError("Add at least one question.");
      return;
    }
    for (const q of validQuestions) {
      const hasCorrect = q.options.some((o) => o.correct);
      const filledOptions = q.options.filter((o) => o.text.trim());
      if (!hasCorrect || filledOptions.length < 2) {
        setError("Each question needs at least 2 options and one correct answer.");
        return;
      }
    }
    setError("");

    if (quizType === "placement-test") {
      const trimmedSubject = subject.trim();
      if (!trimmedSubject) {
        setError("Set the subject — it decides which classes this test gates.");
        return;
      }
      const usableBands = bands.filter((b) => b.levelCode.trim());
      if (usableBands.length === 0) {
        setError("Add at least one score band — without one, no student ever gets a level from this test.");
        return;
      }
      for (const b of usableBands) {
        if (b.minScore > b.maxScore) {
          setError(`Band ${b.levelCode} has a minimum above its maximum.`);
          return;
        }
      }
      const sortedBands = [...usableBands].sort((a, b) => a.minScore - b.minScore);
      for (let i = 1; i < sortedBands.length; i++) {
        if (sortedBands[i].minScore <= sortedBands[i - 1].maxScore) {
          setError(
            `Bands ${sortedBands[i - 1].levelCode} and ${sortedBands[i].levelCode} overlap — each score must map to exactly one level.`,
          );
          return;
        }
      }

      const placementPayload: PlacementTestUpsertRequest = {
        title: trimmedTitle,
        subject: trimmedSubject,
        releaseDate: releaseDate.trim() || undefined,
        releaseTime: releaseTime.trim() || undefined,
        isPublished: true,
        questions: validQuestions.map((q, idx) => ({
          question: q.question.trim(),
          imageUrl: q.image?.trim() || undefined,
          orderIndex: idx,
          points: 1,
          options: q.options
            .filter((o) => o.text.trim())
            .map((o) => ({ letter: o.letter, text: o.text.trim(), isCorrect: o.correct })),
        })),
        bands: usableBands.map((b) => ({ minScore: b.minScore, maxScore: b.maxScore, levelCode: b.levelCode })),
      };

      try {
        setLoading(true);
        if (editingQuizId) {
          await eduhubPlacementTestsAdmin.update(editingQuizId, placementPayload);
        } else {
          await eduhubPlacementTestsAdmin.create(placementPayload);
        }
        toast.success(editingQuizId ? "Placement test updated" : "Placement test created");
        void navigate("/dashboard/teacher/placement-tests", { replace: true });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Failed to save placement test.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
      return;
    }

    const quizCourseId = courseId.trim();

    if (!quizCourseId) {
      setError("Please select a class to associate this quiz with.");
      return;
    }

    const payload: QuizCreateRequest = {
      title: trimmedTitle,
      quizType: "QUIZ",
      thumbnailUrl: thumbnailDraft.trim() || undefined,
      questions: validQuestions.map((q, idx) => ({
        question: q.question.trim(),
        imageUrl: q.image?.trim() || undefined,
        orderIndex: idx,
        points: 1,
        timeLimitSeconds: q.timeLimitSeconds,
        options: q.options
          .filter((o) => o.text.trim())
          .map((o) => ({ letter: o.letter, text: o.text.trim(), isCorrect: o.correct })),
      })),
    };

    if (editingQuizId && courseId.trim() !== editingSourceCourseId.trim()) {
      payload.courseId = courseId;
    }

    try {
      setLoading(true);
      if (editingQuizId) {
        await eduhubCourseQuizzes.update(quizCourseId, editingQuizId, payload);
      } else {
        await eduhubCourseQuizzes.create(courseId.trim(), payload);
      }
      await queryClient.invalidateQueries({ queryKey: ["teacher", "roster", "courseQuizzes", quizCourseId] });
      toast.success(editingQuizId ? "Quiz updated" : "Quiz created");
      void navigate(`/dashboard/teacher/courses/${quizCourseId}?tab=quiz`, { replace: true });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to save quiz.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!searchParams.toString() && !createQuizFromQueryRef.current && !editQuizFromQueryRef.current) {
    return <Navigate to="/dashboard/teacher/courses" replace />;
  }

  if (editLinkLoading) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-24 lg:px-6">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700/70" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">{t("teacher.quiz.loading")}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 pb-28 lg:px-6">
      <form
        id={QUIZ_FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          saveQuiz();
        }}
        className="space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {courseId.trim() ? (
              <Link
                to={`/dashboard/teacher/courses/${courseId.trim()}?tab=quiz`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                {t("teacher.quiz.backToQuizzes")}
              </Link>
            ) : (
              <Link
                to="/dashboard/teacher"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                {t("teacherSettings.backToDashboard")}
              </Link>
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {editingQuizId ? t("teacher.quiz.title.edit") : t("teacher.quiz.title.create")}
            </h1>
            {(lockedClassLabel || courseId.trim()) && classFieldLocked ? (
              <p className="truncate text-sm text-muted-foreground">
                {lockedClassLabel || courseId.trim()}
              </p>
            ) : null}
          </div>
          <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
            {t("teacher.roster.quiz.questionCount", { count: questions.length })}
          </span>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:items-start">
          {/* Setup column */}
          <aside className="space-y-4 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-[4.25rem] lg:self-start">
            <h2 className="text-sm font-semibold text-foreground">
              {t("teacher.quiz.form.detailsTitle")}
            </h2>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("teacher.quiz.form.thumbnail.label")}
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {t("teacher.quiz.form.thumbnail.optional")}
                </span>
              </div>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                disabled={uploadingThumbnail}
                className="sr-only"
                onChange={(e) => void onThumbnailPicked(e.target.files?.[0] ?? null)}
              />
              {thumbnailDraft ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <img
                    src={thumbnailDraft}
                    alt={t("teacher.quiz.form.thumbnail.previewAlt")}
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                  />
                  <div className="flex gap-1.5 border-t border-border bg-muted/20 p-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1"
                      disabled={uploadingThumbnail}
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      {uploadingThumbnail ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        t("teacher.quiz.form.thumbnail.change")
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground"
                      onClick={() => setThumbnailDraft("")}
                      title={t("teacher.quiz.form.thumbnail.remove")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingThumbnail}
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/20 px-3 text-center transition-colors hover:bg-muted/40 disabled:opacity-50"
                >
                  {uploadingThumbnail ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
                  )}
                  <span className="text-xs font-medium text-foreground">
                    {uploadingThumbnail
                      ? t("teacherSettings.uploading")
                      : t("teacher.quiz.form.thumbnail.add")}
                  </span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t("teacher.quiz.form.typeLabel")}
              </Label>
              <Select
                value={quizType}
                onValueChange={(v) => {
                  const next = v as QuizType;
                  setQuizType(next);
                  // A placement test is subject-wide, not tied to one class — clear a stale
                  // class selection so the header doesn't keep showing "for class X".
                  if (next === "placement-test") setCourseId("");
                }}
                disabled={Boolean(editingQuizId)}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder={t("teacher.quiz.form.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {QUIZ_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.value === "placement-test"
                        ? t("teacher.quiz.types.placementTest")
                        : t("teacher.quiz.types.quiz")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("teacher.quiz.form.typeHint")}</p>
            </div>

            {quizType === "quiz" && !classFieldLocked ? (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("teacher.quiz.form.classLabel")}
                </Label>
                <Select
                  value={courseId || "none"}
                  onValueChange={(v) => setCourseId(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder={t("teacher.quiz.form.classPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("teacher.quiz.form.noClass")}</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="quiz-title" className="text-xs font-medium text-muted-foreground">
                {quizType === "placement-test"
                  ? t("teacher.quiz.form.titleLabels.placement")
                  : t("teacher.quiz.form.titleLabels.quiz")}
              </Label>
              <Input
                id="quiz-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("teacher.quiz.form.titlePlaceholder")}
              />
            </div>

            {quizType === "placement-test" ? (
              <div className="space-y-2 border-t border-border pt-4">
                <Label htmlFor="quiz-subject" className="text-xs font-medium text-muted-foreground">
                  {t("teacher.quiz.form.subjectLabel")}
                </Label>
                <Input
                  id="quiz-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("teacher.quiz.form.subjectPlaceholder")}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {t("teacher.quiz.form.subjectHint")}
                </p>
              </div>
            ) : null}

            {quizType === "placement-test" ? (
              <div className="space-y-2 border-t border-border pt-4">
                <Label className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  {t("teacher.quiz.form.release.label")}
                </Label>
                <div className="space-y-2">
                  <Popover open={releaseDatePickerOpen} onOpenChange={setReleaseDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id="release-date-picker"
                        className="h-10 w-full justify-between bg-background font-normal"
                      >
                        <span className="truncate">
                          {releaseDate
                            ? format(new Date(releaseDate + "T12:00:00"), "PPP")
                            : t("teacher.quiz.form.release.selectDate")}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={releaseDate ? new Date(releaseDate + "T12:00:00") : undefined}
                        disabled={(date) => startOfDay(date) < startOfDay(new Date())}
                        onSelect={(date) => {
                          if (date) setReleaseDate(format(date, "yyyy-MM-dd"));
                          setReleaseDatePickerOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <Select value={releaseTime || undefined} onValueChange={setReleaseTime}>
                    <SelectTrigger id="release-time" className="h-10 w-full bg-background">
                      <SelectValue placeholder={t("teacher.quiz.form.release.selectTime")} />
                    </SelectTrigger>
                    <SelectContent>
                      {RELEASE_TIME_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {quizType === "placement-test" ? (
              <div className="space-y-2 border-t border-border pt-4">
                <Label className="text-xs font-medium text-muted-foreground">
                  {t("teacher.quiz.form.bands.label")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("teacher.quiz.form.bands.hint")}
                </p>
                <div className="space-y-2">
                  {bands.map((band, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={band.minScore}
                        onChange={(e) =>
                          setBands((prev) =>
                            prev.map((b, i) => (i === idx ? { ...b, minScore: Number(e.target.value) } : b)),
                          )
                        }
                        className="w-16"
                        aria-label={t("teacher.quiz.form.bands.minScore")}
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={band.maxScore}
                        onChange={(e) =>
                          setBands((prev) =>
                            prev.map((b, i) => (i === idx ? { ...b, maxScore: Number(e.target.value) } : b)),
                          )
                        }
                        className="w-16"
                        aria-label={t("teacher.quiz.form.bands.maxScore")}
                      />
                      <Select
                        value={band.levelCode || undefined}
                        onValueChange={(value) =>
                          setBands((prev) => prev.map((b, i) => (i === idx ? { ...b, levelCode: value } : b)))
                        }
                      >
                        <SelectTrigger className="h-9 flex-1 bg-background">
                          <SelectValue placeholder={t("teacher.courseForm.details.levelPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableLevels.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.labelKey ? t(item.labelKey, { defaultValue: item.label }) : item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setBands((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    setBands((prev) => [...prev, { minScore: 0, maxScore: 100, levelCode: "" }])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("teacher.quiz.form.bands.addRow")}
                </Button>
              </div>
            ) : null}
          </aside>

          {/* Questions column */}
          <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("teacher.quiz.form.questionsTitle")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("teacher.quiz.form.questionsHint")}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-teal-700 hover:bg-teal-800"
                onClick={addQuestion}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("teacher.quiz.form.addQuestion")}
              </Button>
            </div>

            <div className="space-y-3">
              {questions.map((q, qIndex) => {
                const isCollapsed = collapsedQuestions.has(qIndex);
                return (
                  <div
                    key={q.id}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-2.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setCollapsedQuestions((prev) => {
                            const next = new Set(prev);
                            if (next.has(qIndex)) next.delete(qIndex);
                            else next.add(qIndex);
                            return next;
                          });
                        }}
                        title={
                          isCollapsed
                            ? t("teacher.quiz.form.questionActions.expand")
                            : t("teacher.quiz.form.questionActions.minimize")
                        }
                        aria-expanded={!isCollapsed}
                      >
                        {isCollapsed ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <GripVertical
                        className="hidden h-4 w-4 shrink-0 text-muted-foreground/40 sm:block"
                        aria-hidden
                      />
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-teal-700/10 text-xs font-semibold tabular-nums text-teal-800">
                        {qIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {q.question.trim() ||
                          t("teacher.quiz.form.questionLabel", { n: qIndex + 1 })}
                      </span>
                      <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                        {t("teacher.quiz.form.pointsLabel", {
                          n: questions.length > 0 ? Math.round(100 / questions.length) : 0,
                        })}
                      </span>
                      {questions.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setQuestionToRemoveIndex(qIndex)}
                          title={t("teacher.quiz.form.questionActions.remove")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    {!isCollapsed ? (
                      <div className="space-y-4 p-4 sm:p-5">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                          <div className="space-y-2">
                            <Label>{t("teacher.quiz.form.questionTextLabel")}</Label>
                            <Input
                              value={q.question}
                              onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                              placeholder={t("teacher.quiz.form.questionTextPlaceholder")}
                            />
                          </div>
                          <div className="space-y-2 justify-self-end">
                            <Label className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-right">
                              <span>{t("teacher.quiz.form.timeLimit.label")}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                                    aria-label={t("teacher.quiz.form.timeLimit.hint")}
                                  >
                                    <CircleHelp className="h-3.5 w-3.5" aria-hidden />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[14rem] text-left">
                                  {t("teacher.quiz.form.timeLimit.hint")}
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Select
                              value={String(q.timeLimitSeconds ?? 30)}
                              onValueChange={(v) =>
                                updateQuestion(qIndex, {
                                  timeLimitSeconds: parseInt(v, 10),
                                })
                              }
                            >
                              <SelectTrigger className="ml-auto w-[4.75rem] bg-background px-2">
                                <SelectValue
                                  placeholder={t("teacher.quiz.form.timeLimit.choose")}
                                />
                              </SelectTrigger>
                              <SelectContent align="end" position="popper">
                                {TIME_LIMIT_OPTIONS.map((sec) => (
                                  <SelectItem key={sec} value={String(sec)}>
                                    {t("teacher.quiz.form.timeLimit.seconds", { sec })}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Labels share row 1; A–D options and image share row 2 at equal height */}
                        <div className="grid gap-x-4 gap-y-2 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] lg:grid-rows-[auto_1fr]">
                          <div className="space-y-0.5">
                            <Label>{t("teacher.quiz.form.options.title")}</Label>
                            <p className="text-xs text-muted-foreground">
                              {t("teacher.quiz.form.options.hint")}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <Label>{t("teacher.quiz.form.questionImageLabel")}</Label>
                            <p className="text-xs text-muted-foreground">
                              {t("teacher.quiz.form.questionImageOptional")}
                            </p>
                          </div>

                          <div className="grid gap-2">
                            {LETTERS.map((letter) => {
                              const opt = q.options.find((o) => o.letter === letter) ?? {
                                letter,
                                text: "",
                                correct: false,
                              };
                              return (
                                <label
                                  key={letter}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors",
                                    opt.correct
                                      ? "border-teal-300 bg-teal-50/60"
                                      : "border-border bg-background hover:bg-muted/30",
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name={`correct-${q.id}`}
                                    checked={opt.correct}
                                    onChange={() => setOptionCorrect(qIndex, letter)}
                                    className="h-4 w-4 shrink-0 border-border text-teal-700 focus:ring-teal-700"
                                  />
                                  <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground">
                                    {letter}
                                  </span>
                                  <Input
                                    value={opt.text}
                                    onChange={(e) => {
                                      const newOptions = q.options.map((o) =>
                                        o.letter === letter
                                          ? { ...o, text: e.target.value }
                                          : o,
                                      );
                                      updateQuestion(qIndex, { options: newOptions });
                                    }}
                                    placeholder={t("teacher.quiz.form.options.option", {
                                      letter,
                                    })}
                                    className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </label>
                              );
                            })}
                          </div>

                          <MediaUploadBox
                            questionIndex={qIndex}
                            image={q.image}
                            onImageChange={(url) => updateQuestion(qIndex, { image: url })}
                            className="h-full min-h-[8rem] w-full"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </form>

      <footer
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md transition-[left] duration-300 pb-[env(safe-area-inset-bottom)]",
          isSidebarCollapsed ? "lg:left-20" : "lg:left-64",
        )}
      >
        <div className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 lg:px-6">
          <Button type="button" variant="outline" size="sm" onClick={goBackToClassQuizTab}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            form={QUIZ_FORM_ID}
            size="sm"
            disabled={loading}
            className="gap-1.5 bg-teal-700 hover:bg-teal-800"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {editingQuizId
              ? t("teacher.quiz.form.saveChanges")
              : t("teacher.quiz.form.createQuiz")}
          </Button>
        </div>
      </footer>

      <AlertDialog
        open={questionToRemoveIndex !== null}
        onOpenChange={(open) => !open && setQuestionToRemoveIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacher.quiz.dialog.removeQuestion.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacher.quiz.dialog.removeQuestion.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (questionToRemoveIndex !== null) {
                  removeQuestion(questionToRemoveIndex);
                  setQuestionToRemoveIndex(null);
                }
              }}
            >
              {t("teacherSettings.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherQuizPage;
