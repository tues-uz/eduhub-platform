import { eduhubAttendance } from "@/api/eduhubClient";

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
  /** Opaque backend QR token; only known in-memory for a session created in this tab (backend never re-exposes it). */
  token?: string;
  /** 0-based row on the approved class schedule when QR was generated from the schedule dropdown. */
  scheduleSlotIndex?: number;
  /** Stable key for enrollment schedule row (date|time|title). */
  scheduleSlotKey?: string;
};

/** Check-in stays open for this long after the QR is generated (class start). */
export const ATTENDANCE_SESSION_MAX_MS = 2 * 60 * 60 * 1000 + 15 * 60 * 1000;

export const MAX_STORED_MEETINGS = 48;

/** Same-tab: attendance sessions changed (new QR generated, session stopped) for a course. */
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

/** Live class meetings (attendance QR sessions) for a course — always fetched from the backend,
 * never cached in localStorage. The one-time QR `token` is never included here (the backend only
 * returns it at creation); callers that need to preserve a just-created token should merge it in
 * from their own in-memory state. */
export async function fetchAttendanceMeetings(courseId: string): Promise<StoredAttendanceMeeting[]> {
  if (!courseId) return [];
  const sessions = await eduhubAttendance.listSessions(courseId);
  return sessions.slice(0, MAX_STORED_MEETINGS).map((s) => ({
    sessionId: s.id,
    createdAt: s.startedAt,
    modality: s.modality === "IN_PERSON" ? "in_person" : "online",
    status: s.status,
    endedAt: s.endedAt ?? undefined,
    endReason: s.endReason ?? undefined,
    name: s.meetingName,
    scheduleSlotIndex: s.scheduleSlotIndex ?? undefined,
    scheduleSlotKey: s.scheduleSlotKey ?? undefined,
  }));
}

export function formatMeetingOptionLabel(m: StoredAttendanceMeeting): string {
  const d = new Date(m.createdAt);
  const when = d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const where = m.modality === "online" ? "Online" : "In person";
  const label = m.name.trim() || "Unnamed meeting";
  return `${label} · ${when} · ${where}`;
}

export function formatDurationMs(ms: number): string {
  const sec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Backend `AttendanceSession.endReason` values (`AttendanceService.java`) → human label. */
export function endReasonLabel(reason: string): string {
  switch (reason) {
    case "MAX_DURATION":
      return "2h 15m window ended";
    case "NEW_SESSION":
      return "New QR / next meeting";
    case "MANUAL_STOP":
      return "Stopped by instructor";
    default:
      return reason;
  }
}
