import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Users,
  Calendar,
  Clock,
  MoreHorizontal,
  ArrowRight,
  QrCode,
  CircleDollarSign,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";
import type { TeacherCourse } from "@/features/teacher/types";
import { useAdminPayments } from "@/features/admin/data/adminPaymentsStore";
import type { AdminPaymentRow } from "@/features/admin/data/adminOperationalMock";
import { useTeacherCoursesQuery, useTeacherStatsQuery } from "@/features/teacher/hooks/useTeacherQueries";

/** Sum of (catalog tuition × enrolled students) per currency for dashboard. */
/** Seat counts from course rows when lecturer stats API is unavailable. */
function sumEnrollmentSeats(courses: TeacherCourse[]): number {
  return courses.reduce((n, c) => n + (c.enrollmentCount ?? 0), 0);
}

function formatEnrollmentRevenueTotal(courses: TeacherCourse[]): string {
  const byCurrency = new Map<string, number>();
  for (const c of courses) {
    const seats = c.enrollmentCount ?? 0;
    const unit = c.price;
    if (seats <= 0 || unit == null || unit <= 0) continue;
    const cur = (c.priceCurrency ?? "USD").trim() || "USD";
    byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + unit * seats);
  }
  if (byCurrency.size === 0) return "—";
  return [...byCurrency.entries()]
    .map(([currency, amount]) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount),
    )
    .join(" · ");
}

function paymentMatchesInstructor(p: AdminPaymentRow, emailNorm: string, nameNorm: string): boolean {
  const le = (p.lecturerEmail ?? "").trim().toLowerCase();
  const ln = (p.lecturerName ?? "").trim().toLowerCase();
  if (emailNorm && le && le === emailNorm) return true;
  if (nameNorm && ln && ln === nameNorm) return true;
  return false;
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function formatCollectedPaymentsTotal(payments: AdminPaymentRow[], emailNorm: string, nameNorm: string): string {
  const byCurrency = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "paid") continue;
    if (!paymentMatchesInstructor(p, emailNorm, nameNorm)) continue;
    const cur = (p.currency ?? "USD").trim() || "USD";
    byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + p.amount);
  }
  if (byCurrency.size === 0) return "—";
  return [...byCurrency.entries()]
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(" · ");
}

const TeacherDashboard = () => {
  const { user } = useAuthSession();
  const payments = useAdminPayments();
  const userName = user.name || "Teacher";
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });

  const { data: apiCourses = [], isLoading: apiCoursesLoading } = useTeacherCoursesQuery(user.id);
  const { data: lecturerStats } = useTeacherStatsQuery();

  const courses = useMemo(() => {
    const local = teacherCoursesStore.getAll();
    return [...apiCourses, ...local];
  }, [apiCourses]);
  const coursesLoading = apiCoursesLoading && apiCourses.length === 0;

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    check();
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  const courseCount = courses.length;
  const collectedPaymentsDisplay = useMemo(
    () => formatCollectedPaymentsTotal(payments, user.email.trim().toLowerCase(), (user.name ?? "").trim().toLowerCase()),
    [payments, user.email, user.name],
  );
  const seatsFromCourses = useMemo(() => sumEnrollmentSeats(courses), [courses]);

  const totalStudentsDisplay = useMemo(() => {
    if (lecturerStats != null) return String(lecturerStats.totalStudents);
    if (seatsFromCourses > 0) return String(seatsFromCourses);
    return "—";
  }, [lecturerStats, seatsFromCourses]);

  const statsData = useMemo(
    () =>
      [
        {
          icon: BookOpen,
          label: "Active classes",
          value: String((lecturerStats?.totalCourses ?? 0) || courseCount),
          href: "/dashboard/teacher/courses",
        },
        {
          icon: Users,
          label: "Total students",
          value: totalStudentsDisplay,
          href: "/dashboard/teacher/students",
        },
        {
          icon: FileText,
          label: "Pending grading",
          value: lecturerStats != null ? String(lecturerStats.pendingGrading) : "—",
          href: "/dashboard/teacher/assignments",
        },
        {
          icon: CircleDollarSign,
          label: "Collected payments",
          value: collectedPaymentsDisplay,
          valueClassName: "text-xl sm:text-2xl break-words leading-snug",
          href: "/dashboard/teacher/payroll",
        },
      ] as const,
    [lecturerStats, courseCount, collectedPaymentsDisplay, totalStudentsDisplay],
  );

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
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      <main className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
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

          {/* Stats — minimal metric cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {statsData.map((stat, i) => {
              const Icon = stat.icon;
              const valClass =
                "valueClassName" in stat && stat.valueClassName
                  ? stat.valueClassName
                  : "text-3xl tabular-nums";
              const cardClass =
                "block rounded-xl border border-slate-200/90 bg-white px-4 py-4 transition-colors hover:border-slate-300 hover:bg-slate-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400";
              const cardContent = (
                <>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
                      {stat.label}
                    </span>
                  </div>
                  <p className={`mt-3 font-semibold tracking-tight text-slate-900 ${valClass}`}>{stat.value}</p>
                </>
              );
              return stat.href ? (
                <Link key={i} to={stat.href} className={cardClass}>
                  {cardContent}
                </Link>
              ) : (
                <div key={i} className={cardClass}>
                  {cardContent}
                </div>
              );
            })}
          </div>

          <Link
            to="/dashboard/teacher/attendance"
            className="flex items-center gap-4 mb-8 rounded-xl border border-[#1e40af]/20 bg-[#1e40af]/5 p-5 hover:bg-[#1e40af]/10 transition-colors"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#1e40af]/15">
              <QrCode className="h-6 w-6 text-[#1e40af]" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-slate-900">Attendance QR (projector)</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Generate a session QR code to show on the whiteboard—students scan to check in on their phones.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-[#1e40af] shrink-0" />
          </Link>

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

              {/* Classes table */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Teaching classes
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
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Class</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Students</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Progress</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Completion</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {coursesLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-500">
                            Loading classes…
                          </td>
                        </tr>
                      ) : courses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-500">
                            No classes yet. <Link to="/dashboard/teacher/courses/new" className="text-slate-900 font-medium underline">Create your first class</Link>
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
                                  <p className="font-semibold text-slate-900 text-xs">{course.title}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{course.lessons.length} lessons</p>
                                </div>
                              </Link>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-500">—</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-500">—</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-500">—</span>
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
                                    <Link to={`/dashboard/teacher/courses/${course.id}/edit`}>Edit class</Link>
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
