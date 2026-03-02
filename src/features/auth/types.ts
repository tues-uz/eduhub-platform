export type UserRole = "student" | "admin" | "teacher";

export interface SessionUser {
  name: string;
  email: string;
  role: UserRole;
}
