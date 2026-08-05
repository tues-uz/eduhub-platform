import { useState, useEffect, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { ArrowLeft, BarChart2, FileSpreadsheet, Loader2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { eduhubQuizzes, eduhubCourseQuizzes, type QuizResultResponse, type QuizResponse } from "@/api/eduhubClient";
import { getLocalCourseQuiz, isLocalOnlyQuizId } from "../data/localCourseQuizzesStorage";
import { quizAttemptStore, type QuizAttempt } from "../data/quizAttemptStore";
import { teacherQuizStore } from "../data/teacherQuizStore";
import { useTranslation } from "react-i18next";

function mapQuizAttemptsToResults(attempts: QuizAttempt[]): QuizResultResponse[] {
  return attempts.map((a) => ({
    id: a.id,
    student: { id: a.studentId || "", fullName: a.studentName, email: a.studentEmail || "" },
    score: a.scorePercent,
    scorePercent: a.scorePercent,
    correctAnswers: a.correctCount,
    correctCount: a.correctCount,
    totalQuestions: a.totalQuestions,
    passed: a.scorePercent >= 70,
    completedAt: a.completedAt,
  }));
}

interface LocalQuiz {
  id: string;
  title: string;
  quizType?: "quiz" | "placement-test";
}

export default function TeacherQuizResultsPage() {
  const { t } = useTranslation();
  const { courseId, moduleId, lessonId, quizId } = useParams<{ courseId: string; moduleId: string; lessonId: string; quizId: string }>();
  const [quiz, setQuiz] = useState<QuizResponse | LocalQuiz | null>(null);
  const [results, setResults] = useState<QuizResultResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  const exportToExcel = useCallback(() => {
    const quizTitle = quiz?.title || "quiz";
    const headers = ["No.", "Student", "Email", "Score", "Correct", "Filling date"];
    const rows = results.map((a, i) => [
      i + 1,
      a.student.fullName,
      a.student.email ?? "—",
      `${a.score}%`,
      `${a.correctAnswers} / ${a.totalQuestions}`,
      format(new Date(a.completedAt), "MMM d, yyyy · h:mm a"),
    ]);
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const safeTitle = quizTitle.replace(/[/\\?*[\]:]/g, "-").slice(0, 31);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, safeTitle || "Results");
    XLSX.writeFile(wb, `${safeTitle || "quiz-results"}-results.xlsx`);
  }, [quiz?.title, results]);

  useEffect(() => {
    if (!courseId || (!quizId && (!moduleId || !lessonId))) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      setError(null);

      if (courseId && quizId && isLocalOnlyQuizId(quizId)) {
        const local = getLocalCourseQuiz(courseId, quizId);
        if (local) {
          setQuiz(local);
          setResults(mapQuizAttemptsToResults(quizAttemptStore.getByQuizId(quizId)));
          setUseLocalStorage(true);
        } else {
          setError(
            "This quiz was saved only on this browser and is no longer in storage. Create it again or restore a backup if you use one.",
          );
        }
        setLoading(false);
        return;
      }

      try {
        let quizPromise;
        let resultsPromise;

        if (quizId) {
          quizPromise = eduhubCourseQuizzes.get(courseId!, quizId);
          resultsPromise = eduhubCourseQuizzes.getResults(courseId!, quizId);
        } else {
          quizPromise = eduhubQuizzes.get(courseId!, moduleId!, lessonId!);
          resultsPromise = eduhubQuizzes.getResults(courseId!, moduleId!, lessonId!);
        }

        const [quizData, resultsData] = await Promise.all([quizPromise, resultsPromise]);
        setQuiz(quizData);
        setResults(resultsData);
        setUseLocalStorage(false);
      } catch (err) {
        const fallbackId = quizId || lessonId;
        if (!fallbackId) {
           setError(err instanceof Error ? err.message : "Failed to load quiz results");
           setLoading(false);
           return;
        }
        const localQuiz = teacherQuizStore.getById(fallbackId) as LocalQuiz | undefined;
        if (localQuiz) {
          const localAttempts = quizAttemptStore.getByQuizId(fallbackId);
          setQuiz(localQuiz);
          setResults(mapQuizAttemptsToResults(localAttempts));
          setUseLocalStorage(true);
        } else if (courseId && quizId) {
          const courseLocal = getLocalCourseQuiz(courseId, quizId);
          if (courseLocal) {
            setQuiz(courseLocal);
            setResults(mapQuizAttemptsToResults(quizAttemptStore.getByQuizId(quizId)));
            setUseLocalStorage(true);
          } else {
            setError(err instanceof Error ? err.message : "Failed to load quiz results");
          }
        } else {
          setError(err instanceof Error ? err.message : "Failed to load quiz results");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [courseId, moduleId, lessonId, quizId]);

  if (!courseId || (!quizId && (!moduleId || !lessonId))) {
    return <Navigate to="/dashboard/teacher/courses" replace />;
  }

  if (loading) {
    return (
      <div
        className="teacher-course-form-page container mx-auto max-w-3xl px-6 py-4 md:py-6"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">{t("teacher.quizResults.loading")}</span>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div
        className="teacher-course-form-page container mx-auto max-w-3xl px-6 py-4 md:py-6"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <Link
          to={`/dashboard/teacher/courses/${courseId}?tab=quiz`}
          className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("teacher.quiz.backToQuizzes")}
        </Link>
        <div className="py-10 text-center">
          <p className="text-red-500">{error || "Quiz not found"}</p>
        </div>
      </div>
    );
  }

  const typeLabel = "quiz";
  const quizTitle = quiz?.title || "";

  return (
    <div
      className="teacher-course-form-page container mx-auto max-w-3xl px-6 py-4 md:py-6"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
          <Link
            to={`/dashboard/teacher/courses/${courseId}?tab=quiz`}
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />{t("teacher.quiz.backToQuizzes")}</Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 className="h-6 w-6 text-[#1e40af]/80" />
                <h1
                  className="text-2xl font-bold text-foreground"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
                >
                  {typeLabel} results — {quizTitle}
                </h1>
              </div>
              <p className="text-foreground/60 text-sm">
                Student attempts and scores for this {typeLabel.toLowerCase()}.
                {useLocalStorage && <span className="ml-2 text-amber-600">(Showing local data)</span>}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg shrink-0"
              onClick={exportToExcel}
              title="Export to Excel spreadsheet"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />{t("teacher.quizResults.exportButton")}</Button>
          </div>

          <table className="w-full text-xs rounded-xl border border-gray-100 overflow-hidden bg-gray-50/30">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/50 text-left text-muted-foreground">
                <th className="py-3 px-4 font-medium w-12">No.</th>
                <th className="py-3 px-4 font-medium">{t("teacher.assignments.submissions.table.student")}</th>
                <th className="py-3 px-4 font-medium">{t("teacherSettings.email")}</th>
                <th className="py-3 px-4 font-medium">Score</th>
                <th className="py-3 px-4 font-medium">Correct</th>
                <th className="py-3 px-4 font-medium">Filling date</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-sm text-muted-foreground bg-white border-b border-gray-100"
                  >
                    No attempts yet. Students will appear here after they complete this {typeLabel.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                results.map((a, index) => (
                  <tr key={a.id} className="border-b border-gray-100 last:border-0 bg-white hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">{index + 1}</td>
                    <td className="py-3 px-4">{a.student.fullName}</td>
                    <td className="py-3 px-4 text-muted-foreground">{a.student.email ?? "—"}</td>
                    <td className="py-3 px-4 font-medium">{a.scorePercent}%</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {a.correctCount} / {a.totalQuestions}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground" title="When the student finished the quiz">
                      {format(new Date(a.completedAt), "MMM d, yyyy · h:mm a")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
    </div>
  );
}
