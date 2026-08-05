const memorySeenSet = new Set<string>();

function key(courseId: string, emailNorm: string): string {
  return `${courseId.trim()}__${emailNorm.trim().toLowerCase()}`;
}

export function hasSeenCourseCongrats(courseId: string, emailNorm: string): boolean {
  if (!courseId.trim() || !emailNorm.trim()) return false;
  return memorySeenSet.has(key(courseId, emailNorm));
}

export function markCourseCongratsSeen(courseId: string, emailNorm: string): void {
  if (!courseId.trim() || !emailNorm.trim()) return;
  memorySeenSet.add(key(courseId, emailNorm));
}

