/**
 * Resolve sticky teacher top-bar breadcrumb label from the current pathname.
 */
export function resolveTeacherBreadcrumb(pathname: string, t: (key: string) => string): string {
  const p = pathname.replace(/\/+$/, "") || "/";

  if (p === "/dashboard/teacher") return t("teacher.dashboard.overviewTitle");
  if (p === "/dashboard/teacher/courses") return t("teacherNav.myClass");
  if (p === "/dashboard/teacher/courses/new" || p.startsWith("/dashboard/teacher/courses/new/")) {
    return t("teacherNav.addNewClass");
  }
  if (/\/dashboard\/teacher\/courses\/[^/]+\/edit/.test(p)) return t("teacher.dashboard.classesTable.action.editClass");
  if (/\/dashboard\/teacher\/courses\/[^/]+\/resume\//.test(p)) return t("teacher.roster.tabs.resume");
  if (/\/dashboard\/teacher\/courses\/[^/]+$/.test(p)) return t("teacherNav.myClass");
  if (p.startsWith("/dashboard/teacher/students")) return t("teacherNav.allStudent");
  if (p.startsWith("/dashboard/teacher/attendance")) return t("teacherNav.attendanceQr");
  if (p.startsWith("/dashboard/teacher/schedule")) return t("teacherNav.scheduleApprovals");
  if (p.startsWith("/dashboard/teacher/notifications")) return t("teacherNav.notifications");
  if (p.startsWith("/dashboard/teacher/payroll")) return t("teacherNav.payroll");
  if (p.startsWith("/dashboard/teacher/settings")) return t("teacherNav.settings");
  if (p.startsWith("/dashboard/teacher/assignments")) return t("teacher.dashboard.stats.pendingGrading");
  if (p.startsWith("/dashboard/teacher/placement-test")) return t("teacher.roster.tabs.quiz");
  if (p.startsWith("/dashboard/teacher/substitute-requests")) return t("teacher.roster.inviteSubstitute");

  return t("teacher.dashboard.overviewTitle");
}
