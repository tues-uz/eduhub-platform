import { eduhubCourses } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";

const CACHE_KEY = "eduhub_published_available_courses_v1";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const PUBLISHED_AVAILABLE_COURSES_CACHE_CHANGED =
  "eduhub-published-available-courses-changed";

type CachePayload = {
  savedAt: number;
  courses: CourseSummaryResponse[];
};

export function readPublishedAvailableCoursesCache(): CourseSummaryResponse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed?.savedAt || !Array.isArray(parsed.courses)) return [];
    if (Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return [];
    return parsed.courses;
  } catch {
    return [];
  }
}

function writeCache(courses: CourseSummaryResponse[]) {
  if (typeof window === "undefined" || courses.length === 0) return;
  try {
    const payload: CachePayload = { savedAt: Date.now(), courses };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event(PUBLISHED_AVAILABLE_COURSES_CACHE_CHANGED));
  } catch {
    // Ignore quota / private mode.
  }
}

function normalizeList(rows: CourseSummaryResponse[] | null | undefined): CourseSummaryResponse[] {
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((c) => {
    if (!c?.id || !c?.title) return false;
    if (c.status && c.status !== "PUBLISHED") return false;
    return true;
  });
}

/**
 * Prefer live Available Classes (student catalog), then a short-lived local cache
 * (so the landing section doesn't flash empty on a slow/failed request). Returns
 * an empty array — never fabricated data — when neither source has anything.
 */
export async function fetchPublishedAvailableCourses(
  size = 100,
): Promise<CourseSummaryResponse[]> {
  try {
    const rows = normalizeList(await eduhubCourses.getAll({ page: 0, size }));
    if (rows.length > 0) {
      writeCache(rows);
      return rows;
    }
  } catch {
    // Guests get 401.
  }

  try {
    const rows = normalizeList(await eduhubCourses.getAvailableCourses({ page: 0, size }));
    if (rows.length > 0) {
      writeCache(rows);
      return rows;
    }
  } catch {
    // Fall through.
  }

  return readPublishedAvailableCoursesCache();
}
