import { useState, useEffect, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { ArrowLeft, BarChart2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";
import { teacherQuizStore } from "../data/teacherQuizStore";
import { quizAttemptStore } from "../data/quizAttemptStore";

export default function TeacherQuizResultsPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );
  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);
  const quiz = quizId ? teacherQuizStore.getById(quizId) : undefined;
  const attempts = quizId ? quizAttemptStore.getByQuizId(quizId) : [];

  if (!quizId) return <Navigate to="/dashboard/teacher/placement-test" replace />;
  if (!quiz) return <Navigate to="/dashboard/teacher/placement-test" replace />;

  const typeLabel = (quiz.quizType ?? "quiz") === "placement-test" ? "Placement test" : "Quiz";

  const exportToExcel = useCallback(() => {
    const headers = ["No.", "Student", "Email", "Score", "Correct", "Filling date"];
    const rows = attempts.map((a, i) => [
      i + 1,
      a.studentName,
      a.studentEmail ?? "—",
      `${a.scorePercent}%`,
      `${a.correctCount} / ${a.totalQuestions}`,
      format(new Date(a.completedAt), "MMM d, yyyy · h:mm a"),
    ]);
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const safeTitle = quiz.title.replace(/[/\\?*\[\]:]/g, "-").slice(0, 31);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, safeTitle || "Results");
    XLSX.writeFile(wb, `${safeTitle || "quiz-results"}-results.xlsx`);
  }, [quiz.title, attempts]);

  return (
    <div className="teacher-course-form-page min-h-screen bg-white" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <div className="container mx-auto px-6 max-w-3xl">
          <Link
            to="/dashboard/teacher/placement-test"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Placement test / Quiz
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 className="h-6 w-6 text-[#1e40af]/80" />
                <h1
                  className="text-2xl font-bold text-foreground"
                  style={{ fontFamily: "'Geist Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
                >
                  {typeLabel} results — {quiz.title}
                </h1>
              </div>
              <p className="text-foreground/60 text-sm">
                Student attempts and scores for this {typeLabel.toLowerCase()}.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg shrink-0"
              onClick={exportToExcel}
              title="Export to Excel spreadsheet"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </div>

          <table className="w-full text-sm rounded-xl border border-gray-100 overflow-hidden bg-gray-50/30">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/50 text-left text-muted-foreground">
                <th className="py-3 px-4 font-medium w-12">No.</th>
                <th className="py-3 px-4 font-medium">Student</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Score</th>
                <th className="py-3 px-4 font-medium">Correct</th>
                <th className="py-3 px-4 font-medium">Filling date</th>
              </tr>
            </thead>
            <tbody>
              {attempts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-sm text-muted-foreground bg-white border-b border-gray-100"
                  >
                    No attempts yet. Students will appear here after they complete this {typeLabel.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                attempts.map((a, index) => (
                  <tr key={a.id} className="border-b border-gray-100 last:border-0 bg-white hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-muted-foreground tabular-nums">{index + 1}</td>
                    <td className="py-3 px-4">{a.studentName}</td>
                    <td className="py-3 px-4 text-muted-foreground">{a.studentEmail ?? "—"}</td>
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
      </main>
    </div>
  );
}
