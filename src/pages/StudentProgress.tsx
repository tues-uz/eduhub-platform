import { useState, useEffect } from "react";
import { BarChart3, Target, BookOpen, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import DashboardSidebar from "@/components/DashboardSidebar";

const COURSE_PROGRESS = [
  { title: "Introduction to Economics", progress: 75 },
  { title: "Business Management Fundamentals", progress: 45 },
  { title: "Digital Marketing Essentials", progress: 90 },
  { title: "Financial Accounting", progress: 30 },
  { title: "English for Business", progress: 60 },
  { title: "Data Analysis with Excel", progress: 100 },
];

const StudentProgress = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  const overallProgress = Math.round(COURSE_PROGRESS.reduce((s, c) => s + c.progress, 0) / COURSE_PROGRESS.length);
  const completedCount = COURSE_PROGRESS.filter((c) => c.progress === 100).length;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h1 className="mb-2 font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px", fontSize: "32px" }}>
              Progress
            </h1>
            <p className="text-foreground/70 text-sm">Track your learning progress across all courses.</p>
          </div>
          {/* Summary stats row */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200/50 bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 opacity-90" />
                <span className="text-sm font-medium opacity-90">Overall completion</span>
              </div>
              <p className="text-3xl font-bold">{overallProgress}%</p>
              <Progress value={overallProgress} className="mt-2 h-2 bg-white/20" />
            </div>
            <div className="rounded-xl border border-gray-200/50 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-foreground/60" />
                <span className="text-sm font-medium text-foreground/70">Courses completed</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {completedCount} <span className="text-lg font-normal text-foreground/60">/ {COURSE_PROGRESS.length}</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-200/50 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-5 w-5 text-foreground/60" />
                <span className="text-sm font-medium text-foreground/70">Avg. score</span>
              </div>
              <p className="text-3xl font-bold text-foreground">91%</p>
            </div>
          </div>

          {/* By course - full width */}
          <div className="rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm">
            <h2 className="mb-6 font-semibold text-foreground flex items-center gap-2" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
              <BarChart3 className="h-5 w-5" />
              By course
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {COURSE_PROGRESS.map((c) => (
                <div key={c.title} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                  <p className="mb-2 text-sm font-medium text-foreground truncate" title={c.title}>{c.title}</p>
                  <div className="flex items-center justify-between gap-2">
                    <Progress value={c.progress} className="h-2 flex-1 bg-gray-200" />
                    <span className="text-sm font-semibold text-foreground tabular-nums">{c.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentProgress;
