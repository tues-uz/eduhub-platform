import { instructorProfileAvatarsStore } from "@/features/teacher/data/instructorProfileAvatarsStore";
import { teacherCoursesStore } from "@/features/teacher/data/teacherCoursesStore";

/** Persist instructor avatar for catalog cards and sync matching local teacher courses. */
export function syncInstructorProfileAvatar(
  email: string,
  name: string,
  avatarUrl: string | undefined,
): void {
  instructorProfileAvatarsStore.set(email, name, avatarUrl);

  const nameNorm = name.trim().toLowerCase();
  if (!nameNorm) return;

  for (const course of teacherCoursesStore.getAll()) {
    if (course.instructorName.trim().toLowerCase() !== nameNorm) continue;
    teacherCoursesStore.update(course.id, { instructorAvatarUrl: avatarUrl?.trim() || undefined });
  }
}
