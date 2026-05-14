import { mockAdminTeachers } from "@/features/admin/data/adminOperationalMock";
import { adminTeachersStore } from "@/features/admin/data/adminTeachersStore";

/** Emails that appear as lecturers added via Admin “Add user role” plus demo seed list (FE demo until API validates). */
export function isAdminRegisteredLecturerEmail(raw: string): boolean {
  const n = raw.trim().toLowerCase();
  if (!n || !n.includes("@")) return false;
  if (adminTeachersStore.getAll().some((t) => t.email.trim().toLowerCase() === n)) return true;
  if (mockAdminTeachers.some((t) => t.email.trim().toLowerCase() === n)) return true;
  return false;
}
