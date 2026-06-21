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
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import DashboardSidebar from "@/components/DashboardSidebar";
import { eduhubCourseQuizzes, eduhubCourses, type QuizResponse, type QuizCreateRequest } from "@/api/eduhubClient";
import {
  buildClientOnlyQuizResponse,
  getLocalCourseQuiz,
  upsertLocalCourseQuiz,
} from "@/features/teacher/data/localCourseQuizzesStorage";
import { useTranslation } from "react-i18next";
import {
  type QuizQuestion,
  type QuizType,
  LETTERS,
  TIME_LIMIT_OPTIONS,
  QUIZ_TYPE_OPTIONS,
  createEmptyQuestion,
} from "../quizTypes";

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
};

function MediaUploadBox({ questionIndex, image, onImageChange }: MediaUploadBoxProps) {
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
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden">
        <div className="relative aspect-video w-full max-h-48 bg-gray-100">
          <img
            src={image}
            alt="Question"
            className="w-full h-full object-contain"
            onError={({ currentTarget }) => {
              currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-lg h-8 text-white bg-white/20 hover:bg-white/30 border-0"
              onClick={handleZoneClick}
            >
              Change
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-lg h-8 text-white bg-white/20 hover:bg-white/30 border-0"
              onClick={() => onImageChange(undefined)}
            >{t("teacherSettings.remove")}</Button>
          </div>
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
      aria-label="Add image to the current question."
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
      className={`rounded-lg border-2 border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[140px] ${isDragging
        ? "border-[#1e40af] bg-[#1e40af]/5"
        : "border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-100/50"
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden
      />
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-full bg-gray-200/80 p-3 text-gray-600">
          <Plus className="h-8 w-8" strokeWidth={2} />
        </div>
        <p id={`add-media-instructions-${questionIndex}`} className="text-sm font-medium text-gray-700">
          Find and insert media
        </p>
      </div>
      <div className="mt-4 text-xs text-muted-foreground">
        <p>
          <button
            type="button"
            className="underline font-medium text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e40af] focus:ring-offset-1 rounded"
            onClick={(e) => {
              e.stopPropagation();
              handleZoneClick();
            }}
          >
            Upload file
          </button>{" "}
          or drag here to upload
        </p>
      </div>
    </div>
  );
}

const TeacherQuizPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [editingSourceCourseId, setEditingSourceCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [quizType, setQuizType] = useState<QuizType>("quiz");
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

  const goBackToClassQuizTab = useCallback(() => {
    const cid = courseId.trim();
    if (cid) void navigate(`/dashboard/teacher/courses/${cid}?tab=quiz`, { replace: true });
    else void navigate("/dashboard/teacher/courses", { replace: true });
  }, [courseId, navigate]);

  const startNew = useCallback(() => {
    setEditingQuizId(null);
    setEditingSourceCourseId("");
    setTitle("");
    setQuizType("quiz");
    setReleaseDate("");
    setReleaseTime("");
    setQuestions([createEmptyQuestion(randomId())]);
    setError("");
  }, []);

  const startEdit = useCallback((quiz: QuizResponse) => {
    setEditingQuizId(quiz.id);
    setEditingSourceCourseId(quiz.courseId ?? "");
    setTitle(quiz.title);
    const qt = quiz.quizType === "PLACEMENT_TEST" ? "placement-test" : "quiz";
    setQuizType(qt as QuizType);
    setReleaseDate(quiz.releaseDate ?? "");
    setReleaseTime(quiz.releaseTime ? quiz.releaseTime.slice(0, 5) : "");
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

    if (editId && fromUrl) {
      if (editQuizFromQueryRef.current) return;
      editQuizFromQueryRef.current = true;
      setEditLinkLoading(true);
      void eduhubCourseQuizzes
        .get(fromUrl, editId)
        .then((quiz) => {
          startEdit(quiz);
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete("edit");
              return next;
            },
            { replace: true },
          );
        })
        .catch(() => {
          const local = getLocalCourseQuiz(fromUrl, editId);
          if (local) {
            startEdit(local);
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("edit");
                return next;
              },
              { replace: true },
            );
          } else {
            setError("Could not load that quiz for editing.");
          }
        })
        .finally(() => setEditLinkLoading(false));
    }
  }, [searchParams, setSearchParams, startNew, startEdit]);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

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

    const apiQuizType = quizType === "placement-test" ? "PLACEMENT_TEST" : "QUIZ";
    const quizCourseId = courseId.trim();
    
    if (!quizCourseId) {
      setError("Please select a class to associate this quiz with.");
      return;
    }

    const payload: QuizCreateRequest = {
      title: trimmedTitle,
      quizType: apiQuizType as "QUIZ" | "PLACEMENT_TEST",
      releaseDate: quizType === "placement-test" ? (releaseDate.trim() || undefined) : undefined,
      releaseTime: quizType === "placement-test" ? (releaseTime.trim() || undefined) : undefined,
      questions: validQuestions.map((q, idx) => ({
        question: q.question.trim(),
        imageUrl: q.image?.trim() || undefined,
        orderIndex: idx,
        points: 1,
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
      let saved: QuizResponse;
      if (editingQuizId) {
        saved = await eduhubCourseQuizzes.update(quizCourseId, editingQuizId, payload);
      } else {
        saved = await eduhubCourseQuizzes.create(courseId.trim(), payload);
      }
      upsertLocalCourseQuiz(quizCourseId, { ...saved, courseId: saved.courseId ?? quizCourseId });
      await queryClient.invalidateQueries({ queryKey: ["teacher", "roster", "courseQuizzes", quizCourseId] });
      void navigate(`/dashboard/teacher/courses/${quizCourseId}?tab=quiz`, { replace: true });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to save quiz.";
      const noLocalFallback =
        errorMessage.includes("does not belong to the specified course") ||
        errorMessage.includes("permission") ||
        /forbidden/i.test(errorMessage);
      if (!noLocalFallback) {
        const built = buildClientOnlyQuizResponse(quizCourseId, payload, editingQuizId ?? undefined);
        upsertLocalCourseQuiz(quizCourseId, built);
        await queryClient.invalidateQueries({ queryKey: ["teacher", "roster", "courseQuizzes", quizCourseId] });
        toast.info("Saved on this device only", {
          description:
            "This browser keeps a copy of your quiz on the class roster. The server did not confirm the save.",
        });
        void navigate(`/dashboard/teacher/courses/${quizCourseId}?tab=quiz`, { replace: true });
        return;
      }
      if (errorMessage.includes("does not belong to the specified course")) {
        setError("Unable to move quiz to the selected class. Please ensure you have permission for that class.");
      } else if (errorMessage.includes("permission")) {
        setError(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!searchParams.toString()) {
    return <Navigate to="/dashboard/teacher/courses" replace />;
  }

  if (editLinkLoading) {
    return (
      <div className="teacher-course-form-page min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <DashboardSidebar />
        <main
          className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
        >
          <div className="container mx-auto flex max-w-3xl flex-col items-center justify-center px-6 py-24">
            <Loader2 className="h-9 w-9 animate-spin text-[#1e40af]/70" aria-hidden />
            <p className="mt-4 text-sm text-muted-foreground">{t("teacher.quiz.loading")}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="teacher-course-form-page min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <div className="container mx-auto px-6 max-w-3xl">
          {courseId.trim() ? (
          <Link
              to={`/dashboard/teacher/courses/${courseId.trim()}?tab=quiz`}
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />{t("teacher.quiz.backToQuizzes")}</Link>
          ) : (
                              <Link
              to="/dashboard/teacher"
              className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
                              >
              <ArrowLeft className="h-4 w-4" />{t("teacherSettings.backToDashboard")}</Link>
          )}

            <>
              <h1
                className="text-2xl font-bold text-foreground mb-6"
                style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
              >
                {editingQuizId ? "Edit quiz" : "Create quiz"}
              </h1>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveQuiz();
                }}
                className="space-y-6"
              >
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quiz details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={quizType} onValueChange={(v) => setQuizType(v as QuizType)}>
                          <SelectTrigger className="rounded-lg w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {QUIZ_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Quiz for practice or Placement test for assessment.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("teacher.dashboard.classesTable.header.class")}</Label>
                        {classFieldLocked ? (
                          <>
                            <div className="flex min-h-10 items-center rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
                              {lockedClassLabel || courseId.trim() || "Loading…"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              This quiz is saved for the class you opened from My Class (no need to pick a class again).
                            </p>
                          </>
                        ) : (
                          <>
                        <Select value={courseId || "none"} onValueChange={(v) => setCourseId(v === "none" ? "" : v)}>
                          <SelectTrigger className="rounded-lg w-full">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No class</SelectItem>
                            {courses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Link to one of your classes from My Class.
                        </p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiz-title">{quizType === "placement-test" ? "Placement test title *" : "Quiz title *"}</Label>
                      <Input
                        id="quiz-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Economics Placement Test"
                        className="rounded-lg"
                      />
                    </div>
                    {quizType === "placement-test" && (
                      <div className="space-y-2">
                        <Label>Release date and time</Label>
                        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1e40af]/10">
                            <CalendarClock className="h-5 w-5 text-[#1e40af]" />
                          </div>
                          <div className="min-w-0 flex-1 flex flex-wrap items-end gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <Label htmlFor="release-date-picker" className="text-xs text-muted-foreground">Date</Label>
                              <Popover open={releaseDatePickerOpen} onOpenChange={setReleaseDatePickerOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    id="release-date-picker"
                                    className="w-full min-w-[10rem] justify-between rounded-lg h-11 bg-white font-normal"
                                  >
                                    {releaseDate ? format(new Date(releaseDate + "T12:00:00"), "PPP") : "Select date"}
                                    <ChevronDown className="h-4 w-4 opacity-50" />
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
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0 max-w-[10rem]">
                              <Label className="text-xs text-muted-foreground">Time</Label>
                              <Select value={releaseTime || undefined} onValueChange={setReleaseTime}>
                                <SelectTrigger id="release-time" className="rounded-lg h-11 bg-white w-full">
                                  <SelectValue placeholder="Select time" />
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
                            <p className="text-xs text-muted-foreground w-full">
                              When this placement test becomes available to students.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Questions (multiple choice)</CardTitle>
                    <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={addQuestion}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add question
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {questions.map((q, qIndex) => {
                      const isCollapsed = collapsedQuestions.has(qIndex);
                      return (
                        <div
                          key={q.id}
                          className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3"
                        >
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-foreground/60 hover:text-foreground"
                              onClick={() => {
                                setCollapsedQuestions((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(qIndex)) next.delete(qIndex);
                                  else next.add(qIndex);
                                  return next;
                                });
                              }}
                              title={isCollapsed ? "Expand" : "Minimize"}
                              aria-expanded={!isCollapsed}
                            >
                              {isCollapsed ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <GripVertical className="h-4 w-4 text-foreground/40 shrink-0" />
                            <span className="text-sm font-medium text-foreground/70 flex-1 min-w-0">Question {qIndex + 1}</span>
                            <span className="text-xs font-medium text-foreground/50 shrink-0 rounded bg-gray-200/80 px-2 py-0.5">
                              {questions.length > 0 ? Math.round(100 / questions.length) : 0} pts
                            </span>
                            {questions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-red-600 hover:bg-red-50"
                                onClick={() => setQuestionToRemoveIndex(qIndex)}
                                title="Remove question"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          {!isCollapsed && (
                            <>
                              <div className="space-y-2">
                                <Label>Question text *</Label>
                                <Input
                                  value={q.question}
                                  onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                                  placeholder="e.g. What is the main focus of microeconomics?"
                                  className="rounded-lg"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Image for this question</Label>
                                <MediaUploadBox
                                  questionIndex={qIndex}
                                  image={q.image}
                                  onImageChange={(url) => updateQuestion(qIndex, { image: url })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Time limit</Label>
                                <Select
                                  value={String(q.timeLimitSeconds ?? 30)}
                                  onValueChange={(v) => updateQuestion(qIndex, { timeLimitSeconds: parseInt(v, 10) })}
                                >
                                  <SelectTrigger className="rounded-lg w-full max-w-xs">
                                    <SelectValue placeholder="Choose…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TIME_LIMIT_OPTIONS.map((sec) => (
                                      <SelectItem key={sec} value={String(sec)}>
                                        {sec} s
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Options (check the correct answer)</Label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {LETTERS.map((letter) => {
                                    const opt = q.options.find((o) => o.letter === letter) ?? {
                                      letter,
                                      text: "",
                                      correct: false,
                                    };
                                    return (
                                      <div key={letter} className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name={`correct-${q.id}`}
                                          checked={opt.correct}
                                          onChange={() => setOptionCorrect(qIndex, letter)}
                                          className="h-4 w-4 rounded-full border-gray-300 text-[#1e40af] focus:ring-[#1e40af]"
                                        />
                                        <Input
                                          value={opt.text}
                                          onChange={(e) => {
                                            const newOptions = q.options.map((o) =>
                                              o.letter === letter ? { ...o, text: e.target.value } : o
                                            );
                                            updateQuestion(qIndex, { options: newOptions });
                                          }}
                                          placeholder={`Option ${letter}`}
                                          className="rounded-lg flex-1"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={loading} className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
                    {editingQuizId ? "Save changes" : "Create quiz"}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-full" onClick={goBackToClassQuizTab}>{t("common.cancel")}</Button>
                </div>
              </form>
            </>
        </div>
      </main>

      <AlertDialog open={questionToRemoveIndex !== null} onOpenChange={(open) => !open && setQuestionToRemoveIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the question from the quiz. You can add another question later if needed.
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
            >{t("teacherSettings.remove")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherQuizPage;
