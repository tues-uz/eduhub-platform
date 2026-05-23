import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import DashboardSidebar from "@/components/DashboardSidebar";
import { TeacherAttendanceSessionPanel } from "@/features/teacher/components/TeacherAttendanceSessionPanel";

export default function TeacherAttendanceQrPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main
        className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}
      >
        <div className="container mx-auto px-6 max-w-3xl">
          <Link
            to="/dashboard/teacher"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Teacher Dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Attendance QR</h1>
            <p className="text-foreground/60 text-sm mt-1">
              Select the class and the planned session from the schedule, then generate a QR. When you stop the session,
              that meeting is marked held for student enrollment. Use projector view for full screen. Students sign in to
              check in.
            </p>
          </div>

          <TeacherAttendanceSessionPanel />
        </div>
      </main>
    </div>
  );
}
