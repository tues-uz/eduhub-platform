import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  PlayCircle,
  Search,
  User,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import DashboardSidebar from "@/components/DashboardSidebar";

// Enrolled courses for the logged-in user
const ENROLLED_COURSES = [
  {
    id: 1,
    title: "Introduction to Economics",
    instructor: "Dr. Dilshod Karimov",
    progress: 75,
    status: "In Progress",
    nextLesson: "Market Structures",
    category: "Business",
    duration: "8 weeks",
    modules: 12,
    enrolledDate: "2024-09-01",
  },
  {
    id: 2,
    title: "Business Management Fundamentals",
    instructor: "Prof. Sarah Johnson",
    progress: 45,
    status: "In Progress",
    nextLesson: "Strategic Planning",
    category: "Management",
    duration: "10 weeks",
    modules: 14,
    enrolledDate: "2024-10-15",
  },
  {
    id: 3,
    title: "Digital Marketing Essentials",
    instructor: "Dr. Ahmed Hassan",
    progress: 90,
    status: "Almost Complete",
    nextLesson: "Final Project",
    category: "Marketing",
    duration: "6 weeks",
    modules: 8,
    enrolledDate: "2024-08-20",
  },
  {
    id: 4,
    title: "Financial Accounting",
    instructor: "Prof. Maria Garcia",
    progress: 30,
    status: "In Progress",
    nextLesson: "Balance Sheets",
    category: "Finance",
    duration: "12 weeks",
    modules: 16,
    enrolledDate: "2024-11-01",
  },
  {
    id: 5,
    title: "English for Business",
    instructor: "Ms. Elena Petrova",
    progress: 60,
    status: "In Progress",
    nextLesson: "Writing Reports",
    category: "Language",
    duration: "8 weeks",
    modules: 10,
    enrolledDate: "2024-09-15",
  },
  {
    id: 6,
    title: "Data Analysis with Excel",
    instructor: "Dr. James Wilson",
    progress: 100,
    status: "Completed",
    nextLesson: "—",
    category: "Analytics",
    duration: "6 weeks",
    modules: 8,
    enrolledDate: "2024-07-01",
  },
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

type StatusFilter = "all" | "In Progress" | "Almost Complete" | "Completed";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "In Progress", label: "In Progress" },
  { value: "Almost Complete", label: "Almost Complete" },
  { value: "Completed", label: "Completed" },
];

const StudentCourses = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const checkSidebarState = () => {
      const saved = localStorage.getItem("sidebarCollapsed");
      setIsSidebarCollapsed(saved === "true");
    };
    checkSidebarState();
    const interval = setInterval(checkSidebarState, 100);
    return () => clearInterval(interval);
  }, []);

  const filteredCourses = ENROLLED_COURSES.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const inProgressCount = ENROLLED_COURSES.filter((c) => c.status !== "Completed").length;
  const completedCount = ENROLLED_COURSES.filter((c) => c.status === "Completed").length;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />

      <main className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="mb-2 font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px", fontSize: "32px" }}>
                  My Courses
                </h1>
                <p className="text-foreground/70" style={{ fontSize: "14px" }}>
                  Information about the courses you are enrolled in. Continue learning or review completed courses.
                </p>
              </div>
              <Link to="/eduhub">
                <Button className="rounded-full" style={{ backgroundColor: "#3954d0" }}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse More Courses
                </Button>
              </Link>
            </div>

            {/* Summary stats */}
            <div className="mb-6 flex flex-wrap gap-4 text-sm">
              <span className="rounded-full bg-blue-50 px-4 py-2 text-blue-700 font-medium">
                {ENROLLED_COURSES.length} total enrolled
              </span>
              <span className="rounded-full bg-amber-50 px-4 py-2 text-amber-700 font-medium">
                {inProgressCount} in progress
              </span>
              <span className="rounded-full bg-green-50 px-4 py-2 text-green-700 font-medium">
                {completedCount} completed
              </span>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                type="search"
                placeholder="Search by course name, instructor, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-lg border-gray-200 pl-10"
              />
            </div>
          </div>

          {/* Status filter + count side by side */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={statusFilter === value ? "default" : "outline"}
                  size="sm"
                  className={`rounded-full text-xs px-5 ${statusFilter !== value ? "hover:bg-gray-100 hover:border-gray-200" : ""}`}
                  style={statusFilter === value ? { backgroundColor: "#3954d0" } : undefined}
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-foreground/60">
              {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} found
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all hover:border-gray-300/50 hover:shadow-md"
              >
                <div className="mb-4 flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    {course.category && (
                      <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                        {course.category}
                      </span>
                    )}
                    <h3 className="mt-0.5 mb-1 font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.3px" }}>
                      {course.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-foreground/60">
                      <User className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{course.instructor}</span>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                      course.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : course.status === "Almost Complete"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {course.status}
                  </span>
                </div>

                {/* Course info */}
                <div className="mb-4 flex flex-wrap gap-3 text-xs text-foreground/60">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {course.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {course.modules} modules
                  </span>
                  <span>Enrolled {formatDate(course.enrolledDate)}</span>
                </div>

                <div className="mb-4 flex-1">
                  <div className="mb-2 flex items-center justify-between text-xs text-foreground/60">
                    <span>Progress</span>
                    <span className="font-bold text-foreground">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-2 bg-gray-200" />
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-sm text-foreground/70">
                    <PlayCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Next: {course.nextLesson}</span>
                  </div>
                  <Link to={`/dashboard/courses/${course.id}`}>
                    <Button
                      size="sm"
                      className="flex-shrink-0 rounded-full"
                      style={{ backgroundColor: "#3954d0" }}
                    >
                      {course.status === "Completed" ? "Review" : "Continue"}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {filteredCourses.length === 0 && (
            <div className="rounded-xl border border-gray-200/50 bg-white/50 py-16 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-foreground/30" />
              <p className="font-medium text-foreground/70">No courses match your filters.</p>
              <p className="mt-1 text-sm text-foreground/50">Try a different search or status filter.</p>
              <Button
                variant="outline"
                className="mt-4 rounded-full"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentCourses;
