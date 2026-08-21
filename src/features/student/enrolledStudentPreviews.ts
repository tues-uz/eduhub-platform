import { eduhubCourses } from "@/api/eduhubClient";
import type { StudentAvatarPreview } from "@/components/StudentAvatarGroup";

const MAX_AVATARS = 4;

function dedupeByEmail(students: StudentAvatarPreview[]): StudentAvatarPreview[] {
  const seen = new Set<string>();
  return students.filter((student) => {
    const key = student.id.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchApiEnrolledStudentPreviews(
  courseId: string,
): Promise<StudentAvatarPreview[]> {
  const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
  if (role !== "admin" && role !== "teacher") {
    return [];
  }
  try {
    const rows = await eduhubCourses.getEnrolledStudents(courseId, 0, MAX_AVATARS);
    return dedupeByEmail(
      rows.map((row) => ({
        id: row.id,
        name: row.fullName,
        avatarUrl: row.avatarUrl?.trim() || undefined,
      })),
    );
  } catch {
    return [];
  }
}

export async function resolveEnrolledStudentPreviews(opts: {
  apiCourseId: string;
  enrollmentCount?: number;
}): Promise<{ students: StudentAvatarPreview[]; totalCount: number }> {
  const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
  if (role !== "admin" && role !== "teacher") {
    return {
      students: [],
      totalCount: opts.enrollmentCount ?? 0,
    };
  }
  try {
    const students = await fetchApiEnrolledStudentPreviews(opts.apiCourseId);
    return {
      students,
      totalCount: opts.enrollmentCount ?? students.length,
    };
  } catch {
    return {
      students: [],
      totalCount: opts.enrollmentCount ?? 0,
    };
  }
}
