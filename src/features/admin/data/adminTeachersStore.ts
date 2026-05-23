import type { AdminTeacherRow } from "@/features/admin/data/adminOperationalMock";

const STORAGE_KEY = "eduhub.adminTeachers.created.v1";

function safeParse(json: string | null): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const adminTeachersStore = {
  getAll(): AdminTeacherRow[] {
    const raw = safeParse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(raw)) return [];

    return raw
      .filter((v): v is AdminTeacherRow => !!v && typeof v === "object")
      .map((t: any): AdminTeacherRow => ({
        id: typeof t.id === "string" ? t.id : `local-${Date.now()}`,
        name: typeof t.name === "string" ? t.name : "—",
        email: typeof t.email === "string" ? t.email : "",
        category: typeof t.category === "string" ? t.category : undefined,
        coursesTaught: Array.isArray(t.coursesTaught) ? t.coursesTaught : [],
        totalStudents: typeof t.totalStudents === "number" ? t.totalStudents : 0,
        status: t.status === "Inactive" ? "Inactive" : "Active",
      }))
      .filter((t) => normalizeEmail(t.email) !== "");
  },

  upsertByEmail(next: Omit<AdminTeacherRow, "id"> & { id?: string }): void {
    const existing = this.getAll();
    const email = normalizeEmail(next.email);
    const deduped = existing.filter((t) => normalizeEmail(t.email) !== email);
    const id = next.id ?? `local-${Date.now()}`;

    deduped.unshift({
      id,
      name: next.name,
      email: next.email,
      category: next.category,
      coursesTaught: next.coursesTaught,
      totalStudents: next.totalStudents,
      status: next.status,
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
  },
};
