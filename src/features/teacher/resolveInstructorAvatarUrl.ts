import { eduhubCourses } from "@/api/eduhubClient";
import { instructorProfileAvatarsStore } from "@/features/teacher/data/instructorProfileAvatarsStore";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";

function lookupStoredAvatar(instructorName?: string, instructorEmail?: string): string | undefined {
  if (instructorEmail) {
    const byEmail = instructorProfileAvatarsStore.getByEmail(instructorEmail);
    if (byEmail) return byEmail;
  }
  if (instructorName) {
    const byName = instructorProfileAvatarsStore.getByName(instructorName);
    if (byName) return byName;
  }
  return undefined;
}

export async function resolveInstructorAvatarUrl(opts: {
  instructorName: string;
  instructorEmail?: string;
  existingUrl?: string;
  courseId?: string;
  linkId?: string;
}): Promise<string | undefined> {
  const existing = opts.existingUrl?.trim();
  if (existing) return existing;

  if (opts.linkId?.startsWith("teacher_")) {
    const localId = opts.linkId.slice("teacher_".length);
    const localUrl = teacherCoursesStore.getById(localId)?.instructorAvatarUrl?.trim();
    if (localUrl) return localUrl;
  }

  const stored = lookupStoredAvatar(opts.instructorName, opts.instructorEmail);
  if (stored) return stored;

  if (opts.courseId && !opts.linkId?.startsWith("teacher_")) {
    try {
      const detail = await eduhubCourses.getById(opts.courseId);
      const apiUrl = detail.lecturer?.avatarUrl?.trim();
      if (apiUrl) return apiUrl;

      return lookupStoredAvatar(
        detail.lecturer?.fullName?.trim() || opts.instructorName,
        detail.lecturer?.email,
      );
    } catch {
      /* API unavailable or course missing */
    }
  }

  return lookupStoredAvatar(opts.instructorName);
}
