import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardList, CheckCircle2, Loader2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { StudentQuizListEmptyState } from "@/components/StudentQuizListEmptyState";
import { eduhubCourseQuizzes, eduhubEnrollments, QuizResponseForStudent, QuizResultResponse } from "@/api/eduhubClient";

const LETTER_COLORS = ["bg-blue-500", "bg-red-500", "bg-amber-500", "bg-green-500"] as const;

export default function StudentQuiz() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const filterCourseId = searchParams.get("courseId");
  const [quizzes, setQuizzes] = useState<QuizResponseForStudent[]>([]);
  const [completedQuizIds, setCompletedQuizIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [screen, setScreen] = useState<"list" | "quiz" | "result">("list");
  const [currentQuiz, setCurrentQuiz] = useState<QuizResponseForStudent | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ questionId: string; selectedOptionId: string }[]>([]);

  const [quizResult, setQuizResult] = useState<QuizResultResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);

  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const enrollments = await eduhubEnrollments.getMy();
      const courseIds = Array.from(new Set(enrollments.map(e => e.course.id)));

      const targetCourseIds = filterCourseId ? [filterCourseId] : courseIds;
      const courseQuizResults = await Promise.all(
        targetCourseIds.map(async (cid) => {
          try {
            return await eduhubCourseQuizzes.listForStudent(cid);
          } catch (e) {
            console.warn(`Failed to fetch quizzes for course ${cid}`, e);
            return [];
          }
        })
      );
      const allQuizzes: QuizResponseForStudent[] = courseQuizResults.flat();
      setQuizzes(allQuizzes);

      const allResults = await eduhubCourseQuizzes.getAllMyResults();
      const completedList = new Set(allResults.map(r => r.quizId || "unknown"));
      setCompletedQuizIds(completedList);

    } catch (e) {
      console.error("Failed to load quizzes:", e);
    } finally {
      setLoading(false);
    }
  }, [filterCourseId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const startQuiz = (quiz: QuizResponseForStudent) => {
    setCurrentQuiz(quiz);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswers([]);
    setQuizResult(null);
    setQuizStartTime(Date.now());
    setScreen("quiz");
  };

  const question = currentQuiz?.questions?.[currentIndex];

  const handleSelectOption = (optionId: string) => {
    setSelectedOptionId(optionId);
  };

  const handleNext = async () => {
    if (!currentQuiz || !question || !selectedOptionId) return;

    const newAnswers = [...answers, { questionId: question.id, selectedOptionId }];
    setAnswers(newAnswers);

    if (currentIndex < currentQuiz.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOptionId(null);
    } else {
      try {
        setSubmitting(true);
        if (!currentQuiz.courseId) throw new Error("Class ID missing on quiz");
        const timeSpentSeconds = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;
        const result = await eduhubCourseQuizzes.submit(currentQuiz.courseId, currentQuiz.id, { answers: newAnswers, timeSpentSeconds });
        setQuizResult(result);
        setCompletedQuizIds(prev => new Set(prev).add(currentQuiz.id));
        setScreen("result");
      } catch (e) {
        console.error("Failed to submit quiz", e);
        alert(t("quiz.submitFailed"));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const resetQuiz = () => {
    setScreen("list");
    setCurrentQuiz(null);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswers([]);
    setQuizResult(null);
    setQuizStartTime(null);
  };

  return (
    <div className="w-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {screen === "list" && (
            <>
              {loading ? (
                <div className="flex min-h-[min(28rem,calc(100dvh-18rem))] w-full flex-col items-center justify-center px-4 py-12 text-zinc-400">
                  <Loader2 className="mb-4 h-10 w-10 animate-spin" />
                  <p className="text-sm">{t("quiz.loading")}</p>
                </div>
              ) : quizzes.length === 0 ? (
                <StudentQuizListEmptyState
                  title={t("quiz.emptyTitle")}
                  description={t("quiz.emptyDescription")}
                  action={
                    <Button
                      asChild
                      className="mx-auto h-10 rounded-xl bg-[#3954d0] px-4 text-sm font-medium hover:bg-[#2f47b3]"
                    >
                      <Link to="/dashboard/courses">{t("quiz.goToMyClass")}</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="mx-auto w-full max-w-3xl">
                  <div className="mb-8">
                    <p className="text-sm text-foreground/70">
                      {t("quiz.subtitle")}
                    </p>
                  </div>
                  <div className="space-y-4">
                  {quizzes.map((quiz) => {
                    const completed = completedQuizIds.has(quiz.id);
                    return (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm transition-all hover:border-gray-300/50 hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                            <ClipboardList className="h-6 w-6 text-violet-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="font-semibold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                                {quiz.title}
                              </h2>
                              {completed && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {t("quiz.completed")}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground/60">
                              {t("quiz.questions", { count: quiz.questions.length })}
                            </p>
                          </div>
                        </div>
                        {completed ? (
                          <span className="text-sm text-muted-foreground font-medium">{t("quiz.done")}</span>
                        ) : (
                          <Button
                            className="rounded-full"
                            style={{ backgroundColor: "#3954d0" }}
                            onClick={() => startQuiz(quiz)}
                          >
                            {t("quiz.start")}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </>
          )}

          {screen === "quiz" && currentQuiz && question && (
            <>
              <div className="mb-6 flex items-center justify-between text-sm text-foreground/60">
                <span>{currentQuiz.title}</span>
                <span>{t("quiz.questionProgress", { current: currentIndex + 1, total: currentQuiz.questions.length })}</span>
              </div>
              <div className="rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm mb-6">
                {question.imageUrl && (
                  <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 aspect-video w-full max-h-72">
                    <img
                      src={question.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h2 className="mb-6 text-lg font-semibold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                  {question.question}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.options.map((opt, i) => {
                    const isSelected = selectedOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSelectOption(opt.id)}
                        className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                          isSelected
                            ? "border-violet-500 bg-violet-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${LETTER_COLORS[i % LETTER_COLORS.length]}`}
                        >
                          {opt.letter}
                        </span>
                        <span className="text-foreground">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  className="rounded-full"
                  style={{ backgroundColor: "#3954d0" }}
                  onClick={handleNext}
                  disabled={!selectedOptionId || submitting}
                >
                  {submitting
                    ? t("quiz.submitting")
                    : currentIndex < currentQuiz.questions.length - 1
                      ? t("quiz.nextQuestion")
                      : t("quiz.submit")}
                </Button>
              </div>
            </>
          )}

          {screen === "result" && currentQuiz && quizResult && (() => {
            const totalQuestions = quizResult.totalQuestions;
            const score = quizResult.score ?? quizResult.scorePercent;
            const correctCount = quizResult.correctAnswers ?? quizResult.correctCount;
            const maxPoints = 100;

            return (
              <div className="rounded-xl border border-gray-200/50 bg-white/80 p-8 shadow-sm text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                  {t("quiz.completeTitle")}
                </h2>
                <p className="mb-2 text-foreground/70">
                  {t("quiz.yourScore")}
                </p>
                <p className="mb-6 text-4xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                  {score} <span className="text-2xl font-semibold text-foreground/60">/ {maxPoints}</span>
                </p>
                <p className="mb-6 text-sm text-foreground/60">
                  {t("quiz.correctCount", { correct: correctCount, total: totalQuestions })}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="outline" className="rounded-full" onClick={resetQuiz}>
                    {t("quiz.backToQuizzes")}
                  </Button>
                </div>
              </div>
            );
          })()}
    </div>
  );
}
