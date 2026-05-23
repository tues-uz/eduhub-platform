export type UserRole = "student" | "admin" | "teacher";

export interface SessionUser {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  /** Profile picture URL when provided by the API (e.g. /auth/me). */
  avatarUrl?: string;
  /** Primary phone from API login/me or cached after registration. */
  phoneNumber?: string;
  /** Teaching category assigned by admin (lecturers only). */
  category?: string;
}
