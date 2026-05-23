import { eduhubCourses } from "@/api/eduhubClient";
import { enrollmentApplicationStore } from "@/features/enrollment/enrollmentApplicationStore";
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

export function listLocalApprovedStudents(courseId: string): StudentAvatarPreview[] {
  const seen = new Set<string>();
  return enrollmentApplicationStore
    .list()
    .filter((application) => application.courseId === courseId && application.status === "APPROVED")
    .filter((application) => {
      const email = application.applicantEmailNorm.trim().toLowerCase();
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    })
    .slice(0, MAX_AVATARS)
    .map((application) => ({
      id: application.id,
      name: application.fullName,
    }));
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
  linkId: string;
  apiCourseId: string;
  enrollmentCount?: number;
}): Promise<{ students: StudentAvatarPreview[]; totalCount?: number }> {
  if (opts.linkId.startsWith("teacher_")) {
    const students = listLocalApprovedStudents(opts.linkId);
    return students.length ? { students, totalCount: students.length } : { students: [] };
  }

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
