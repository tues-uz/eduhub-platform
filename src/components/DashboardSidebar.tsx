import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X, User, Bell, ChevronDown, ChevronLeft, ChevronRight } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuthSession, clearSessionUser } from "@/features/auth/context";
import { instructorProfileAvatarsStore } from "@/features/teacher/data/instructorProfileAvatarsStore";
import { clearAuthTokens } from "@/api/eduhubClient";
import { useLayoutContext } from "@/features/layout/context";
import {
  adminMenuItems,
  studentMenuItems,
  teacherMenuItems,
} from "@/features/layout/navigation";
import { dashboardHomeByRole } from "@/app/routes";
import { SIDEBAR_COLLAPSE_ENABLED } from "@/features/layout/hooks/useSidebarState";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";
import {
  StudentDashboardHeaderToolbar,
} from "@/components/DashboardPageHeader";
import { DashboardClassSearch } from "@/components/DashboardClassSearch";

const DashboardSidebar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuthSession();
  const { isSidebarCollapsed: isCollapsed, toggleSidebar } = useLayoutContext();
  const location = useLocation();
  const navigate = useNavigate();
  const userName = formatDisplayPersonName(user.name);
  const userEmail = user.email;
  const userRole = user.role;
  const sidebarAvatarUrl =
    user.avatarUrl?.trim() ||
    instructorProfileAvatarsStore.getByEmail(user.email) ||
    instructorProfileAvatarsStore.getByName(user.name);

  const nestedMenuItems =
    userRole === "teacher" ? teacherMenuItems : userRole === "admin" ? adminMenuItems : null;

  const dashboardHome = dashboardHomeByRole(userRole);
  const mobileNotificationsPath =
    userRole === "admin"
      ? "/dashboard/admin/notifications"
      : userRole === "teacher"
        ? "/dashboard/teacher/notifications"
        : null;

  const handleLogout = () => {
    clearAuthTokens();
    clearSessionUser();
    navigate("/signin");
  };

  const isActive = (path: string) => {
    if (path === "/dashboard" || path === "/dashboard/admin" || path === "/dashboard/teacher") {
      return location.pathname === path;
    }
    const p = location.pathname;
    if (path === "/dashboard/teacher/courses") {
      if (p === path) return true;
      // "Add New Class" lives under …/courses/new — must not highlight "My Class"
      if (p.startsWith(`${path}/new`)) return false;
      return p.startsWith(`${path}/`);
    }
    return p === path || p.startsWith(`${path}/`);
  };

  // Role-based styling - Professional design for teacher and admin
  const isProfessionalRole = userRole === "teacher" || userRole === "admin";
  const sidebarBg = isProfessionalRole ? "bg-slate-900" : "bg-white/95 backdrop-blur-md";
  const sidebarBorder = isProfessionalRole ? "border-slate-800" : "border-gray-200";
  const logoFont = userRole === "teacher" ? "'DM Sans', sans-serif" : isProfessionalRole ? "'DM Sans', sans-serif" : "'DM Sans', sans-serif";
  const logoTextFont = userRole === "teacher" ? "'DM Sans', sans-serif" : isProfessionalRole ? "'DM Sans', sans-serif" : "'DM Sans', sans-serif";
  const userCardBg = isProfessionalRole ? "bg-slate-800 border border-slate-700" : "bg-gradient-to-br from-blue-50 to-blue-100";
  const userAvatarBg = isProfessionalRole ? "bg-slate-700" : "bg-gradient-to-br from-blue-500 to-blue-600";
  const activeBg = isProfessionalRole ? "bg-slate-800 text-white" : "bg-blue-50 text-blue-600";
  const inactiveText = isProfessionalRole ? "text-slate-300" : "text-foreground/70";
  const inactiveHover = isProfessionalRole ? "hover:bg-slate-800 hover:text-white" : "hover:bg-gray-100 hover:text-foreground";
  const logoutHover = isProfessionalRole ? "hover:text-red-400 hover:bg-slate-800" : "hover:text-red-600 hover:bg-red-50";
  return (
    <div style={{ fontFamily: logoFont }}>
      {/* Mobile Header */}
      {userRole === "student" ? (
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md lg:hidden">
          <div className="flex h-16 items-center justify-between gap-3 px-4">
            <Link to={dashboardHome} className="flex shrink-0 items-center">
              <img src="/logo-eduhub.png" alt="EduHub Logo" className="h-8 w-auto object-contain" />
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              <DashboardClassSearch compact />
              <StudentDashboardHeaderToolbar />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-full"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </header>
      ) : (
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
              {mobileNotificationsPath ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-full ${isProfessionalRole ? "text-slate-300 hover:text-white hover:bg-slate-800" : ""}`}
                  asChild
                >
                  <Link to={mobileNotificationsPath} aria-label="Notifications">
                    <Bell className="h-5 w-5" />
                  </Link>
                </Button>
              ) : null}
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
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[55] bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-[60] h-screen ${sidebarBg} border-r ${sidebarBorder} transition-all duration-300 lg:z-30 ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="relative flex min-h-[4.5625rem] items-center px-4">
            <div className="flex min-h-0 w-full items-center gap-2">
              <Link to={dashboardHome} className={`flex min-h-0 items-center gap-3 flex-1 ${isCollapsed ? "justify-center" : ""}`}>
                <img 
                  src="/logo-eduhub.png" 
                  alt="EduHub Logo" 
                  className={`${isCollapsed ? "h-8" : "h-10"} w-auto object-contain`}
                />
                {!isCollapsed && (
                  <span className={`text-lg font-bold ${isProfessionalRole ? "text-white" : "text-foreground"}`} style={{ fontFamily: logoTextFont, fontWeight: isProfessionalRole ? 600 : 700, letterSpacing: isProfessionalRole ? '0' : '0.5px' }}>
                    EduHub
                  </span>
                )}
              </Link>
            </div>
            {SIDEBAR_COLLAPSE_ENABLED ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className={`hidden lg:flex h-8 w-8 rounded-full ${
                  isProfessionalRole ? "bg-slate-900 hover:bg-slate-800 border-slate-800" : "bg-white hover:bg-gray-100 border-black/32"
                } absolute top-1/2 -right-4 z-10 -translate-y-1/2 border ${isProfessionalRole ? "text-slate-300 hover:text-white" : ""}`}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            ) : null}
          </div>

          {/* User Profile Section */}
          <div className="p-4">
            <div className={`flex items-center gap-3 p-3 rounded-xl ${userCardBg} ${isCollapsed ? "justify-center" : ""}`}>
              <div className={`${isCollapsed ? "w-8 h-8" : "w-10 h-10"} rounded-full ${userAvatarBg} flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden`}>
                {sidebarAvatarUrl ? (
                  <img src={sidebarAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : userName ? (
                  <span className="text-xs">{profileInitials(userName)}</span>
                ) : (
                  <User className={isCollapsed ? "h-4 w-4" : "h-5 w-5"} />
                )}
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
              {nestedMenuItems
                ? nestedMenuItems.map((item) => {
                    const Icon = item.icon;
                    if ("path" in item) {
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
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
                          className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
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
                                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all ${
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
                : studentMenuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
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
          <div className={`p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-4 ${isProfessionalRole ? "border-t border-slate-800" : ""}`}>
            <Button
              variant="ghost"
              className={`w-full rounded-xl ${isCollapsed ? "justify-center" : "justify-start"} ${isProfessionalRole ? "text-slate-300" : "text-foreground/70"} ${logoutHover}`}
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
