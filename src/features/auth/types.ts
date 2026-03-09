export type UserRole = "student" | "admin" | "teacher";

export interface SessionUser {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
}
