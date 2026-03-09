const STORAGE_KEY = "eduhub_lesson_completion";

type CompletionMap = Record<string, string[]>;

function load(): CompletionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CompletionMap;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function save(data: CompletionMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const lessonProgressStore = {
  isComplete(courseId: string, lessonId: string): boolean {
    const data = load();
    const ids = data[courseId];
    return Array.isArray(ids) ? ids.includes(lessonId) : false;
  },

  markComplete(courseId: string, lessonId: string): void {
    const data = load();
    const ids = data[courseId] ?? [];
    if (!ids.includes(lessonId)) {
      data[courseId] = [...ids, lessonId];
      save(data);
    }
  },

  unmarkComplete(courseId: string, lessonId: string): void {
    const data = load();
    const ids = data[courseId];
    if (Array.isArray(ids)) {
      data[courseId] = ids.filter((id) => id !== lessonId);
      save(data);
    }
  },

  getCompletedIds(courseId: string): string[] {
    const data = load();
    const ids = data[courseId];
    return Array.isArray(ids) ? [...ids] : [];
  },
};
