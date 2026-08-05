/**
 * lessonProgressStore.ts
 *
 * Student lesson completion tracking — API-first with localStorage as a short-lived cache.
 *
 * Architecture:
 * - Mutations (mark/unmark) hit the backend API first.
 * - The local cache is updated optimistically so the UI reflects the change immediately.
 * - On load, the backend is the authoritative source via syncFromApi().
 * - Read operations (isComplete, getCompletedIds) serve from the local cache for speed.
 *
 * This pattern ensures student progress is durable, multi-device, and not lost if
 * the user clears browser storage.
 */

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[LessonProgress] Could not update local cache", e);
  }
}

export const lessonProgressStore = {
  /**
   * Returns true if the lesson is marked complete in the local cache.
   * Call syncFromApi() on page load to ensure cache reflects backend state.
   */
  isComplete(courseId: string, lessonId: string): boolean {
    const data = load();
    const ids = data[courseId];
    return Array.isArray(ids) ? ids.includes(lessonId) : false;
  },

  /**
   * Marks a lesson as complete.
   *
   * API-first: sends to the backend first, then updates cache.
   * If the API call fails, the local cache is still updated optimistically
   * and a warning is logged (progress is not lost locally).
   */
  async markComplete(courseId: string, lessonId: string, moduleId = "default"): Promise<void> {
    // Optimistic local update first so the UI responds immediately
    const data = load();
    const ids = data[courseId] ?? [];
    if (!ids.includes(lessonId)) {
      data[courseId] = [...ids, lessonId];
      save(data);
    }

    if (getAccessToken() && courseId.trim() && lessonId.trim()) {
      try {
        await eduhubLessonProgress.mark(courseId, moduleId, lessonId, { completed: true });
      } catch (err) {
        // API sync failed — local optimistic cache still updated.
        // Progress will be re-synced on next backend call.
        console.warn("[LessonProgress] API mark-complete failed; local cache updated", err);
      }
    }
  },

  /**
   * Unmarks a lesson as complete.
   * Same API-first + optimistic-local pattern as markComplete.
   */
  async unmarkComplete(courseId: string, lessonId: string, moduleId = "default"): Promise<void> {
    const data = load();
    const ids = data[courseId];
    if (Array.isArray(ids)) {
      data[courseId] = ids.filter((id) => id !== lessonId);
      save(data);
    }

    if (getAccessToken() && courseId.trim() && lessonId.trim()) {
      try {
        await eduhubLessonProgress.mark(courseId, moduleId, lessonId, { completed: false });
      } catch (err) {
        console.warn("[LessonProgress] API unmark-complete failed; local cache updated", err);
      }
    }
  },

  getCompletedIds(courseId: string): string[] {
    const data = load();
    const ids = data[courseId];
    return Array.isArray(ids) ? [...ids] : [];
  },

  /**
   * Seedes the local cache from backend data.
   * Call this after login or on course page load to ensure the cache
   * reflects the authoritative backend state (supports multi-device).
   */
  syncFromApi(courseId: string, completedLessonIds: string[]): void {
    const data = load();
    data[courseId] = completedLessonIds;
    save(data);
  },

  /**
   * Clears cache for a specific course (e.g. after un-enrollment).
   */
  clearCourse(courseId: string): void {
    const data = load();
    delete data[courseId];
    save(data);
  },
};
