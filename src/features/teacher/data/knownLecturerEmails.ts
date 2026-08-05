import { adminTeachersStore } from "@/features/admin/data/adminTeachersStore";

/** Emails that appear as lecturers added via Admin “Add user role” (FE validation). */
export function isAdminRegisteredLecturerEmail(raw: string): boolean {
  const n = raw.trim().toLowerCase();
  if (!n || !n.includes("@")) return false;
  return adminTeachersStore.getAll().some((t) => t.email.trim().toLowerCase() === n);
}
