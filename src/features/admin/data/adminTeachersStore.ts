import { eduhubAdmin, getAccessToken } from "@/api/eduhubClient";

export interface AdminTeacherCourseRef {
  id: string;
  title: string;
  enrolled: number;
  capacity: number;
}

export interface AdminTeacherRow {
  id: string;
  name: string;
  email: string;
  category?: string;
  coursesTaught: AdminTeacherCourseRef[];
  totalStudents: number;
  status: "Active" | "Inactive";
}

let inMemoryTeachers: AdminTeacherRow[] = [];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const adminTeachersStore = {
  getAll(): AdminTeacherRow[] {
    return [...inMemoryTeachers];
  },

  upsertByEmail(next: Omit<AdminTeacherRow, "id"> & { id?: string }): void {
    const email = normalizeEmail(next.email);
    if (!email) return;

    inMemoryTeachers = inMemoryTeachers.filter((t) => normalizeEmail(t.email) !== email);
    const id = next.id ?? `teacher-${Date.now()}`;

    inMemoryTeachers.unshift({
      id,
      name: next.name,
      email: next.email,
      category: next.category,
      coursesTaught: next.coursesTaught,
      totalStudents: next.totalStudents,
      status: next.status,
    });

    if (getAccessToken() && next.email.trim()) {
      void eduhubAdmin
        .createUser({
          fullName: next.name,
          email: next.email,
          phoneNumber: "+998900000000",
          role: "LECTURER",
          category: next.category,
        })
        .catch((err) => {
          console.warn("[AdminTeachersStore] Backend teacher creation sync failed", err);
        });
    }
  },
};

