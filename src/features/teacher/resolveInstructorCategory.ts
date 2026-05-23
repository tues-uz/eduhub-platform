import { adminTeachersStore } from "@/features/admin/data/adminTeachersStore";

export const INSTRUCTOR_CATEGORY_MISSING =
  "Your teaching category is not set. Contact an administrator to assign one before creating a class.";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Category assigned when admin created the instructor account (API profile or local admin store). */
export function resolveInstructorCategory(email: string, fromProfile?: string): string {
  const fromApi = fromProfile?.trim();
  if (fromApi) return fromApi;

  const row = adminTeachersStore
    .getAll()
    .find((teacher) => normalizeEmail(teacher.email) === normalizeEmail(email));
  return row?.category?.trim() ?? "";
}
