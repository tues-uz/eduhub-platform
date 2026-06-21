import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Users,
  BookOpen,
  BarChart3,
  Settings,
  Shield,
  TrendingUp,
  UserPlus,
  GraduationCap,
  Activity,
  MoreHorizontal,
  ClipboardList,
  Receipt,
  Calendar,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuthSession } from "@/features/auth/context";
import { useLayoutContext } from "@/features/layout/context";
import { useAdminOverviewQuery } from "@/features/admin/hooks/useAdminQueries";

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const { isSidebarCollapsed } = useLayoutContext();
  const { data, isPending, isError, error } = useAdminOverviewQuery();
  const userName = user.name;

  const stats = data?.stats ?? [];
  type RecentUser = { id: number | string; name: string; email: string; role: string; status: string };
  const recentUsers = (data?.recentUsers ?? []) as RecentUser[];
  const systemActivity = data?.systemActivity ?? [];

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  const recentUserRoleOptions = useMemo(() => {
    const roles = new Set(recentUsers.map((u) => u.role));
    return Array.from(roles).sort((a, b) => a.localeCompare(b));
  }, [recentUsers]);

  const filteredRecentUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return recentUsers.filter((u) => {
      if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
      if (userStatusFilter === "active" && u.status !== "Active") return false;
      if (userStatusFilter === "inactive" && u.status !== "Inactive") return false;
      if (!q) return true;
      return [u.name, u.email, u.role, u.status].join(" ").toLowerCase().includes(q);
    });
  }, [recentUsers, userSearch, userRoleFilter, userStatusFilter]);

  const recentUsersHasFilters =
    userSearch.trim() !== "" || userRoleFilter !== "all" || userStatusFilter !== "all";

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
                  {t("admin.dashboard.subtitle")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md uppercase tracking-wide">
                  {t("admin.shared.roleBadge")}
                </span>
              </div>
            </div>
          </div>

          {/* Professional Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${stat.bgColor} p-2.5 rounded-md border ${stat.borderColor}`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      stat.trend === "up" ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {stat.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                      {stat.change}
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-6">
            {/* {t("admin.dashboard.recentUsers.title")} Table */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {t("admin.dashboard.recentUsers.title")}
                </h2>
                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-8" asChild>
                  <Link to="/dashboard/admin/add-user-role" className="inline-flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("admin.dashboard.recentUsers.addUser")}
                  </Link>
                </Button>
              </div>
              {recentUsers.length > 0 ? (
                <div className="px-6 pb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center border-b border-slate-200">
                  <Input
                    placeholder={t("admin.shared.searchNameEmailRole")}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="max-w-md bg-white"
                  />
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] bg-white">
                      <SelectValue placeholder={t("admin.shared.role")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.shared.allRoles")}</SelectItem>
                      {recentUserRoleOptions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] bg-white">
                      <SelectValue placeholder={t("common.status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.shared.allStatuses")}</SelectItem>
                      <SelectItem value="active">{t("admin.shared.active")}</SelectItem>
                      <SelectItem value="inactive">{t("admin.shared.inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {recentUsersHasFilters ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-slate-600"
                      onClick={() => {
                        setUserSearch("");
                        setUserRoleFilter("all");
                        setUserStatusFilter("all");
                      }}
                    >
                      {t("admin.shared.clearFilters")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("common.name")}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("admin.shared.email")}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("admin.shared.role")}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("common.status")}</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isError ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-xs text-red-600">
                          {error instanceof Error ? error.message : t("admin.dashboard.recentUsers.loadError")}
                        </td>
                      </tr>
                    ) : isPending ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-500">
                          {t("admin.shared.loadingUsers")}
                        </td>
                      </tr>
                    ) : filteredRecentUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-500">
                          {recentUsers.length === 0
                            ? t("admin.dashboard.recentUsers.empty.none")
                            : t("admin.users.empty")}
                        </td>
                      </tr>
                    ) : (
                    filteredRecentUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-slate-900">{u.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-600">{u.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">{u.role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium ${u.status === "Active" ? "text-emerald-600" : "text-slate-500"}`}>{u.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>{t("common.view")}</DropdownMenuItem>
                              <DropdownMenuItem>{t("common.edit")}</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">{t("admin.shared.deactivate")}</DropdownMenuItem>
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

            {/* {t("admin.dashboard.systemActivity.title")} */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">
                  {t("admin.dashboard.systemActivity.title")}
                </h2>
              </div>
              <div className="divide-y divide-slate-200">
                {systemActivity.map((item, i) => (
                  <div key={i} className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-start gap-3">
                    <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{item.action}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{item.detail}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* {t("admin.dashboard.quickActions.title")} and {t("admin.dashboard.adminAccess.title")} */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                    {t("admin.dashboard.quickActions.title")}
                  </h2>
                </div>
                <div className="p-4 space-y-2">
                  <Link to="/dashboard/admin/students">
                    <Button variant="ghost" className="w-full justify-start text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-9">
                      <GraduationCap className="h-4 w-4 mr-2.5" />
                      <span className="text-sm font-medium">{t("adminNav.studentsRegistrations")}</span>
                    </Button>
                  </Link>
                  <Link to="/dashboard/admin/enrollments">
                    <Button variant="ghost" className="w-full justify-start text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-9">
                      <ClipboardList className="h-4 w-4 mr-2.5" />
                      <span className="text-sm font-medium">{t("adminNav.enrollmentsWaitlist")}</span>
                    </Button>
                  </Link>
                  <Link to="/dashboard/admin/payments">
                    <Button variant="ghost" className="w-full justify-start text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-9">
                      <Receipt className="h-4 w-4 mr-2.5" />
                      <span className="text-sm font-medium">{t("adminNav.paymentsReminders")}</span>
                    </Button>
                  </Link>
                  <Link to="/dashboard/admin/courses">
                    <Button variant="ghost" className="w-full justify-start text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-9">
                      <BookOpen className="h-4 w-4 mr-2.5" />
                      <span className="text-sm font-medium">{t("admin.shared.allClasses")}</span>
                    </Button>
                  </Link>
                  <Link to="/dashboard/admin/calendar">
                    <Button variant="ghost" className="w-full justify-start text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-9">
                      <Calendar className="h-4 w-4 mr-2.5" />
                      <span className="text-sm font-medium">{t("adminNav.calendar")}</span>
                    </Button>
                  </Link>
                  <Link to="/dashboard/admin/users">
                    <Button variant="ghost" className="w-full justify-start text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-9">
                      <Users className="h-4 w-4 mr-2.5" />
                      <span className="text-sm font-medium">{t("adminNav.users")}</span>
                    </Button>
                  </Link>
                  <Link to="/dashboard/admin/reports">
                    <Button variant="ghost" className="w-full justify-start text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-9">
                      <BarChart3 className="h-4 w-4 mr-2.5" />
                      <span className="text-sm font-medium">{t("adminNav.reports")}</span>
                    </Button>
                  </Link>
                  <Link to="/dashboard/admin/settings">
                    <Button variant="ghost" className="w-full justify-start text-slate-700 hover:bg-slate-50 hover:text-slate-900 h-9">
                      <Settings className="h-4 w-4 mr-2.5" />
                      <span className="text-sm font-medium">{t("adminNav.settings")}</span>
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-semibold">
                    {t("admin.dashboard.adminAccess.title")}
                  </h2>
                </div>
                <p className="text-sm text-slate-300 mb-4">
                  {t("admin.dashboard.adminAccess.description")}
                </p>
                <p className="text-xs text-slate-400">{t("admin.shared.loggedInAs", { name: userName })}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
