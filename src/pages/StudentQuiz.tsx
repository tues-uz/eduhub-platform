import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";
import { teacherQuizStore } from "@/features/teacher/data/teacherQuizStore";
import type { Quiz } from "@/features/teacher/quizTypes";

const LETTER_COLORS = ["bg-blue-500", "bg-red-500", "bg-amber-500", "bg-green-500"] as const;

const StudentQuiz = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [screen, setScreen] = useState<"list" | "quiz" | "result">("list");
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    setQuizzes(teacherQuizStore.getAll());
  }, [screen]);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  const startQuiz = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowFeedback(false);
    setScore(0);
    const total = quiz.questions.reduce((sum, q) => sum + (q.points ?? 1), 0);
    setMaxPoints(total);
    setScreen("quiz");
  };

  const question = currentQuiz?.questions[currentIndex];

  const handleSelectOption = (letter: "A" | "B" | "C" | "D") => {
    if (showFeedback || !question) return;
    setSelectedOption(letter);
    const opt = question.options.find((o) => o.letter === letter);
    if (opt?.correct) setCorrectCount((c) => c + 1);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (!currentQuiz) return;
    if (currentIndex < currentQuiz.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    } else {
      setScreen("result");
    }
  };

  const resetQuiz = () => {
    setScreen("list");
    setCurrentQuiz(null);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowFeedback(false);
    setCorrectCount(0);
  };

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
              {quizzes.length === 0 ? (
                <div className="rounded-xl border border-gray-200/50 bg-white/80 p-8 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-foreground/30 mb-3" />
                  <p className="text-foreground/60">No quizzes available yet. Your teacher may add placement tests or quizzes soon.</p>
                </div>
              ) : (
              <div className="space-y-4">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm transition-all hover:border-gray-300/50 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                        <ClipboardList className="h-6 w-6 text-violet-600" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                          {quiz.title}
                        </h2>
                        <p className="text-sm text-foreground/60">{quiz.questions.length} questions</p>
                      </div>
                    </div>
                    <Button
                      className="rounded-full"
                      style={{ backgroundColor: "#3954d0" }}
                      onClick={() => startQuiz(quiz)}
                    >
                      Start
                    </Button>
                  </div>
                ))}
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
              </div>
              {showFeedback && (
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
            const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
            const maxPoints = 100;
            return (
            <div className="rounded-xl border border-gray-200/50 bg-white/80 p-8 shadow-sm text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
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
                {correctCount} correct out of {totalQuestions} questions. Total score is out of 100 (100 ÷ {totalQuestions} = {totalQuestions > 0 ? Math.round(100 / totalQuestions) : 0} pts per question).
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" className="rounded-full" onClick={resetQuiz}>
                  Back to quizzes
                </Button>
                <Button className="rounded-full" style={{ backgroundColor: "#3954d0" }} onClick={() => startQuiz(currentQuiz)}>
                  Retry quiz
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
