import type { ClassMeetingSlotDto, ScheduleProposalResponse } from "@/api/eduhubTypes";

const STORAGE_KEY = "eduhub_public_course_schedule_v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

type CachedSchedule = {
  savedAt: number;
  sessions: ClassMeetingSlotDto[];
  sessionCount: number;
};

type Store = Record<string, CachedSchedule>;

function readAll(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(next: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private mode.
  }
}

export function writePublicCourseScheduleCache(
  courseId: string,
  sessions: ClassMeetingSlotDto[],
): void {
  if (!courseId) return;
  const cleaned = sessions
    .map((s) => ({
      title: s.title?.trim() || undefined,
      sessionDate: s.sessionDate?.trim() || undefined,
      sessionTime: s.sessionTime?.trim() || undefined,
    }))
    .filter((s) => Boolean(s.sessionDate));
  if (cleaned.length === 0) return;
  const all = readAll();
  all[courseId] = {
    savedAt: Date.now(),
    sessions: cleaned,
    sessionCount: cleaned.length,
  };
  writeAll(all);
}

export function readPublicCourseScheduleCache(courseId: string): ScheduleProposalResponse | null {
  if (!courseId) return null;
  const row = readAll()[courseId];
  if (!row?.sessions?.length) return null;
  if (Date.now() - row.savedAt > MAX_AGE_MS) return null;
  return {
    id: `cached-schedule-${courseId}`,
    courseId,
    proposedByName: "",
    sessionCount: row.sessionCount || row.sessions.length,
    sessions: row.sessions.map((s, i) => ({
      id: `cached-session-${courseId}-${i}`,
      sessionIndex: i + 1,
      title: s.title || `Session ${i + 1}`,
      sessionDate: s.sessionDate,
      sessionTime: s.sessionTime,
    })),
    createdAt: new Date(row.savedAt).toISOString(),
  };
}
