const memorySeenSet = new Set<string>();

function key(courseId?: string | null, emailNorm?: string | null): string {
  return `${(courseId ?? "").trim()}__${(emailNorm ?? "").trim().toLowerCase()}`;
}

export function hasSeenCourseCongrats(courseId?: string | null, emailNorm?: string | null): boolean {
  if (!courseId?.trim() || !emailNorm?.trim()) return false;
  return memorySeenSet.has(key(courseId, emailNorm));
}

export function markCourseCongratsSeen(courseId?: string | null, emailNorm?: string | null): void {
  if (!courseId?.trim() || !emailNorm?.trim()) return;
  memorySeenSet.add(key(courseId, emailNorm));
}

