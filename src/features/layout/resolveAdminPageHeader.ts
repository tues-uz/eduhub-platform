/**
 * Resolve sticky admin top-bar breadcrumb label from the current pathname.
 */
export function resolveAdminBreadcrumb(pathname: string, t: (key: string) => string): string {
  const p = pathname.replace(/\/+$/, "") || "/";

  if (p === "/dashboard/admin") return t("adminNav.dashboard");
  if (p === "/dashboard/admin/finance") return t("adminNav.dashboard");
  if (p === "/dashboard/admin/analytic") return t("adminNav.analytics");
  if (p.startsWith("/dashboard/admin/notifications")) return t("adminNav.notifications");

  if (p.startsWith("/dashboard/admin/students")) return t("adminNav.studentsRegistrations");
  if (p.startsWith("/dashboard/admin/teachers")) return t("adminNav.teachers");
  if (p.startsWith("/dashboard/admin/staff")) return t("adminNav.staff");
  if (p.startsWith("/dashboard/admin/users")) return t("adminNav.users");
  if (p.startsWith("/dashboard/admin/add-user")) return t("adminNav.addStaff");

  if (/\/dashboard\/admin\/courses\/[^/]+\/schedule/.test(p)) return t("adminNav.allClassesSchedules");
  if (/\/dashboard\/admin\/courses\/[^/]+$/.test(p)) return t("adminNav.allClassesSchedules");
  if (p.startsWith("/dashboard/admin/courses")) return t("adminNav.allClassesSchedules");
  if (p.startsWith("/dashboard/admin/enrollment-applications")) {
    return t("adminNav.enrollmentApplications");
  }
  if (p.startsWith("/dashboard/admin/classes")) return t("adminNav.classesRosters");
  if (p.startsWith("/dashboard/admin/promos")) return t("adminNav.studentPromos");
  if (p.startsWith("/dashboard/admin/referral-codes")) return t("adminNav.referralCodes");
  if (p.startsWith("/dashboard/admin/special-tuition")) return t("adminNav.specialTuition");
  if (p.startsWith("/dashboard/admin/content") || p.startsWith("/dashboard/admin/landing-page")) {
    return t("adminNav.websiteContent");
  }

  if (p.startsWith("/dashboard/admin/payments")) return t("adminNav.paymentsReminders");
  if (p.startsWith("/dashboard/admin/installment-payments")) {
    return t("adminNav.scheduleMonthPayments");
  }
  if (p.startsWith("/dashboard/admin/payroll")) return t("adminNav.payroll");
  if (p.startsWith("/dashboard/admin/transactions")) return t("adminNav.transactions");
  if (p.startsWith("/dashboard/admin/attendance")) return t("adminNav.attendanceProgress");
  if (p.startsWith("/dashboard/admin/placement-tests")) return t("adminNav.placementTests");
  if (p.startsWith("/dashboard/admin/certifications")) return t("adminNav.certifications");
  if (p.startsWith("/dashboard/admin/calendar")) return t("adminNav.calendar");
  if (p.startsWith("/dashboard/admin/support-sessions")) return t("adminNav.supportSessions");
  if (p.startsWith("/dashboard/admin/substitute-requests")) {
    return t("adminNav.substituteRequests");
  }

  if (p.startsWith("/dashboard/admin/integrations")) return t("adminNav.integrations");
  if (p.startsWith("/dashboard/admin/reports")) return t("adminNav.reports");
  if (p.startsWith("/dashboard/admin/settings")) return t("adminNav.settings");

  return t("adminNav.dashboard");
}
