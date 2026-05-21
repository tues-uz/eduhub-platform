const STORAGE_PREFIX = "eduhub_course_congrats_seen__";

function storageKey(courseId: string, emailNorm: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(courseId)}__${emailNorm.trim().toLowerCase()}`;
}

export function hasSeenCourseCongrats(courseId: string, emailNorm: string): boolean {
  if (typeof window === "undefined" || !courseId.trim() || !emailNorm.trim()) return false;
  try {
    return localStorage.getItem(storageKey(courseId, emailNorm)) === "1";
  } catch {
    return false;
  }
}

export function markCourseCongratsSeen(courseId: string, emailNorm: string): void {
  if (typeof window === "undefined" || !courseId.trim() || !emailNorm.trim()) return;
  try {
    localStorage.setItem(storageKey(courseId, emailNorm), "1");
  } catch {
    /* ignore quota */
  }
}
