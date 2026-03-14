import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DashboardSidebar from "@/components/DashboardSidebar";
import { teacherQuizStore } from "@/features/teacher/data/teacherQuizStore";
import { quizAttemptStore } from "@/features/teacher/data/quizAttemptStore";
import { useAuthSession } from "@/features/auth/context";
import type { Quiz } from "@/features/teacher/quizTypes";
import {
  eduhubEnrollments,
  eduhubModules,
  eduhubLessons,
  eduhubQuizzes,
  type QuizResponseForStudent,
  type QuizResultResponse,
} from "@/api/eduhubClient";

const LETTER_COLORS = ["bg-blue-500", "bg-red-500", "bg-amber-500", "bg-green-500"] as const;

/** Quiz from API (lesson-scoped); student sees it when enrolled in the course. */
export type ApiQuizItem = {
  source: "api";
  courseId: string;
  moduleId: string;
  lessonId: string;
  quiz: QuizResponseForStudent;
};

export type QuizItem = { source: "local"; quiz: Quiz } | ApiQuizItem;

function getQuizId(item: QuizItem): string {
  if (item.source === "local") return item.quiz.id;
  return `api:${item.courseId}:${item.moduleId}:${item.lessonId}`;
}

function getQuizTitle(item: QuizItem): string {
  return item.source === "local" ? item.quiz.title : item.quiz.title;
}

function getQuestionCount(item: QuizItem): number {
  return item.source === "local" ? item.quiz.questions.length : item.quiz.questions.length;
}

/** Fetch all quizzes available to the student: local (localStorage) + API (enrolled courses' lessons with a quiz). */
async function fetchAvailableQuizzes(): Promise<QuizItem[]> {
  const local: QuizItem[] = teacherQuizStore.getAll().map((quiz) => ({ source: "local", quiz }));

  let apiQuizzes: QuizItem[] = [];
  try {
    const enrollments = await eduhubEnrollments.getMy();
    for (const en of enrollments) {
      const courseId = en.course?.id ?? (en as { courseId?: string }).courseId;
      if (!courseId) continue;
      const modules = await eduhubModules.getByCourse(courseId);
      for (const mod of modules) {
        const lessons = await eduhubLessons.getByModule(courseId, mod.id);
        for (const lesson of lessons) {
          try {
            const quiz = await eduhubQuizzes.getForStudent(courseId, mod.id, lesson.id);
            apiQuizzes.push({ source: "api", courseId, moduleId: mod.id, lessonId: lesson.id, quiz });
          } catch {
            // No quiz for this lesson (404 or other)
          }
        }
      }
    }
  } catch {
    // Not logged in or API error; keep only local
  }

  return [...local, ...apiQuizzes];
}

