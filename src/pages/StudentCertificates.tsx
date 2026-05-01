import { useState, useEffect } from "react";
import { Award, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";

const CERTIFICATES = [
  { id: 1, title: "Business Fundamentals", course: "Business Management Fundamentals", date: "2024-11-20", score: "92%" },
  { id: 2, title: "Data Analysis with Excel", course: "Data Analysis with Excel", date: "2024-08-15", score: "95%" },
  { id: 3, title: "Digital Marketing Essentials", course: "Digital Marketing Essentials", date: "2024-10-01", score: "88%" },
  { id: 4, title: "Introduction to Economics", course: "Introduction to Economics", date: "2024-09-30", score: "90%" },
];

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const StudentCertificates = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h1 className="mb-2 font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px", fontSize: "32px" }}>
              Certificates
            </h1>
            <p className="text-foreground/70 text-sm">Certificates you have earned from completed classes.</p>
            <div className="mt-4">
              <span className="rounded-full bg-green-50 px-4 py-2 text-green-700 font-medium text-sm">{CERTIFICATES.length} certificates earned</span>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {CERTIFICATES.map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                  {c.title}
                </h3>
                <p className="text-sm text-foreground/60 mt-0.5 flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {c.course}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-foreground/60">Completed {formatDate(c.date)} · Score {c.score}</span>
                  <Button size="sm" variant="outline" className="rounded-full">
                    <Download className="mr-1.5 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentCertificates;
