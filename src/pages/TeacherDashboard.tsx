import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Users,
  Calendar,
  Clock,
  MoreHorizontal,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import { eduhubCourses } from "@/api/eduhubClient";
import type { TeacherCourse } from "@/features/teacher/types";

const TeacherDashboard = () => {
  const { user } = useAuthSession();
  const userName = user.name || "Teacher";
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setCoursesLoading(true);
      const local = teacherCoursesStore.getAll();
      if (user.id) {
        try {
          const res = await eduhubCourses.getByLecturer(user.id);
          const apiCourses: TeacherCourse[] = (res.content || []).map((c) => ({
            id: c.id,
            title: c.title,
            description: "",
            instructorName: c.lecturerName,
            lessons: [],
            createdAt: c.createdAt,
            updatedAt: c.createdAt,
          }));
          if (!cancelled) setCourses([...apiCourses, ...local]);
        } catch {
          if (!cancelled) setCourses(local);
        }
      } else {
        if (!cancelled) setCourses(local);
      }
      if (!cancelled) setCoursesLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user.id]);

  const courseCount = courses.length;
  const stats = [
    { icon: BookOpen, label: "Active Courses", value: String(courseCount), change: "", trend: "up" as const, color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200", href: "/dashboard/teacher/courses" },
    { icon: Users, label: "Total Students", value: "—", change: "", trend: "up" as const, color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200", href: "/dashboard/teacher/students" },
    { icon: FileText, label: "Pending Grading", value: "—", change: "", trend: "up" as const, color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200", href: "/dashboard/teacher/assignments" },
  ];

  const pendingGrading = [
    { id: 1, assignment: "Economic Analysis Essay", course: "Introduction to Economics", student: "Sevinch", submitted: "2 hours ago", priority: "high" },
    { id: 2, assignment: "Market Report", course: "Microeconomics", student: "Ahmed H.", submitted: "5 hours ago", priority: "medium" },
    { id: 3, assignment: "Case Study Draft", course: "Business Management", student: "Maria G.", submitted: "1 day ago", priority: "low" },
  ];

  const upcomingClasses = [
    { title: "Introduction to Economics — Lesson 5", time: "Today, 2:00 PM", type: "Live", location: "Room 201" },
    { title: "Office Hours", time: "Tomorrow, 10:00 AM", type: "Q&A", location: "Virtual" },
  ];

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
      <DashboardSidebar />
      <main className={`pt-16 lg:pt-8 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6">
          {/* Professional Header */}
          <div className="mb-8 pb-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900 mb-1.5 tracking-tight">
                  {userName}
                </h1>
                <p className="text-slate-600 text-sm font-medium">
                  Instructor Dashboard
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md uppercase tracking-wide">
                  Teacher
                </span>
              </div>
            </div>
          </div>

          {/* Professional Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              const cardContent = (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${stat.bgColor} p-2.5 rounded-md border ${stat.borderColor}`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    {stat.change ? (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        stat.trend === "up" ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {stat.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                        {stat.change}
                      </div>
                    ) : null}
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">{stat.label}</p>
                </>
              );
              const className = "bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 hover:shadow-sm transition-all block";
              return stat.href ? (
                <Link key={i} to={stat.href} className={className}>
                  {cardContent}
                </Link>
              ) : (
                <div key={i} className={className}>
                  {cardContent}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Main Content - Professional Table Layout */}
            <div className="space-y-6">
              {/* Upcoming Classes */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Upcoming Sessions
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {upcomingClasses.map((item, i) => (
                      <div key={i} className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-5 w-5 text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 mb-1">{item.title}</p>
                            <p className="text-xs text-slate-600 mb-2">{item.time}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {item.type}
                              </span>
                              <span className="text-xs text-slate-500">{item.location}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Courses Table */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Teaching Courses
                  </h2>
                  <Link to="/dashboard/teacher/courses">
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 h-8">
                      View All <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Course</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Students</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Progress</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Completion</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {coursesLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                            Loading courses…
                          </td>
                        </tr>
                      ) : courses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                            No courses yet. <Link to="/dashboard/teacher/courses/new" className="text-slate-900 font-medium underline">Create your first course</Link>
                          </td>
                        </tr>
                      ) : (
                        courses.map((course) => (
                          <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <Link to={`/dashboard/teacher/courses/${course.id}/edit`} className="flex items-center gap-3 hover:opacity-90">
                                <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                                  <BookOpen className="h-5 w-5 text-slate-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 text-sm">{course.title}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{course.lessons.length} lessons</p>
                                </div>
                              </Link>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-500">—</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-500">—</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-500">—</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to={`/dashboard/teacher/courses/${course.id}/edit`}>Edit Course</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link to="/dashboard/teacher/students">Manage Students</Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending Grading - Professional Card Layout */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Pending Grading
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Review and grade student submissions</p>
                  </div>
                  <Link to="/dashboard/teacher/assignments">
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 h-8">
                      View All <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
                <div className="divide-y divide-slate-200">
                  {pendingGrading.map((item) => (
                    <div
                      key={item.id}
                      className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 text-sm">{item.assignment}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.priority === "high" ? "bg-red-50 text-red-700" :
                            item.priority === "medium" ? "bg-yellow-50 text-yellow-700" :
                            "bg-slate-50 text-slate-700"
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mb-1">{item.course}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {item.student}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.submitted}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-8 px-4">
                        Grade
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
