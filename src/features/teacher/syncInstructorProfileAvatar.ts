import { instructorProfileAvatarsStore } from "@/features/teacher/data/instructorProfileAvatarsStore";

/** Persist instructor avatar for catalog cards. */
export function syncInstructorProfileAvatar(
  email: string,
  name: string,
  avatarUrl: string | undefined,
): void {
  instructorProfileAvatarsStore.set(email, name, avatarUrl);
}
