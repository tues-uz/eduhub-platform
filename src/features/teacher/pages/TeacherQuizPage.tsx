import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { format, startOfDay } from "date-fns";
import { ArrowLeft, Plus, Trash2, ClipboardList, GripVertical, ChevronDown, ChevronUp, CalendarClock, BarChart2 } from "lucide-react";
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
import { useAuthSession } from "@/features/auth/context";
import { eduhubCourses, eduhubModules, eduhubLessons, eduhubQuizzes } from "@/api/eduhubClient";
import type { ModuleResponse, LessonResponse } from "@/api/eduhubTypes";
import { teacherQuizStore } from "../data/teacherQuizStore";
import { teacherCoursesStore } from "../data/teacherCoursesStore";
import {
  type Quiz,
  type QuizQuestion,
  type QuizType,
  type QuestionFormat,
  LETTERS,
  TIME_LIMIT_OPTIONS,
  QUIZ_TYPE_OPTIONS,
  QUESTION_FORMAT_OPTIONS,
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
            >
              Remove
            </Button>
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
      className={`rounded-lg border-2 border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[140px] ${
        isDragging
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

type CourseOption = { id: string; title: string; fromApi?: boolean };

const TeacherQuizPage = () => {
  const { user } = useAuthSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [screen, setScreen] = useState<"list" | "form">("list");
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [quizType, setQuizType] = useState<QuizType>("quiz");
  const [releaseDate, setReleaseDate] = useState("");
  const [releaseTime, setReleaseTime] = useState("");
  const [releaseDatePickerOpen, setReleaseDatePickerOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [apiModules, setApiModules] = useState<ModuleResponse[]>([]);
  const [apiLessons, setApiLessons] = useState<LessonResponse[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [questionToRemoveIndex, setQuestionToRemoveIndex] = useState<number | null>(null);
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<number>>(new Set());
  const [publishedCourses, setPublishedCourses] = useState<CourseOption[]>([]);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setQuizzes(teacherQuizStore.getAll());
  }, [screen]);

  // Load published courses for dropdown: API (when logged in) + local store
  useEffect(() => {
    let cancelled = false;
    const localPublished: CourseOption[] = teacherCoursesStore
      .getAll()
      .filter((c) => c.status === "PUBLISHED")
      .map((c) => ({ id: c.id, title: c.title, fromApi: false }));

    if (user?.id) {
      eduhubCourses
        .getByLecturer(user.id, { page: 0, size: 100 })
        .then((res) => {
          if (cancelled) return;
          const apiPublished: CourseOption[] = (res.content ?? [])
            .filter((c) => c.status === "PUBLISHED")
            .map((c) => ({ id: c.id, title: c.title, fromApi: true }));
          const apiIds = new Set(apiPublished.map((c) => c.id));
          const localOnly = localPublished.filter((c) => !apiIds.has(c.id));
          setPublishedCourses([...apiPublished, ...localOnly]);
        })
        .catch(() => {
          if (!cancelled) setPublishedCourses(localPublished);
        });
    } else {
      setPublishedCourses(localPublished);
    }
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const selectedCourseFromApi = publishedCourses.find((c) => c.id === courseId)?.fromApi ?? false;

  useEffect(() => {
    if (!courseId || !selectedCourseFromApi) {
      setApiModules([]);
      setApiLessons([]);
      setModuleId("");
      setLessonId("");
      return;
    }
    let cancelled = false;
    eduhubModules.getByCourse(courseId).then((list) => {
      if (!cancelled) {
        setApiModules(list);
        setModuleId("");
        setLessonId("");
        setApiLessons([]);
      }
    }).catch(() => {
      if (!cancelled) setApiModules([]);
    });
    return () => { cancelled = true; };
  }, [courseId, selectedCourseFromApi]);

  useEffect(() => {
    if (!courseId || !moduleId || !selectedCourseFromApi) {
      setApiLessons([]);
      setLessonId("");
      return;
    }
    let cancelled = false;
    eduhubLessons.getByModule(courseId, moduleId).then((list) => {
      if (!cancelled) {
        setApiLessons(list);
        setLessonId("");
      }
    }).catch(() => {
      if (!cancelled) setApiLessons([]);
    });
    return () => { cancelled = true; };
  }, [courseId, moduleId, selectedCourseFromApi]);

  const startNew = () => {
    setEditingQuizId(null);
    setTitle("");
    setQuizType("quiz");
    setReleaseDate("");
    setReleaseTime("");
    setCourseId("");
    setModuleId("");
    setLessonId("");
    setQuestions([createEmptyQuestion(randomId())]);
    setError("");
    setScreen("form");
  };

  const startEdit = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setTitle(quiz.title);
    setQuizType(quiz.quizType ?? "quiz");
    setReleaseDate(quiz.releaseDate ?? "");
    setReleaseTime(quiz.releaseTime ? quiz.releaseTime.slice(0, 5) : "");
    setCourseId(quiz.courseId ?? "");
    setModuleId("");
    setLessonId("");
    setQuestions(
      quiz.questions.length > 0
        ? quiz.questions.map((q) => ({ ...q, options: q.options.slice(0, 4) }))
        : [createEmptyQuestion(randomId())]
    );
    setError("");
    setScreen("form");
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
      const isMultipleChoice = (q.format ?? "multiple-choice") === "multiple-choice";
      if (isMultipleChoice) {
        const hasCorrect = q.options.some((o) => o.correct);
        const filledOptions = q.options.filter((o) => o.text.trim());
        if (!hasCorrect || filledOptions.length < 2) {
          setError("Each multiple-choice question needs at least 2 options and one correct answer.");
          return;
        }
      }
    }
    setError("");
    const payload = {
      title: trimmedTitle,
      courseId: courseId.trim() || undefined,
      quizType,
      releaseDate: quizType === "placement-test" ? (releaseDate.trim() || undefined) : undefined,
      releaseTime: quizType === "placement-test" ? (releaseTime.trim() || undefined) : undefined,
      questions: validQuestions.map((q) => ({
        ...q,
        image: q.image?.trim() || undefined,
        options: q.options.map((o) => ({ ...o, text: o.text.trim() })),
      })),
    };
    if (editingQuizId) {
      teacherQuizStore.update(editingQuizId, payload);
    } else {
      teacherQuizStore.create(payload);
    }

    const publishToApi = selectedCourseFromApi && courseId && moduleId && lessonId;
    if (publishToApi) {
      try {
        const body = {
          title: trimmedTitle,
          description: undefined,
          timeLimitMinutes: 30,
          passingScore: 60,
          shuffleQuestions: true,
          showCorrectAnswers: false,
          questions: validQuestions.map((q, i) => {
            const opts = q.options.filter((o) => o.text.trim());
            return {
              question: q.question.trim(),
              imageUrl: q.image?.trim() || undefined,
              orderIndex: i,
              points: 1,
              options: opts.map((o) => ({ letter: o.letter, text: o.text.trim(), isCorrect: o.correct })),
            };
          }),
        };
        await eduhubQuizzes.create(courseId, moduleId, lessonId, body);
        await eduhubQuizzes.publish(courseId, moduleId, lessonId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not publish quiz to course. Saved locally.");
        return;
      }
    }
    setScreen("list");
  };

  const handleDelete = (id: string) => {
    teacherQuizStore.delete(id);
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
    setDeleteId(null);
  };

  return (
    <div className="teacher-course-form-page min-h-screen bg-white" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <div className="container mx-auto px-6 max-w-3xl">
          <Link
            to="/dashboard/teacher"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Teacher Dashboard
          </Link>

          {screen === "list" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h1
                    className="text-2xl font-bold text-foreground"
                    style={{ fontFamily: "'Geist Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
                  >
                    Placement test / Quiz
                  </h1>
                  <p className="text-foreground/60 text-sm mt-1">
                    Create multiple choice quizzes for students (A, B, C, D).
                  </p>
                </div>
                <Button onClick={startNew} className="rounded-full shrink-0" style={{ backgroundColor: "#1e40af" }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Quiz/Placement Test
                </Button>
              </div>

              {quizzes.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <ClipboardList className="h-14 w-14 text-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">No quizzes yet</h3>
                    <p className="text-sm text-foreground/60 mb-6 max-w-sm">
                      Create a multiple choice quiz and assign it as a placement test or practice.
                    </p>
                    <Button onClick={startNew} className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
                      <Plus className="h-4 w-4 mr-1" />
                      Create your first quiz
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="flex flex-row items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/30 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-200/80">
                        <ClipboardList className="h-5 w-5 text-[#1e40af]/80" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-semibold truncate">{quiz.title}</CardTitle>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            (quiz.quizType ?? "quiz") === "placement-test"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {(quiz.quizType ?? "quiz") === "placement-test" ? "Placement test" : "Quiz"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{quiz.questions.length} questions</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          asChild
                        >
                          <Link
                            to={`/dashboard/teacher/placement-test/${quiz.id}/results`}
                            title="View results"
                          >
                            <BarChart2 className="h-4 w-4 mr-1" />
                            Results
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => startEdit(quiz)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(quiz.id)}
                          title="Delete quiz"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

            </>
          )}

          {screen === "form" && (
            <>
              <h1
                className="text-2xl font-bold text-foreground mb-6"
                style={{ fontFamily: "'Geist Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
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
                        <Label>Course</Label>
                        <Select value={courseId || "none"} onValueChange={(v) => setCourseId(v === "none" ? "" : v)}>
                          <SelectTrigger className="rounded-lg w-full">
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No course</SelectItem>
                            {publishedCourses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Only published courses from My Courses are listed. Publish a course first to link it here.
                        </p>
                      </div>
                    </div>
                    {selectedCourseFromApi && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Module</Label>
                          <Select value={moduleId || "none"} onValueChange={(v) => setModuleId(v === "none" ? "" : v)}>
                            <SelectTrigger className="rounded-lg w-full">
                              <SelectValue placeholder="Select module" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select module</SelectItem>
                              {apiModules.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Lesson</Label>
                          <Select value={lessonId || "none"} onValueChange={(v) => setLessonId(v === "none" ? "" : v)}>
                            <SelectTrigger className="rounded-lg w-full">
                              <SelectValue placeholder="Select lesson" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select lesson</SelectItem>
                              {apiLessons.map((l) => (
                                <SelectItem key={l.id} value={l.id}>
                                  {l.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    {selectedCourseFromApi && (
                      <p className="text-xs text-muted-foreground">
                        Save with a module and lesson selected to publish this quiz to the course so students can see it in Quiz.
                      </p>
                    )}
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
                          <Label>Answer format</Label>
                          <Select
                            value={q.format ?? "multiple-choice"}
                            onValueChange={(v) => updateQuestion(qIndex, { format: v as QuestionFormat })}
                          >
                            <SelectTrigger className="rounded-lg w-full max-w-xs">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                              {QUESTION_FORMAT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="rounded-md">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Multiple choice: students pick one answer. Essay: students write a free-text response.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Question text *</Label>
                          <Input
                            value={q.question}
                            onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                            placeholder={
                              (q.format ?? "multiple-choice") === "essay"
                                ? "e.g. Explain the main focus of microeconomics in your own words."
                                : "e.g. What is the main focus of microeconomics?"
                            }
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
                        {(q.format ?? "multiple-choice") === "multiple-choice" && (
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
                        )}
                        {(q.format ?? "multiple-choice") === "multiple-choice" && (
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
                        )}
                        </>
                        )}
                      </div>
                    );
                    })}
                  </CardContent>
                </Card>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="rounded-full" style={{ backgroundColor: "#1e40af" }}>
                    {editingQuizId ? "Save changes" : "Create quiz"}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => setScreen("list")}>
                    Cancel
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the quiz. Students will no longer see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={questionToRemoveIndex !== null} onOpenChange={(open) => !open && setQuestionToRemoveIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the question from the quiz. You can add another question later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (questionToRemoveIndex !== null) {
                  removeQuestion(questionToRemoveIndex);
                  setQuestionToRemoveIndex(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeacherQuizPage;
