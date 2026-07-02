export type UserRole = "student" | "admin" | "teacher";

export type { AdminStaffRole } from "@/features/admin/adminStaffRoles";

export interface SessionUser {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  /** Sub-type for admin staff (ADMIN_FINANCE, etc.). Super admin is ADMIN or omitted. */
  staffRole?: import("@/features/admin/adminStaffRoles").AdminStaffRole;
  /** Profile picture URL when provided by the API (e.g. /auth/me). */
  avatarUrl?: string;
  /** Primary phone from API login/me or cached after registration. */
  phoneNumber?: string;
  /** Teaching category assigned by admin (lecturers only). */
  category?: string;
  /** Admin code assigned by default/registration (admins only). */
  adminCode?: string;
}
