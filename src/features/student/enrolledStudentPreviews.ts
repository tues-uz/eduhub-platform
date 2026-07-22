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
  const rows = await eduhubCourses.getEnrolledStudents(courseId, 0, MAX_AVATARS);
  return dedupeByEmail(
    rows.map((row) => ({
      id: row.id,
      name: row.fullName,
      avatarUrl: row.avatarUrl?.trim() || undefined,
    })),
  );
}

export async function resolveEnrolledStudentPreviews(opts: {
  apiCourseId: string;
  enrollmentCount?: number;
}): Promise<{ students: StudentAvatarPreview[]; totalCount?: number }> {
  if (opts.enrollmentCount === 0) {
    return { students: [], totalCount: 0 };
  }

  try {
    const students = await fetchApiEnrolledStudentPreviews(opts.apiCourseId);
    if (students.length === 0) return { students: [] };
    return {
      students,
      totalCount: opts.enrollmentCount ?? students.length,
    };
  } catch {
    return { students: [] };
  }
}
