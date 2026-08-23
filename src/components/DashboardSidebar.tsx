import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X, User, Bell, ChevronDown, ChevronLeft, ChevronRight, BookOpen, Shield } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuthSession, clearSessionUser } from "@/features/auth/context";
import { instructorProfileAvatarsStore } from "@/features/teacher/data/instructorProfileAvatarsStore";
import { clearAuthTokens } from "@/api/eduhubClient";
import { useLayoutContext } from "@/features/layout/context";
import { useDashboardMenuItems } from "@/features/layout/useDashboardMenuItems";
import { dashboardHomeByRole } from "@/app/routes";
import { SIDEBAR_COLLAPSE_ENABLED } from "@/features/layout/hooks/useSidebarState";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";
import { StudentDashboardHeaderToolbar } from "@/components/DashboardPageHeader";
import { DashboardClassSearch } from "@/components/DashboardClassSearch";
import type { TranslatedMenuItem } from "@/features/layout/navigation";

type TeacherNavGroup = {
  labelKey: string;
  paths: string[];
};

const TEACHER_NAV_GROUPS: TeacherNavGroup[] = [
  { labelKey: "sidebar.groups.overview", paths: ["/dashboard/teacher"] },
  {
    labelKey: "sidebar.groups.teaching",
    paths: [
      "/dashboard/teacher/students",
      "/dashboard/teacher/attendance",
      "/dashboard/teacher/courses",
      "/dashboard/teacher/courses/new",
      "/dashboard/teacher/schedule",
    ],
  },
  {
    labelKey: "sidebar.groups.account",
    paths: [
      "/dashboard/teacher/notifications",
      "/dashboard/teacher/payroll",
      "/dashboard/teacher/settings",
    ],
  },
];

function itemMatchesGroup(item: TranslatedMenuItem, group: TeacherNavGroup): boolean {
  if ("path" in item) return group.paths.includes(item.path);
  return item.children.some((c) => group.paths.includes(c.path));
}

