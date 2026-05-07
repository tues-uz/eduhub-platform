import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import { eduhubCourseQuizzes, eduhubEnrollments, QuizResponseForStudent, QuizResultResponse } from "@/api/eduhubClient";

const LETTER_COLORS = ["bg-blue-500", "bg-red-500", "bg-amber-500", "bg-green-500"] as const;

export default function StudentQuiz() {
  const { user } = useAuthSession();
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
      // 1. Get enrolled courses
      const enrollments = await eduhubEnrollments.getMy();
      const courseIds = Array.from(new Set(enrollments.map(e => e.course.id)));

      // 2. Fetch quizzes for each enrolled course
      let allQuizzes: QuizResponseForStudent[] = [];
      const targetCourseIds = filterCourseId ? [filterCourseId] : courseIds;
      
      for (const cid of targetCourseIds) {
        try {
          const courseQuizzes = await eduhubCourseQuizzes.listForStudent(cid);
          allQuizzes = [...allQuizzes, ...courseQuizzes];
        } catch (e) {
          console.warn(`Failed to fetch quizzes for course ${cid}`, e);
        }
      }
      setQuizzes(allQuizzes);

      setQuizzes(allQuizzes);
      
      // 3. Check which quizzes have been completed by the student using the new batch endpoint
      const allResults = await eduhubCourseQuizzes.getAllMyResults();
      const completedList = new Set(allResults.map(r => r.quizId || "unknown"));
      setCompletedQuizIds(completedList);

    } catch (e) {
      console.error("Failed to load quizzes:", e);
    } finally {
      setLoading(false);
    }
  }, []);

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
      // Submit the quiz
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
        alert("Failed to submit quiz. Please try again.");
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
    <div className="container mx-auto max-w-3xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {screen === "list" && (
            <>
              <div className="mb-8">
                <p className="text-foreground/70 text-sm">Choose a quiz and answer multiple choice questions (A, B, C, D).</p>
              </div>

              {loading ? (
                <div className="py-12 text-center text-gray-500">Loading quizzes...</div>
              ) : quizzes.length === 0 ? (
                <div className="rounded-xl border border-gray-200/50 bg-white/80 p-8 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                  <p className="text-foreground/60">No quizzes available yet. Your teacher may add placement tests or quizzes soon.</p>
                </div>
              ) : (
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
                                  Completed
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground/60">{quiz.questions.length} questions</p>
                          </div>
                        </div>
                        {completed ? (
                          <span className="text-sm text-muted-foreground font-medium">Done</span>
                        ) : (
                          <Button
                            className="rounded-full"
                            style={{ backgroundColor: "#3954d0" }}
                            onClick={() => startQuiz(quiz)}
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
                  {submitting ? "Submitting..." : (currentIndex < currentQuiz.questions.length - 1 ? "Next question" : "Submit")}
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
                  Quiz complete!
                </h2>
                <p className="mb-2 text-foreground/70">
                  Your score
                </p>
                <p className="mb-6 text-4xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                  {score} <span className="text-2xl font-semibold text-foreground/60">/ {maxPoints}</span>
                </p>
                <p className="mb-6 text-sm text-foreground/60">
                  {correctCount} correct out of {totalQuestions} questions.
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
  );
}
