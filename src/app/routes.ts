import type { UserRole } from "@/features/auth/types";

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
  dashboardTeacher: "/dashboard/teacher",
} as const;

export function dashboardHomeByRole(role: UserRole) {
  if (role === "admin") return appRoutes.dashboardAdmin;
  if (role === "teacher") return appRoutes.dashboardTeacher;
  return appRoutes.dashboard;
}
