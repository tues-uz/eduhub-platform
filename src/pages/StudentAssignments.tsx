import { useState, useEffect } from "react";
import { FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";

const ASSIGNMENTS = [
  { id: 1, title: "Economic Analysis Essay", course: "Introduction to Economics", dueDate: "2025-02-15", status: "pending", priority: "high" },
  { id: 2, title: "Marketing Campaign Proposal", course: "Digital Marketing Essentials", dueDate: "2025-02-18", status: "in-progress", priority: "medium" },
  { id: 3, title: "Financial Report Review", course: "Financial Accounting", dueDate: "2025-02-20", status: "pending", priority: "low" },
  { id: 4, title: "Strategic Planning Case Study", course: "Business Management Fundamentals", dueDate: "2025-02-25", status: "pending", priority: "medium" },
  { id: 5, title: "Business Writing Assignment", course: "English for Business", dueDate: "2025-03-01", status: "pending", priority: "low" },
];

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const getDaysUntilDue = (dateString: string) => {
  const diff = new Date(dateString).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const StudentAssignments = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  const pendingCount = ASSIGNMENTS.filter((a) => a.status === "pending").length;
  const inProgressCount = ASSIGNMENTS.filter((a) => a.status === "in-progress").length;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h1 className="mb-2 font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px", fontSize: "32px" }}>
              Assignments
            </h1>
            <p className="text-foreground/70 text-sm">View and complete your course assignments.</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-amber-50 px-4 py-2 text-amber-700 font-medium">{pendingCount} pending</span>
              <span className="rounded-full bg-blue-50 px-4 py-2 text-blue-700 font-medium">{inProgressCount} in progress</span>
            </div>
          </div>
          <div className="space-y-4">
            {ASSIGNMENTS.map((a) => {
              const days = getDaysUntilDue(a.dueDate);
              const isUrgent = days <= 3 && days >= 0;
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-6 transition-shadow hover:shadow-md ${isUrgent ? "border-red-200 bg-red-50/30" : "border-gray-200/50 bg-white/80"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100">
                        <FileText className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                          {a.title}
                        </h3>
                        <p className="text-sm text-foreground/60 mt-0.5">{a.course}</p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-foreground/60">
                          <Calendar className="h-4 w-4" />
                          Due {formatDate(a.dueDate)}
                          {days >= 0 && days <= 7 && (
                            <span className={isUrgent ? "text-red-600 font-medium" : "text-foreground/70"}>
                              ({days} {days === 1 ? "day" : "days"} left)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                          a.priority === "high" ? "bg-red-100 text-red-700" : a.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {a.priority}
                      </span>
                      <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${a.status === "in-progress" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {a.status === "in-progress" ? "In Progress" : "Pending"}
                      </span>
                      <Button size="sm" className="rounded-full" style={{ backgroundColor: "#3954d0" }}>
                        {a.status === "in-progress" ? "Continue" : "Start"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentAssignments;
