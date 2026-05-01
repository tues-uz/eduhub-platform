export type MeetingModality = "online" | "in_person";

export type StoredAttendanceMeeting = {
  sessionId: string;
  createdAt: string;
  modality: MeetingModality;
  /** Instructor label, e.g. "Week 3 — Tuesday" */
  name: string;
};

const MEETINGS_STORAGE_PREFIX = "eduhub_teacher_attendance_meetings_v1:";
export const MAX_STORED_MEETINGS = 48;

/** Same-tab listeners use this; `storage` fires only for other tabs. */
export const ATTENDANCE_MEETINGS_CHANGED = "eduhub-attendance-meetings-changed";

export function meetingsStorageKey(courseId: string): string {
  return `${MEETINGS_STORAGE_PREFIX}${courseId}`;
}

export function buildAttendanceJoinUrl(courseId: string, sessionId: string): string {
  const path = `/dashboard/attendance/join?courseId=${encodeURIComponent(courseId)}&session=${encodeURIComponent(sessionId)}`;
  return `${typeof window !== "undefined" ? window.location.origin : ""}${path}`;
}

export function loadStoredMeetings(courseId: string): StoredAttendanceMeeting[] {
  if (!courseId || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(meetingsStorageKey(courseId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is Record<string, unknown> =>
          !!x && typeof x === "object" && typeof (x as Record<string, unknown>).sessionId === "string",
      )
      .map((x) => ({
        sessionId: String(x.sessionId),
        createdAt: typeof x.createdAt === "string" ? x.createdAt : new Date().toISOString(),
        modality: x.modality === "in_person" ? "in_person" : "online",
        name: typeof x.name === "string" ? x.name.trim() : "",
      }))
      .slice(0, MAX_STORED_MEETINGS);
  } catch {
    return [];
  }
}

export function persistMeetings(courseId: string, meetings: StoredAttendanceMeeting[]) {
  if (!courseId || typeof localStorage === "undefined") return;
  const trimmed = meetings.slice(0, MAX_STORED_MEETINGS);
  localStorage.setItem(meetingsStorageKey(courseId), JSON.stringify(trimmed));
  window.dispatchEvent(
    new CustomEvent<{ courseId: string }>(ATTENDANCE_MEETINGS_CHANGED, { detail: { courseId } }),
  );
}

export function formatMeetingOptionLabel(m: StoredAttendanceMeeting): string {
  const d = new Date(m.createdAt);
  const when = d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const where = m.modality === "online" ? "Online" : "In person";
  const label = m.name.trim() || "Unnamed meeting";
  return `${label} · ${when} · ${where}`;
}
