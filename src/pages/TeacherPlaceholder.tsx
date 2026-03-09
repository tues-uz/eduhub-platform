import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";

const SECTION_TITLES: Record<string, string> = {
  courses: "My Courses",
  assignments: "Assignments",
  students: "Students",
  schedule: "Schedule",
  settings: "Settings",
};

const TeacherPlaceholder = () => {
  const location = useLocation();
  const segment = location.pathname.split("/").pop() ?? "";
  const title = SECTION_TITLES[segment] ?? "Teacher";

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
      <DashboardSidebar />
      <main className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6">
          <Link to="/dashboard/teacher" className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Teacher Dashboard
          </Link>
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Geist Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}>
              {title}
            </h1>
            <p className="text-foreground/60 mb-6">This section is coming soon.</p>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/dashboard/teacher">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherPlaceholder;
