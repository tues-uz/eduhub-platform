import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Award,
  BarChart3,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ListChecks,
  Users,
  GraduationCap,
  UserPlus,
  Receipt,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const DashboardSidebar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get user info and role from localStorage
  const userName = localStorage.getItem("userName") || "Demo User";
  const userEmail = localStorage.getItem("userEmail") || "demo@eduhub.com";
  const userRole = (localStorage.getItem("userRole") || "student") as "student" | "admin" | "teacher";

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
    document.documentElement.style.setProperty("--sidebar-width", newState ? "80px" : "256px");
  };

  const studentMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BookOpen, label: "My Courses", path: "/dashboard/courses" },
    { icon: ListChecks, label: "Placement Test", path: "/dashboard/assignments" },
    { icon: ClipboardList, label: "Quiz", path: "/dashboard/quiz" },
    { icon: Award, label: "Certificates", path: "/dashboard/certificates" },
    { icon: Bell, label: "Notifications", path: "/dashboard/notifications" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  const adminMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/admin" },
    { icon: GraduationCap, label: "All Student", path: "/dashboard/admin/students" },
    { icon: GraduationCap, label: "All Teacher", path: "/dashboard/admin/teachers" },
    { icon: Briefcase, label: "All Staff", path: "/dashboard/admin/staff" },
    { icon: BookOpen, label: "All Course", path: "/dashboard/admin/courses" },
    { icon: UserPlus, label: "Add User Role", path: "/dashboard/admin/add-user-role" },
    { icon: Receipt, label: "Transaction", path: "/dashboard/admin/transactions" },
    { icon: BarChart3, label: "Report", path: "/dashboard/admin/reports" },
    { icon: Settings, label: "Settings", path: "/dashboard/admin/settings" },
  ];

  type TeacherMenuItem =
    | { icon: typeof LayoutDashboard; label: string; path: string }
    | { icon: typeof LayoutDashboard; label: string; children: { label: string; path: string }[] };
  const teacherMenuItems: TeacherMenuItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/teacher" },
    { icon: GraduationCap, label: "All Student", path: "/dashboard/teacher/students" },
    {
      icon: BookOpen,
      label: "Course",
      children: [
        { label: "Add new course", path: "/dashboard/teacher/courses/new" },
        { label: "Add placement test", path: "/dashboard/teacher/placement-test" },
      ],
    },
    { icon: Calendar, label: "Schedule", path: "/dashboard/teacher/schedule" },
    { icon: Settings, label: "Settings", path: "/dashboard/teacher/settings" },
  ];

  const menuItems =
    userRole === "admin" ? adminMenuItems :
    userRole === "teacher" ? teacherMenuItems :
    studentMenuItems;

  const dashboardHome =
    userRole === "admin" ? "/dashboard/admin" :
    userRole === "teacher" ? "/dashboard/teacher" : "/dashboard";

  const handleLogout = () => {
    navigate("/signin");
  };

  const isActive = (path: string) => {
    if (path === "/dashboard" || path === "/dashboard/admin" || path === "/dashboard/teacher") {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  // Role-based styling - Professional design for teacher and admin
  const isProfessionalRole = userRole === "teacher" || userRole === "admin";
  const sidebarBg = isProfessionalRole ? "bg-slate-900" : "bg-white/95 backdrop-blur-md";
  const sidebarBorder = isProfessionalRole ? "border-slate-800" : "border-gray-200";
  const logoFont = isProfessionalRole ? "'Inter', 'Segoe UI', system-ui, sans-serif" : "'Comfortaa', cursive";
  const logoTextFont = isProfessionalRole ? "'Inter', 'Segoe UI', system-ui, sans-serif" : "'Fredoka One', cursive";
  const userCardBg = isProfessionalRole ? "bg-slate-800 border border-slate-700" : "bg-gradient-to-br from-blue-50 to-blue-100";
  const userAvatarBg = isProfessionalRole ? "bg-slate-700" : "bg-gradient-to-br from-blue-500 to-blue-600";
  const activeBg = isProfessionalRole ? "bg-slate-800 text-white" : "bg-blue-50 text-blue-600";
  const inactiveText = isProfessionalRole ? "text-slate-300" : "text-foreground/70";
  const inactiveHover = isProfessionalRole ? "hover:bg-slate-800 hover:text-white" : "hover:bg-gray-100 hover:text-foreground";
  const logoutHover = isProfessionalRole ? "hover:text-red-400 hover:bg-slate-800" : "hover:text-red-600 hover:bg-red-50";
  const toggleButtonBg = isProfessionalRole ? "bg-slate-900 hover:bg-slate-800 border-slate-800" : "bg-white hover:bg-gray-100 border-black/32";

  return (
    <div style={{ fontFamily: logoFont }}>
      {/* Mobile Header */}
      <header className={`lg:hidden fixed top-0 left-0 right-0 z-50 ${isProfessionalRole ? "bg-slate-900 border-slate-800" : "bg-white/95 backdrop-blur-md border-gray-200"} shadow-sm border-b`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={dashboardHome} className="flex items-center">
              <img 
                src="/logo-eduhub.png" 
                alt="EduHub Logo" 
                className="h-8 w-auto object-contain"
              />
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className={`rounded-full ${isProfessionalRole ? "text-slate-300 hover:text-white hover:bg-slate-800" : ""}`}>
                <Bell className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`rounded-full ${isProfessionalRole ? "text-slate-300 hover:text-white hover:bg-slate-800" : ""}`}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen ${sidebarBg} border-r ${sidebarBorder} z-30 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className={`p-4 relative ${isProfessionalRole ? "border-b border-slate-800" : ""}`}>
            <div className="flex items-center gap-2 mb-4">
              <Link to={dashboardHome} className={`flex items-center gap-3 flex-1 ${isCollapsed ? "justify-center" : ""}`}>
                <img 
                  src="/logo-eduhub.png" 
                  alt="EduHub Logo" 
                  className={`${isCollapsed ? "h-8" : "h-10"} w-auto object-contain`}
                />
                {!isCollapsed && (
                  <span className={`text-lg font-bold ${isProfessionalRole ? "text-white" : "text-foreground"}`} style={{ fontFamily: logoTextFont, fontWeight: isProfessionalRole ? 600 : 400, letterSpacing: isProfessionalRole ? '0' : '0.5px' }}>
                    EduHub
                  </span>
                )}
              </Link>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className={`hidden lg:flex h-8 w-8 rounded-full ${toggleButtonBg} absolute top-4 -right-4 border z-10 ${isProfessionalRole ? "text-slate-300 hover:text-white" : ""}`}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* User Profile Section */}
          <div className={`p-4 ${isProfessionalRole ? "border-b border-slate-800" : ""}`}>
            <div className={`flex items-center gap-3 p-3 rounded-lg ${userCardBg} ${isCollapsed ? "justify-center" : ""}`}>
              <div className={`${isCollapsed ? "w-8 h-8" : "w-10 h-10"} rounded-lg ${userAvatarBg} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                <User className={isCollapsed ? "h-4 w-4" : "h-5 w-5"} />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isProfessionalRole ? "text-white" : "text-foreground"}`}>{userName}</p>
                  <p className={`text-xs truncate ${isProfessionalRole ? "text-slate-400" : "text-foreground/60"}`}>{userEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {userRole === "teacher"
                ? (teacherMenuItems as TeacherMenuItem[]).map((item) => {
                    const Icon = item.icon;
                    if ("path" in item) {
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all ${
                            isCollapsed ? "justify-center" : ""
                          } ${
                            active
                              ? `${activeBg} font-semibold`
                              : `${inactiveText} ${inactiveHover}`
                          }`}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-sm font-medium" style={{ fontSize: "14px" }}>{item.label}</span>}
                        </Link>
                      );
                    }
                    return (
                      <Collapsible key={item.label} defaultOpen={item.children.some((c) => isActive(c.path))} className="group/course">
                        <CollapsibleTrigger
                          className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-md transition-all ${
                            isCollapsed ? "justify-center" : ""
                          } ${inactiveText} ${inactiveHover}`}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          {!isCollapsed && (
                            <>
                              <span className="text-sm font-medium flex-1 text-left" style={{ fontSize: "14px" }}>{item.label}</span>
                              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/course:rotate-180" />
                            </>
                          )}
                        </CollapsibleTrigger>
                        {!isCollapsed && (
                          <CollapsibleContent className="pt-0.5 pl-4 space-y-0.5">
                            {item.children.map((sub) => {
                              const active = isActive(sub.path);
                              return (
                                <Link
                                  key={sub.path}
                                  to={sub.path}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${
                                    active ? `${activeBg} font-semibold` : `${inactiveText} ${inactiveHover}`
                                  }`}
                                >
                                  {sub.label}
                                </Link>
                              );
                            })}
                          </CollapsibleContent>
                        )}
                      </Collapsible>
                    );
                  })
                : menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all ${
                          isCollapsed ? "justify-center" : ""
                        } ${
                          active
                            ? `${activeBg} font-semibold`
                            : `${inactiveText} ${inactiveHover}`
                        }`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium" style={{ fontSize: "14px" }}>{item.label}</span>}
                      </Link>
                    );
                  })}
            </div>
          </nav>

          {/* Footer Section */}
          <div className={`p-4 ${isProfessionalRole ? "border-t border-slate-800" : ""}`}>
            <Button
              variant="ghost"
              className={`w-full ${isCollapsed ? "justify-center" : "justify-start"} ${isProfessionalRole ? "text-slate-300" : "text-foreground/70"} ${logoutHover}`}
              onClick={handleLogout}
              title={isCollapsed ? "Log Out" : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm ml-3 font-medium" style={{ fontSize: '14px' }}>Log Out</span>}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default DashboardSidebar;
