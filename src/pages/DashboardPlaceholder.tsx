import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, Award, BarChart3, Calendar, Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";

const PLACEHOLDER_CONFIG: Record<string, { icon: typeof FileText; title: string }> = {
  assignments: { icon: FileText, title: "Assignments" },
  certificates: { icon: Award, title: "Certificates" },
  progress: { icon: BarChart3, title: "Progress" },
  schedule: { icon: Calendar, title: "Schedule" },
  settings: { icon: Settings, title: "Settings" },
};

const DashboardPlaceholder = () => {
  const location = useLocation();
  const section = location.pathname.split("/").filter(Boolean).pop() ?? "";
  const config = PLACEHOLDER_CONFIG[section] ?? { icon: FileText, title: "Page" };
  const Icon = config.icon;
  const title = config.title;

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
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6">
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Icon className="h-8 w-8 text-foreground/50" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
              {title}
            </h1>
            <p className="mb-6 max-w-sm text-foreground/60">This section is coming soon.</p>
            <Link to="/dashboard">
              <Button variant="outline" className="rounded-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPlaceholder;
