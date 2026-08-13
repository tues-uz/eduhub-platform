import type { UserRole } from "@/features/auth/types";
import type { AdminStaffRole } from "@/features/admin/adminStaffRoles";
import { dashboardHomeByStaffRole } from "@/features/admin/adminStaffRoles";

export const appRoutes = {
  home: "/",
  about: "/about",
  programsLanguageTraining: "/programs/language-training",
  programsAcademicServices: "/programs/academic-services",
  signIn: "/signin",
  register: "/register",
  changePassword: "/change-password",
  forgotPassword: "/forgot-password",
  /** Public class detail (no sign-in required to browse). */
  publicClassDetail: (courseId: string) => `/classes/${encodeURIComponent(courseId)}`,
  /** Use this path in password-reset email links so the SPA route matches. */
  resetPassword: "/reset-password",
  /** Use this path in email verification links so the SPA route matches. */
  verifyEmail: "/verify-email",
  dashboard: "/dashboard",
  dashboardAdmin: "/dashboard/admin",
  dashboardAdminFinance: "/dashboard/admin/finance",
  dashboardAdminContent: "/dashboard/admin/content",
  dashboardAdminAnalytic: "/dashboard/admin/analytic",
  dashboardTeacher: "/dashboard/teacher",
} as const;

export function isPublicLandingPage(pathname: string): boolean {
  return (
    pathname === appRoutes.home ||
    pathname === appRoutes.about ||
    pathname === appRoutes.programsLanguageTraining ||
    pathname === appRoutes.programsAcademicServices ||
    pathname === "/eduhub" ||
    pathname.startsWith("/eduhub/") ||
    pathname.startsWith("/classes/")
  );
}

export function dashboardHomeByRole(role: UserRole, staffRole?: AdminStaffRole) {
  if (role === "admin") return dashboardHomeByStaffRole(staffRole);
  if (role === "teacher") return appRoutes.dashboardTeacher;
  return appRoutes.dashboard;
}
