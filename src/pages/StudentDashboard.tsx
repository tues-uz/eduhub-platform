import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Award,
  TrendingUp,
  Calendar,
  CheckCircle2,
  PlayCircle,
  BarChart3,
  Target,
  Bell,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { useLayoutContext } from "@/features/layout/context";
import { studentStats } from "@/features/student/data/dashboardData";
import { useStudentCoursesQuery, useStudentOverviewQuery } from "@/features/student/hooks/useStudentQueries";
import { formatDisplayPersonName } from "@/lib/formatPersonName";

const StudentDashboard = () => {
  const { user } = useAuthSession();
  const { isSidebarCollapsed } = useLayoutContext();
  const { data } = useStudentOverviewQuery();
  const { data: enrolledCourses = [] } = useStudentCoursesQuery();
  const displayName = formatDisplayPersonName(user.name);

  const statCards = useMemo(() => {
    const base = (data?.stats ?? [...studentStats]).map((s) => ({ ...s }));
    const assignmentCount = data?.assignments?.length ?? 0;
    const courseCount = enrolledCourses.length;
    const avgProgress =
      courseCount > 0
        ? Math.round(
            enrolledCourses.reduce((sum, c) => sum + (typeof c.progress === "number" ? c.progress : 0), 0) /
              courseCount,
          )
        : null;

    return base.map((stat) => {
      if (stat.label === "Classes enrolled") {
        return { ...stat, value: String(courseCount) };
      }
      if (stat.label === "Assignments") {
        return { ...stat, value: String(assignmentCount) };
      }
      if (stat.label === "Progress" && avgProgress != null) {
        return { ...stat, value: `${avgProgress}%` };
      }
      return stat;
    });
  }, [data?.stats, data?.assignments?.length, enrolledCourses]);
  const courses = data?.courses ?? [];
  const assignments = data?.assignments ?? [];
  const recentActivity = data?.recentActivity ?? [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getDaysUntilDue = (dateString: string) => {
    const today = new Date();
    const dueDate = new Date(dateString);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const notifications = data?.notifications ?? [];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <DashboardSidebar />
      
      <main className={`min-h-[calc(100dvh-4rem)] lg:min-h-dvh pt-16 lg:pt-5 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6">
          {/* Dashboard Header */}
          <div className="mb-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1
                  className="mb-2 text-[32px] font-bold tracking-wide text-foreground"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px" }}
                >
                  Hi {displayName}, Welcome Back
                </h1>
                <p className="text-foreground/70" style={{ fontSize: '14px' }}>Here's what's happening with your classes today</p>
              </div>
              
              {/* Notification Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full relative border border-black/24 hover:bg-gray-100"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-6 w-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-semibold border-2 border-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto rounded-2xl p-4">
                  <div className="p-0">
                    <div className="flex items-center justify-between mb-3 px-0">
                      <h3 className="font-semibold text-sm" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: '0.5px' }}>Notifications</h3>
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-6 px-0">
                          Mark all as read
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            notification.unread ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex-shrink-0 ${
                              notification.type === "assignment" ? "text-purple-500" :
                              notification.type === "class" ? "text-blue-500" :
                              notification.type === "certificate" ? "text-orange-500" :
                              "text-gray-500"
                            }`}>
                              {notification.type === "assignment" && <FileText className="h-4 w-4" />}
                              {notification.type === "class" && <BookOpen className="h-4 w-4" />}
                              {notification.type === "certificate" && <Award className="h-4 w-4" />}
                              {notification.type === "announcement" && <AlertCircle className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${notification.unread ? "text-foreground" : "text-foreground/70"}`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-foreground/60 mt-1">{notification.message}</p>
                                  <p className="text-xs text-foreground/50 mt-1 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {notification.time}
                                  </p>
                                </div>
                                {notification.unread && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {notifications.length === 0 && (
                      <div className="text-center py-8 text-sm text-foreground/60">
                        No notifications
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Link to="/dashboard/notifications">
                        <Button size="sm" className="w-full rounded-full text-sm" style={{ backgroundColor: "#3954d0" }}>
                          View all notifications
                        </Button>
                      </Link>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                const href = "href" in stat && typeof stat.href === "string" ? stat.href : "/dashboard";
                return (
                  <Link
                    key={stat.label}
                    to={href}
                    className="group bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-200/50 transition-all hover:shadow-md hover:border-[#3954d0]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3954d0] focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.bgColor} p-3 rounded-full transition-colors group-hover:opacity-90`}>
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
                      <p className="text-sm text-foreground/70">{stat.label}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Class section */}
            <div className="lg:col-span-2 space-y-6">
              {/* My Class */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: '0.5px' }}>My Class</h2>
                  <Link to="/eduhub">
<Button variant="outline" className="text-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200">
                    View All
                  </Button>
                  </Link>
                </div>
                <div className="space-y-4">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="p-4 rounded-lg border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer bg-gradient-to-r from-white to-gray-50/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-foreground mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: '0.3px' }}>{course.title}</h3>
                              <p className="text-sm text-foreground/60">{course.instructor}</p>
                            </div>
                            <span className="py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                              {course.status}
                            </span>
                          </div>
                          <div className="mb-6">
                            <div className="flex items-center justify-between text-xs text-foreground/60 mb-1">
                              <span>Progress</span>
                              <span className="font-extrabold">{course.progress}%</span>
                            </div>
                            <Progress value={course.progress} className="h-2 bg-gray-200" />
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-foreground/70">
                              <PlayCircle className="h-4 w-4" />
                              <span>Next: {course.nextLesson}</span>
                            </div>
                            <Button
                              size="sm"
                              className="ml-auto rounded-full"
                              style={{ backgroundColor: '#3954d0' }}
                            >
                              Continue Learning
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Assignments */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: '0.5px' }}>Upcoming Assignments</h2>
                  <Button variant="outline" className="text-sm">
                    View Calendar
                  </Button>
                </div>
                <div className="space-y-3">
                  {assignments.map((assignment) => {
                    const daysUntil = getDaysUntilDue(assignment.dueDate);
                    const isUrgent = daysUntil <= 3;
                    return (
                      <div
                        key={assignment.id}
                        className={`p-4 rounded-lg border ${
                          isUrgent ? "border-red-200 bg-red-50/50" : "border-gray-200 bg-white"
                        } hover:shadow-md transition-all`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: '0.3px' }}>{assignment.title}</h3>
                            <p className="text-sm text-foreground/60">{assignment.course}</p>
                          </div>
                          <span
                            className={`py-1 text-xs font-medium rounded-full ${
                              assignment.priority === "high"
                                ? "bg-red-100 text-red-700"
                                : assignment.priority === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                            style={{ paddingLeft: '12px', paddingRight: '12px' }}
                          >
                            {assignment.priority}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2 text-sm text-foreground/70">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {formatDate(assignment.dueDate)}</span>
                            {isUrgent && (
                              <span className="text-red-600 font-medium">
                                ({daysUntil} {daysUntil === 1 ? "day" : "days"} left)
                              </span>
                            )}
                          </div>
                          <Button size="sm" variant="outline" className="rounded-full">
                            {assignment.status === "in-progress" ? "Continue" : "Start"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 p-6">
                <h2 className="text-xl font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: '0.5px' }}>Quick Actions</h2>
                <div className="space-y-2">
                  <Button className="w-full justify-start rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" variant="outline">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse classes
                  </Button>
                  <Button className="w-full justify-start rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    My Assignments
                  </Button>
                  <Button className="w-full justify-start rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" variant="outline">
                    <Award className="h-4 w-4 mr-2" />
                    Certificates
                  </Button>
                  <Button className="w-full justify-start rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Progress
                  </Button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 p-6">
                <h2 className="text-xl font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: '0.5px' }}>Recent Activity</h2>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        {activity.type === "completed" && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                        {activity.type === "assignment" && <FileText className="h-4 w-4 text-purple-600" />}
                        {activity.type === "certificate" && <Award className="h-4 w-4 text-orange-600" />}
                        {activity.type === "enrolled" && <BookOpen className="h-4 w-4 text-green-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{activity.text}</p>
                        <p className="text-xs text-foreground/60 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Overview */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-6 w-6" />
                  <h2 className="text-xl font-bold" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: '0.5px' }}>Overall Progress</h2>
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Completion Rate</span>
                    <span className="text-2xl font-bold">78%</span>
                  </div>
                  <Progress value={78} className="h-3 bg-white/20" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm opacity-90">Classes completed</p>
                    <p className="text-2xl font-bold">9/12</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Avg. Score</p>
                    <p className="text-2xl font-bold">92%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
