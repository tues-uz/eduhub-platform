export type UserRole = "student" | "admin" | "teacher";

export interface SessionUser {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  /** Profile picture URL when provided by the API (e.g. /auth/me). */
  avatarUrl?: string;
}
