import { eduhubLessonProgress, getAccessToken } from "@/api/eduhubClient";

const STORAGE_KEY = "eduhub_lesson_completion";

type CompletionMap = Record<string, string[]>;

function load(): CompletionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as CompletionMap) : {};
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

  markComplete(courseId: string, lessonId: string, moduleId = "default"): void {
    const data = load();
    const ids = data[courseId] ?? [];
    if (!ids.includes(lessonId)) {
      data[courseId] = [...ids, lessonId];
      save(data);
    }

    if (getAccessToken() && courseId.trim() && lessonId.trim()) {
      void eduhubLessonProgress
        .mark(courseId, moduleId, lessonId, { completed: true })
        .catch((err) => {
          console.warn("[LessonProgress] API sync failed, saved locally", err);
        });
    }
  },

  unmarkComplete(courseId: string, lessonId: string, moduleId = "default"): void {
    const data = load();
    const ids = data[courseId];
    if (Array.isArray(ids)) {
      data[courseId] = ids.filter((id) => id !== lessonId);
      save(data);
    }

    if (getAccessToken() && courseId.trim() && lessonId.trim()) {
      void eduhubLessonProgress
        .mark(courseId, moduleId, lessonId, { completed: false })
        .catch((err) => {
          console.warn("[LessonProgress] API unmark sync failed", err);
        });
    }
  },

  getCompletedIds(courseId: string): string[] {
    const data = load();
    const ids = data[courseId];
    return Array.isArray(ids) ? [...ids] : [];
  },
};
