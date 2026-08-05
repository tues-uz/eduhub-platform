import { useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, PanelLeft } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { useLayoutContext } from "@/features/layout/context";
import { resolveAdminBreadcrumb } from "@/features/layout/resolveAdminPageHeader";
import { SIDEBAR_COLLAPSE_ENABLED } from "@/features/layout/hooks/useSidebarState";
import { instructorProfileAvatarsStore } from "@/features/teacher/data/instructorProfileAvatarsStore";
import { useNotificationsQuery } from "@/features/notifications/useNotificationsQuery";
import { formatUnreadNotificationBadge } from "@/features/notifications/notificationDisplay";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";
import { dashboardHomeByStaffRole } from "@/features/admin/adminStaffRoles";

/**
 * Shared shell for all admin/superadmin routes: sidebar + sticky top header (teacher-style).
 */
export default function AdminLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user } = useAuthSession();
  const { isSidebarCollapsed, toggleSidebar } = useLayoutContext();
  const { data: notifications = [] } = useNotificationsQuery();
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const adminHome = dashboardHomeByStaffRole(user.staffRole);
  const breadcrumb = resolveAdminBreadcrumb(pathname, t);
  const userName = formatDisplayPersonName(user.name || "Admin");
  const avatarUrl =
    user.avatarUrl?.trim() ||
    instructorProfileAvatarsStore.getByEmail(user.email) ||
    instructorProfileAvatarsStore.getByName(user.name);

  const roleBadge =
    !user.staffRole || user.staffRole === "ADMIN"
      ? t("admin.shared.roleBadgeSuper")
      : t("admin.shared.roleBadge");

  const atHome = pathname.replace(/\/+$/, "") === adminHome.replace(/\/+$/, "");

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main
        className={`relative flex h-[calc(100dvh-4rem)] w-full flex-1 flex-col overflow-hidden bg-background pt-14 transition-all duration-300 lg:h-dvh lg:pt-0 ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <header className="z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
            {SIDEBAR_COLLAPSE_ENABLED ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-sidebar="trigger"
                className="hidden size-7 -ml-1 lg:inline-flex"
                onClick={toggleSidebar}
                aria-label={t("sidebar.toggleSidebar")}
                title={t("sidebar.toggleSidebar")}
              >
                <PanelLeft className="h-4 w-4" />
                <span className="sr-only">{t("sidebar.toggleSidebar")}</span>
              </Button>
            ) : null}
            <nav aria-label="breadcrumb" className="min-w-0">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <li className="inline-flex items-center gap-1.5">
                  <Link to={adminHome} className="transition-colors hover:text-foreground">
                    {t("adminNav.dashboard")}
                  </Link>
                </li>
                {!atHome ? (
                  <>
                    <li aria-hidden className="text-border">
                      /
                    </li>
                    <li className="inline-flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium text-foreground">{breadcrumb}</span>
                    </li>
                  </>
                ) : null}
              </ol>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 px-4">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative size-8 text-muted-foreground"
            >
              <Link
                to="/dashboard/admin/notifications"
                aria-label={t("sidebar.notifications")}
                title={t("sidebar.notifications")}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {formatUnreadNotificationBadge(unreadCount)}
                  </span>
                ) : null}
              </Link>
            </Button>
            <div className="hidden min-w-0 flex-col items-end gap-0.5 md:flex">
              <div className="flex max-w-[16rem] items-center gap-1.5">
                <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold leading-none text-foreground">
                  {roleBadge}
                </span>
                <p className="truncate text-xs font-medium text-foreground">{userName}</p>
              </div>
              <p className="max-w-[16rem] truncate text-[11px] text-muted-foreground">{user.email}</p>
            </div>
            <div
              className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-700 to-slate-900"
              aria-hidden
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-white">{profileInitials(userName)}</span>
              )}
            </div>
          </div>
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-10 pt-5">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
