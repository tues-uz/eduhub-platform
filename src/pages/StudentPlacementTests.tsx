import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { eduhubCourseQuizzes, QuizResponseForStudent, QuizResultResponse } from "@/api/eduhubClient";

const LETTER_COLORS = ["bg-blue-500", "bg-red-500", "bg-amber-500", "bg-green-500"] as const;

export default function StudentPlacementTests() {
  const { user } = useAuthSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  
  const [quizzes, setQuizzes] = useState<QuizResponseForStudent[]>([]);
  const [completedQuizIds, setCompletedQuizIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      
      // Fetch global placement tests
      const allQuizzes = await eduhubCourseQuizzes.getPlacementTests();
      setQuizzes(allQuizzes);

      setQuizzes(allQuizzes);

      // Check completions using batch results endpoint
      const allResults = await eduhubCourseQuizzes.getAllMyResults();
      const completedList = new Set(allResults.map(r => r.quizId || "unknown"));
      setCompletedQuizIds(completedList);

    } catch (e) {
      console.error("Failed to load placement tests:", e);
      setError("Failed to load placement tests. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

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
        console.error("Failed to submit placement test", e);
        alert("Failed to submit placement test. Please try again.");
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
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
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
                  Placement Test
                </h1>
                <p className="text-foreground/70 text-sm">Assess your level before starting a class.</p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Loader2 className="h-12 w-12 animate-spin mb-4" />
                  <p>Loading placement tests...</p>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
                  <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-3" />
                  <p className="text-red-800 font-medium">{error}</p>
                  <Button variant="outline" className="mt-4 border-red-200 text-red-700" onClick={fetchQuizzes}>
                    Try Again
                  </Button>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="rounded-xl border border-gray-200/50 bg-white/80 p-8 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                  <p className="text-foreground/60">No placement tests available at the moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz) => {
                    const completed = completedQuizIds.has(quiz.id);
                    return (
                      <div
                        key={quiz.id}
                        className="flex items-center justify-between rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                            <ClipboardList className="h-6 w-6 text-violet-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="font-semibold text-foreground uppercase tracking-wide" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                                {quiz.title}
                              </h2>
                              {completed && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Completed
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground/60">{quiz.questions.length} questions • Assessing Level</p>
                          </div>
                        </div>
                        {completed ? (
                          <Button variant="ghost" className="text-violet-600 font-bold" onClick={() => startQuiz(quiz)}>
                            Retake
                          </Button>
                        ) : (
                          <Button
                            className="rounded-full px-6 font-bold shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95"
                            style={{ backgroundColor: "#3954d0" }}
                            onClick={() => startQuiz(quiz)}
                          >
                            Start Now
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
                <span className="font-bold uppercase tracking-wider">{currentQuiz.title}</span>
                <span className="bg-violet-50 text-violet-700 px-3 py-1 rounded-full font-bold">
                  {currentIndex + 1} / {currentQuiz.questions.length}
                </span>
              </div>
              <div className="rounded-2xl border-b-4 border-gray-200 bg-white p-6 shadow-xl mb-6">
                {question.imageUrl && (
                  <div className="mb-6 rounded-xl overflow-hidden bg-gray-100 aspect-video w-full max-h-72">
                    <img
                      src={question.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <h2 className="mb-8 text-xl font-bold text-foreground leading-relaxed" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                  {question.question}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {question.options.map((opt, i) => {
                    const isSelected = selectedOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={submitting}
                        onClick={() => handleSelectOption(opt.id)}
                        className={`flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                          isSelected
                            ? "border-violet-500 bg-violet-50 ring-4 ring-violet-50"
                            : "border-gray-100 hover:border-violet-200 hover:bg-violet-50/50"
                        }`}
                      >
                        <span
                          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-lg font-black text-white ${LETTER_COLORS[i % LETTER_COLORS.length]} shadow-inner`}
                        >
                          {opt.letter}
                        </span>
                        <span className="text-foreground font-medium text-lg">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                 <Button variant="ghost" onClick={resetQuiz} disabled={submitting}>Cancel</Button>
                 <Button 
                  className="rounded-full px-10 h-12 font-bold shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all" 
                  style={{ backgroundColor: "#3954d0" }} 
                  onClick={handleNext}
                  disabled={!selectedOptionId || submitting}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : (currentIndex < currentQuiz.questions.length - 1 ? "Next Step" : "Submit Test")}
                </Button>
              </div>
            </>
          )}

          {screen === "result" && currentQuiz && quizResult && (() => {
            const totalQuestions = quizResult.totalQuestions;
            const score = quizResult.score;
            
            return (
              <div className="rounded-3xl border-b-8 border-gray-100 bg-white p-10 shadow-2xl text-center">
                <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-green-100 ring-8 ring-green-50 shadow-inner">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="mb-2 text-3xl font-black text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                  Great Job!
                </h2>
                <p className="mb-8 text-foreground/60 font-medium">
                  You have successfully completed the {currentQuiz.title}.
                </p>
                
                <div className="mb-10 inline-block bg-violet-50 rounded-3xl px-12 py-8 border-2 border-dashed border-violet-200">
                  <p className="text-sm font-bold text-violet-400 uppercase tracking-[0.2em] mb-2">Your Score</p>
                  <p className="text-6xl font-black text-violet-600" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                    {score}<span className="text-3xl text-violet-300">/100</span>
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <Button 
                    className="rounded-full px-12 h-14 font-black shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all text-lg" 
                    style={{ backgroundColor: "#3954d0" }}
                    onClick={resetQuiz}
                  >
                    Explore My Class
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