const StudentQuiz = () => {
  const { user } = useAuthSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [screen, setScreen] = useState<"list" | "quiz" | "result">("list");
  const [currentItem, setCurrentItem] = useState<QuizItem | null>(null);
  /** For local quiz we use Quiz; for API we normalize to Quiz-like for UI but keep raw for submit. */
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [essayAnswers, setEssayAnswers] = useState<Record<number, string>>({});
  /** For API submit: collect { questionId, selectedOptionId } as student progresses. */
  const [apiAnswers, setApiAnswers] = useState<{ questionId: string; selectedOptionId: string }[]>([]);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  /** After API submit we get back a result. */
  const [apiResult, setApiResult] = useState<QuizResultResponse | null>(null);

  const loadQuizzes = useCallback(async () => {
    setLoadingQuizzes(true);
    const list = await fetchAvailableQuizzes();
    setQuizzes(list);
    setLoadingQuizzes(false);
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  useEffect(() => {
    if (screen === "list") loadQuizzes();
  }, [screen, loadQuizzes]);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  const startQuiz = (item: QuizItem) => {
    setCurrentItem(item);
    setApiAnswers([]);
    setApiResult(null);
    setQuizStartTime(Date.now());
    if (item.source === "local") {
      setCurrentQuiz(item.quiz);
    } else {
      const q = item.quiz;
      setCurrentQuiz({
        id: q.id,
        title: q.title,
        questions: q.questions.map((qu) => ({
          id: qu.id,
          question: qu.question,
          image: qu.imageUrl,
          options: qu.options.map((o) => ({ letter: o.letter as "A" | "B" | "C" | "D", text: o.text, correct: false })),
        })),
      });
    }
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowFeedback(false);
    setCorrectCount(0);
    setEssayAnswers({});
    setScreen("quiz");
  };

  const question = currentQuiz?.questions[currentIndex];
  const isApiQuiz = currentItem?.source === "api";
  const apiQuestion = isApiQuiz && currentItem ? currentItem.quiz.questions[currentIndex] : null;

  const handleSelectOption = (letter: "A" | "B" | "C" | "D") => {
    if (showFeedback || !question) return;
    setSelectedOption(letter);
    if (!isApiQuiz) {
      const opt = question.options.find((o) => o.letter === letter);
      if (opt?.correct) setCorrectCount((c) => c + 1);
    } else if (apiQuestion) {
      const opt = apiQuestion.options.find((o) => o.letter === letter);
      if (opt) setApiAnswers((prev) => [...prev.filter((a) => a.questionId !== apiQuestion.id), { questionId: apiQuestion.id, selectedOptionId: opt.id }]);
    }
    setShowFeedback(true);
  };

  const handleNext = async () => {
    if (!currentQuiz || !currentItem) return;
    const q = currentQuiz.questions[currentIndex];
    const isEssay = (q?.format ?? "multiple-choice") === "essay";
    let nextCorrect = correctCount;
    if (isEssay && essayAnswers[currentIndex]?.trim()) nextCorrect = correctCount + 1;

    if (currentIndex < currentQuiz.questions.length - 1) {
      setCorrectCount(nextCorrect);
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      return;
    }

    if (currentItem.source === "api") {
      const timeSpentSeconds = Math.round((Date.now() - quizStartTime) / 1000);
      try {
        const result = await eduhubQuizzes.submit(currentItem.courseId, currentItem.moduleId, currentItem.lessonId, {
          answers: apiAnswers,
          timeSpentSeconds,
        });
        setApiResult(result);
        setCorrectCount(result.correctAnswers);
      } catch {
        setApiResult({ correctAnswers: 0, totalQuestions: currentQuiz.questions.length, score: 0, passed: false, completedAt: new Date().toISOString(), id: "" });
      }
      setScreen("result");
      return;
    }

    quizAttemptStore.add(
      currentQuiz.id,
      user.id ?? "anonymous",
      user.name,
      nextCorrect,
      currentQuiz.questions.length,
      user.email
    );
    setCorrectCount(nextCorrect);
    setScreen("result");
  };

  const resetQuiz = () => {
    setScreen("list");
    setCurrentItem(null);
    setCurrentQuiz(null);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowFeedback(false);
    setCorrectCount(0);
    setApiResult(null);
  };

  const hasCompletedQuiz = (quizId: string) =>
    quizAttemptStore.getByQuizId(quizId).some((a) => a.studentId === (user.id ?? "anonymous"));

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6 max-w-3xl">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {screen === "list" && (
            <>
              <div className="mb-8">
                <h1 className="mb-2 font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px", fontSize: "32px" }}>
                  Quiz
                </h1>
                <p className="text-foreground/70 text-sm">Choose a quiz and answer multiple choice questions (A, B, C, D).</p>
              </div>
              {loadingQuizzes ? (
                <div className="rounded-xl border border-gray-200/50 bg-white/80 p-8 flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-foreground/50" />
                  <span className="text-sm text-foreground/60">Loading quizzes…</span>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="rounded-xl border border-gray-200/50 bg-white/80 p-8 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                  <p className="text-foreground/60 mb-2">No quizzes available yet.</p>
                  <p className="text-xs text-foreground/50 max-w-md mx-auto">
                    Quizzes are currently stored on the teacher’s browser. You’ll see them here if your teacher opens this app on the same device/browser and creates a quiz, or once quizzes are available from your course.
                  </p>
                </div>
              ) : (
              <div className="space-y-4">
                {quizzes.map((item) => {
                  const id = getQuizId(item);
                  const completed = item.source === "local" && hasCompletedQuiz(id);
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm transition-all hover:border-gray-300/50 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                          <ClipboardList className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                              {getQuizTitle(item)}
                            </h2>
                            {item.source === "api" && (
                              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Course quiz</span>
                            )}
                            {completed && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Completed
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground/60">{getQuestionCount(item)} questions</p>
                        </div>
                      </div>
                      {completed ? (
                        <span className="text-sm text-muted-foreground font-medium">Done</span>
                      ) : (
                        <Button
                          className="rounded-full"
                          style={{ backgroundColor: "#3954d0" }}
                          onClick={() => startQuiz(item)}
                        >
                          Start
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </>
          )}

          {screen === "quiz" && currentQuiz && question && (
            <>
              <div className="mb-6 flex items-center justify-between text-sm text-foreground/60">
                <span>{currentQuiz.title}</span>
                <span>Question {currentIndex + 1} of {currentQuiz.questions.length}</span>
              </div>
              <div className="rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm mb-6">
                {question.image && (
                  <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 aspect-video w-full max-h-72">
                    <img
                      src={question.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h2 className="mb-6 text-lg font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                  {question.question}
                </h2>
                {(question.format ?? "multiple-choice") === "essay" ? (
                  <div className="space-y-4">
                    <Textarea
                      value={essayAnswers[currentIndex] ?? ""}
                      onChange={(e) =>
                        setEssayAnswers((prev) => ({ ...prev, [currentIndex]: e.target.value }))
                      }
                      placeholder="Type your answer here…"
                      rows={5}
                      className="rounded-xl border-gray-200 resize-y"
                    />
                    <div className="flex justify-end">
                      <Button className="rounded-full" style={{ backgroundColor: "#3954d0" }} onClick={handleNext}>
                        {currentIndex < currentQuiz.questions.length - 1 ? "Next question" : "Submit"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {question.options.map((opt, i) => {
                        const isSelected = selectedOption === opt.letter;
                        return (
                          <button
                            key={opt.letter}
                            type="button"
                            disabled={showFeedback}
                            onClick={() => handleSelectOption(opt.letter)}
                            className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                              isSelected
                                ? "border-violet-500 bg-violet-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <span
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${LETTER_COLORS[i]}`}
                            >
                              {opt.letter}
                            </span>
                            <span className="text-foreground">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              {(question.format ?? "multiple-choice") !== "essay" && showFeedback && (
                <div className="flex justify-end">
                  <Button className="rounded-full" style={{ backgroundColor: "#3954d0" }} onClick={handleNext}>
                    {currentIndex < currentQuiz.questions.length - 1 ? "Next question" : "Submit"}
                  </Button>
                </div>
              )}
            </>
          )}

          {screen === "result" && currentQuiz && (() => {
            const totalQuestions = currentQuiz.questions.length;
            const score = apiResult != null ? apiResult.score : (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0);
            const correct = apiResult != null ? apiResult.correctAnswers : correctCount;
            const maxPoints = 100;
            const passed = apiResult?.passed ?? (score >= 50);
            return (
            <div className="rounded-xl border border-gray-200/50 bg-white/80 p-8 shadow-sm text-center">
              <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full ${passed ? "bg-green-100" : "bg-amber-100"}`}>
                <CheckCircle2 className={`h-8 w-8 ${passed ? "text-green-600" : "text-amber-600"}`} />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                Quiz complete!
              </h2>
              <p className="mb-2 text-foreground/70">
                Your score
              </p>
              <p className="mb-6 text-4xl font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                {score} <span className="text-2xl font-semibold text-foreground/60">/ {maxPoints}</span>
              </p>
              <p className="mb-6 text-sm text-foreground/60">
                {correct} correct out of {totalQuestions} questions. {passed ? "You passed." : "Keep trying next time."}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" className="rounded-full" onClick={resetQuiz}>
                  Back to quizzes
                </Button>
              </div>
            </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
};

export default StudentQuiz;
