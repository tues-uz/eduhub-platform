import type { UserRole } from "@/features/auth/types";
import type { AdminStaffRole } from "@/features/admin/adminStaffRoles";
import { dashboardHomeByStaffRole } from "@/features/admin/adminStaffRoles";

export const appRoutes = {
  home: "/",
  signIn: "/signin",
  register: "/register",
  changePassword: "/change-password",
  forgotPassword: "/forgot-password",
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

export function dashboardHomeByRole(role: UserRole, staffRole?: AdminStaffRole) {
  if (role === "admin") return dashboardHomeByStaffRole(staffRole);
  if (role === "teacher") return appRoutes.dashboardTeacher;
  return appRoutes.dashboard;
}