const DashboardSidebar = () => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuthSession();
  const { isSidebarCollapsed: isCollapsed, toggleSidebar } = useLayoutContext();
  const location = useLocation();
  const navigate = useNavigate();
  const userName = formatDisplayPersonName(user.name);
  const userEmail = user.email;
  const userRole = user.role;
  const nestedMenuItems = useDashboardMenuItems(userRole);
  const sidebarAvatarUrl =
    user.avatarUrl?.trim() ||
    instructorProfileAvatarsStore.getByEmail(user.email) ||
    instructorProfileAvatarsStore.getByName(user.name);

  const dashboardHome = dashboardHomeByRole(userRole, user.staffRole);
  const mobileNotificationsPath =
    userRole === "admin"
      ? "/dashboard/admin/notifications"
      : userRole === "teacher"
        ? "/dashboard/teacher/notifications"
        : null;

  const isTeacher = userRole === "teacher";
  const isAdmin = userRole === "admin";
  /** Teacher + admin share the light dashboard shell (sticky header carries identity). */
  const isStaffShell = isTeacher || isAdmin;

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
      if (p.startsWith(`${path}/new`)) return false;
      return p.startsWith(`${path}/`);
    }
    return p === path || p.startsWith(`${path}/`);
  };

  const sidebarBg = isStaffShell
    ? "bg-sidebar text-sidebar-foreground"
    : "bg-white/95 backdrop-blur-md";
  const sidebarBorder = isStaffShell ? "border-sidebar-border" : "border-gray-200";
  const userCardBg = "bg-gradient-to-br from-blue-50 to-blue-100";
  const userAvatarBg = isAdmin
    ? "bg-gradient-to-br from-slate-700 to-slate-900"
    : isTeacher
      ? "bg-gradient-to-br from-teal-500 to-emerald-600"
      : "bg-gradient-to-br from-blue-500 to-blue-600";
  const activeBg = isTeacher
    ? "bg-teal-50 text-teal-800 font-medium"
    : isAdmin
      ? "bg-slate-100 text-slate-900 font-medium"
      : "bg-blue-50 text-blue-600 font-semibold";
  const inactiveText = isStaffShell ? "text-sidebar-foreground/80" : "text-foreground/70";
  const inactiveHover = isStaffShell
    ? "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    : "hover:bg-gray-100 hover:text-foreground";
  const logoutHover = isStaffShell
    ? "hover:bg-rose-50 hover:text-rose-700"
    : "hover:text-red-600 hover:bg-red-50";

  const navItemBase = isStaffShell
    ? `flex w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-sm outline-none transition-colors ${
        isCollapsed ? "h-8 justify-center" : "h-8"
      }`
    : `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${isCollapsed ? "justify-center" : ""}`;

  const iconClass = isStaffShell ? "h-4 w-4 shrink-0" : "h-5 w-5 flex-shrink-0";

  const renderMenuItem = (item: TranslatedMenuItem) => {
    const Icon = item.icon;
    if ("path" in item) {
      const active = isActive(item.path);
      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => setIsMobileMenuOpen(false)}
          className={`${navItemBase} ${active ? activeBg : `${inactiveText} ${inactiveHover}`}`}
          title={isCollapsed ? item.label : undefined}
        >
          <Icon className={iconClass} />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </Link>
      );
    }
    return (
      <Collapsible
        key={item.label}
        defaultOpen={item.children.some((c) => isActive(c.path))}
        className="group/course"
      >
        <CollapsibleTrigger
          className={`${navItemBase} ${inactiveText} ${inactiveHover}`}
          title={isCollapsed ? item.label : undefined}
        >
          <Icon className={iconClass} />
          {!isCollapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/course:rotate-180" />
            </>
          )}
        </CollapsibleTrigger>
        {!isCollapsed && (
          <CollapsibleContent className={`space-y-0.5 pt-0.5 ${isStaffShell ? "pl-6" : "pl-4"}`}>
            {item.children.map((sub) => {
              const active = isActive(sub.path);
              return (
                <Link
                  key={sub.path}
                  to={sub.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`${navItemBase} ${active ? activeBg : `${inactiveText} ${inactiveHover}`}`}
                >
                  <span className="truncate">{sub.label}</span>
                </Link>
              );
            })}
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  };

  const teacherGroupedNav =
    isTeacher && nestedMenuItems
      ? TEACHER_NAV_GROUPS.map((group) => ({
          ...group,
          items: nestedMenuItems.filter((item) => itemMatchesGroup(item, group)),
        })).filter((g) => g.items.length > 0)
      : null;

  return (
    <div>
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
                aria-label={isMobileMenuOpen ? t("sidebar.closeMenu") : t("sidebar.openMenu")}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </header>
      ) : (
        <header
          className={`lg:hidden fixed top-0 left-0 right-0 z-50 border-b shadow-sm ${
            isStaffShell
              ? "bg-background border-border"
              : "bg-white/95 backdrop-blur-md border-gray-200"
          }`}
        >
          <div className="container mx-auto px-4">
            <div className="flex h-14 items-center justify-between">
              <Link to={dashboardHome} className="flex items-center gap-2">
                {isTeacher ? (
                  <span className="flex size-8 items-center justify-center rounded-lg bg-teal-600 text-white">
                    <BookOpen className="h-4 w-4" />
                  </span>
                ) : isAdmin ? (
                  <span className="flex size-8 items-center justify-center rounded-lg bg-slate-800 text-white">
                    <Shield className="h-4 w-4" />
                  </span>
                ) : (
                  <img src="/logo-eduhub.png" alt="EduHub Logo" className="h-8 w-auto object-contain" />
                )}
                {isStaffShell ? (
                  <span className="text-sm font-semibold tracking-tight">EduHub</span>
                ) : null}
              </Link>
              <div className="flex items-center gap-1">
                {mobileNotificationsPath ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-md ${
                      isStaffShell ? "text-muted-foreground hover:bg-accent" : ""
                    }`}
                    asChild
                  >
                    <Link to={mobileNotificationsPath} aria-label={t("sidebar.notifications")}>
                      <Bell className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={`h-8 w-8 rounded-md ${
                    isStaffShell ? "text-muted-foreground hover:bg-accent" : ""
                  }`}
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[55] bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-[60] h-screen overflow-visible border-r transition-all duration-300 lg:z-40 ${sidebarBg} ${sidebarBorder} ${
          isCollapsed ? "w-20" : "w-64"
        } ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-full flex-col">
          {/* Brand / workspace header */}
          <div
            className={`relative flex items-center overflow-visible px-2 ${isStaffShell ? "min-h-14 py-2" : "min-h-[4.5625rem] px-4"}`}
          >
            <div className="flex min-h-0 w-full items-center gap-2">
              <Link
                to={dashboardHome}
                className={`flex min-h-0 flex-1 items-center gap-2 ${isCollapsed ? "justify-center" : "px-2"}`}
              >
                {isTeacher ? (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
                    <BookOpen className="h-4 w-4" />
                  </span>
                ) : isAdmin ? (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white">
                    <Shield className="h-4 w-4" />
                  </span>
                ) : (
                  <img
                    src="/logo-eduhub.png"
                    alt="EduHub Logo"
                    className={`${isCollapsed ? "h-8" : "h-10"} w-auto object-contain`}
                  />
                )}
                {!isCollapsed && (
                  <div className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold text-foreground">EduHub</span>
                    {isTeacher ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {t("teacher.dashboard.subtitle")}
                      </span>
                    ) : isAdmin ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {t("admin.dashboard.subtitle")}
                      </span>
                    ) : null}
                  </div>
                )}
              </Link>
            </div>
            {SIDEBAR_COLLAPSE_ENABLED && !isStaffShell ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="absolute top-1/2 z-50 -right-4 hidden h-8 w-8 -translate-y-1/2 rounded-full border border-black/32 bg-white shadow-sm hover:bg-gray-100 lg:flex"
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            ) : null}
          </div>

          {/* User card — staff shells put identity in the top bar */}
          {!isStaffShell ? (
            <div className="p-4">
              <div
                className={`flex items-center gap-3 rounded-xl p-3 ${userCardBg} ${
                  isCollapsed ? "justify-center" : ""
                }`}
              >
                <div
                  className={`${isCollapsed ? "h-8 w-8" : "h-10 w-10"} flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${userAvatarBg}`}
                >
                  {sidebarAvatarUrl ? (
                    <img src={sidebarAvatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : userName ? (
                    <span className="text-xs">{profileInitials(userName)}</span>
                  ) : (
                    <User className={isCollapsed ? "h-4 w-4" : "h-5 w-5"} />
                  )}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                    <p className="truncate text-xs text-foreground/60">{userEmail || user.phoneNumber || "—"}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <nav className={`flex-1 overflow-y-auto ${isStaffShell ? "px-2 py-1" : "p-4"}`}>
            {teacherGroupedNav ? (
              <div className="flex flex-col gap-1">
                {teacherGroupedNav.map((group) => (
                  <div key={group.labelKey} className="relative flex w-full min-w-0 flex-col px-0 py-1">
                    {!isCollapsed ? (
                      <div className="flex h-7 shrink-0 items-center px-2 text-xs font-medium text-muted-foreground">
                        {t(group.labelKey)}
                      </div>
                    ) : null}
                    <div className="flex w-full flex-col gap-0.5">{group.items.map(renderMenuItem)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">{(nestedMenuItems ?? []).map(renderMenuItem)}</div>
            )}
          </nav>

          <div
            className={`pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-3 ${
              isStaffShell ? "px-2 pt-2" : "p-4"
            }`}
          >
            <Button
              variant="ghost"
              className={`w-full ${
                isStaffShell
                  ? `h-8 gap-2 rounded-md px-2 text-sm font-normal text-sidebar-foreground/80 ${isCollapsed ? "justify-center" : "justify-start"}`
                  : `rounded-xl ${isCollapsed ? "justify-center" : "justify-start"} text-foreground/70`
              } ${logoutHover}`}
              onClick={handleLogout}
              title={isCollapsed ? t("sidebar.logout") : undefined}
            >
              <LogOut className={iconClass} />
              {!isCollapsed && <span className="truncate">{t("sidebar.logout")}</span>}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default DashboardSidebar;
