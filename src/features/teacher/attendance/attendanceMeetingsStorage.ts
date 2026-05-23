export type MeetingModality = "online" | "in_person";

export type StoredAttendanceMeeting = {
  sessionId: string;
  createdAt: string;
  modality: MeetingModality;
  status?: "OPEN" | "CLOSED";
  endedAt?: string;
  endReason?: string;
  /** Instructor label, e.g. "Week 3 — Tuesday" */
  name: string;
  /** Opaque backend QR token; returned only when the session is created. */
  token?: string;
  /** 0-based row on the approved class schedule when QR was generated from the schedule dropdown. */
  scheduleSlotIndex?: number;
  /** Stable key for enrollment schedule row (date|time|title). */
  scheduleSlotKey?: string;
};

/** Check-in stays open for this long after the QR is generated (class start). */
export const ATTENDANCE_SESSION_MAX_MS = 2 * 60 * 60 * 1000 + 15 * 60 * 1000;

const MEETINGS_STORAGE_PREFIX = "eduhub_teacher_attendance_meetings_v1:";
export const MAX_STORED_MEETINGS = 48;

/** Same-tab listeners use this; `storage` fires only for other tabs. */
export const ATTENDANCE_MEETINGS_CHANGED = "eduhub-attendance-meetings-changed";

/** Same-tab: roster schedule filter asks the overview QR picker to jump to a session. */
export const ATTENDANCE_OVERVIEW_SESSION_SYNC = "eduhub-attendance-overview-sync-session";

export function pickStoredMeetingForScheduleSlot(
  meetings: StoredAttendanceMeeting[],
  slotLabel: string,
  slotDateIso?: string,
): StoredAttendanceMeeting | null {
  if (!meetings.length) return null;
  const label = slotLabel.trim().toLowerCase();
  if (label) {
    for (const m of meetings) {
      const name = m.name.trim().toLowerCase();
      const combined = formatMeetingOptionLabel(m).toLowerCase();
      if (name && (name === label || name.includes(label) || label.includes(name))) return m;
      if (combined.includes(label)) return m;
    }
  }
  const raw = slotDateIso?.trim();
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const monthDay = d.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toLowerCase();
      const ymd = d.toISOString().slice(0, 10);
      for (const m of meetings) {
        const opt = formatMeetingOptionLabel(m).toLowerCase();
        if (opt.includes(monthDay) || opt.includes(ymd)) return m;
      }
    }
  }
  return null;
}

export function meetingsStorageKey(courseId: string): string {
  return `${MEETINGS_STORAGE_PREFIX}${courseId}`;
}

export function buildAttendanceJoinUrl(
  courseId: string,
  sessionId: string,
  /** When set, embedded in the link/QR so student check-in can enforce the same time window on any device. */
  sessionStartedAt?: string,
): string {
  const params = new URLSearchParams({
    courseId,
    session: sessionId,
  });
  if (sessionStartedAt) params.set("startedAt", sessionStartedAt);
  const path = `/dashboard/attendance/join?${params.toString()}`;
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
        modality: (x.modality === "in_person" ? "in_person" : "online") as MeetingModality,
        status: (x.status === "CLOSED" ? "CLOSED" : x.status === "OPEN" ? "OPEN" : undefined) as
          | StoredAttendanceMeeting["status"]
          | undefined,
        endedAt: typeof x.endedAt === "string" ? x.endedAt : undefined,
        endReason: typeof x.endReason === "string" ? x.endReason : undefined,
        name: typeof x.name === "string" ? x.name.trim() : "",
        token: typeof x.token === "string" ? x.token.trim() : undefined,
        scheduleSlotIndex:
          typeof x.scheduleSlotIndex === "number" && x.scheduleSlotIndex >= 0
            ? Math.floor(x.scheduleSlotIndex)
            : undefined,
        scheduleSlotKey: typeof x.scheduleSlotKey === "string" ? x.scheduleSlotKey.trim() : undefined,
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
