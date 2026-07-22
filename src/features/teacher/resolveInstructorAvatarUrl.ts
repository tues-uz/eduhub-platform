import { eduhubCourses } from "@/api/eduhubClient";
import { instructorProfileAvatarsStore } from "@/features/teacher/data/instructorProfileAvatarsStore";

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
}): Promise<string | undefined> {
  const existing = opts.existingUrl?.trim();
  if (existing) return existing;

  const stored = lookupStoredAvatar(opts.instructorName, opts.instructorEmail);
  if (stored) return stored;

  if (opts.courseId) {
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
