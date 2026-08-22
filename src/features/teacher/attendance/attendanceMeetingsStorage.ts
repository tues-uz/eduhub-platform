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
  /** Opaque backend QR token; the backend re-exposes it for OPEN sessions to the lecturer/admin (see
   * `AttendanceService.listSessions`), but this local copy from create-time avoids an extra round trip. */
  token?: string;
  /** 0-based row on the approved class schedule when QR was generated from the schedule dropdown. */
  scheduleSlotIndex?: number;
  /** Stable key for enrollment schedule row (date|time|title). */
  scheduleSlotKey?: string;
  /** Students checked in so far for this session (from backend). */
  presentCount?: number;
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
  scheduleSlotIndex?: number,
  scheduleSlotKey?: string,
): StoredAttendanceMeeting | null {
  if (!meetings.length) return null;

  if (typeof scheduleSlotIndex === "number" && scheduleSlotIndex >= 0) {
    const byIndex = meetings.find((m) => m.scheduleSlotIndex === scheduleSlotIndex);
    if (byIndex) return byIndex;
  }

  const key = scheduleSlotKey?.trim();
  if (key) {
    const byKey = meetings.find((m) => m.scheduleSlotKey?.trim() === key);
    if (byKey) return byKey;
  }

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

/**
 * sessionStorage only (tab refresh recovery). `listSessions` does return the token for OPEN
 * sessions to staff, but only after a network round trip — this cache lets a refresh show the
 * QR immediately, and covers the closed/expired case where the backend no longer returns it.
 */
const QR_TOKEN_STORAGE_KEY = "eduhub_attendance_qr_tokens_v1";

type QrTokenMap = Record<string, string>;

function readQrTokenMap(): QrTokenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(QR_TOKEN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as QrTokenMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeQrTokenMap(map: QrTokenMap) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(QR_TOKEN_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota / private mode.
  }
}

function qrTokenStorageId(courseId: string, sessionId: string): string {
  return `${courseId.trim()}:${sessionId.trim()}`;
}

/** Persist a just-created QR token so an accidental refresh can still show the code. */
export function rememberAttendanceQrToken(courseId: string, sessionId: string, token: string) {
  const c = courseId.trim();
  const s = sessionId.trim();
  const t = token.trim();
  if (!c || !s || !t) return;
  const map = readQrTokenMap();
  map[qrTokenStorageId(c, s)] = t;
  writeQrTokenMap(map);
}

export function readAttendanceQrToken(courseId: string, sessionId: string): string | undefined {
  const id = qrTokenStorageId(courseId, sessionId);
  const t = readQrTokenMap()[id]?.trim();
  return t || undefined;
}

export function forgetAttendanceQrToken(courseId: string, sessionId: string) {
  const id = qrTokenStorageId(courseId, sessionId);
  const map = readQrTokenMap();
  if (!(id in map)) return;
  delete map[id];
  writeQrTokenMap(map);
}

/** Live class meetings from the backend, with create-time QR tokens merged from sessionStorage. */
export async function fetchAttendanceMeetings(courseId: string): Promise<StoredAttendanceMeeting[]> {
  if (!courseId) return [];
  const sessions = await eduhubAttendance.listSessions(courseId);
  return sessions.slice(0, MAX_STORED_MEETINGS).map((s) => {
    const fromApi = typeof s.token === "string" ? s.token.trim() : "";
    const fromTab = readAttendanceQrToken(courseId, s.id);
    const token = fromApi || fromTab;
    return {
      sessionId: s.id,
      createdAt: s.startedAt,
      modality: (s.modality === "IN_PERSON" ? "in_person" : "online") as MeetingModality,
      status: s.status,
      endedAt: s.endedAt ?? undefined,
      endReason: s.endReason ?? undefined,
      name: s.meetingName,
      scheduleSlotIndex: s.scheduleSlotIndex ?? undefined,
      scheduleSlotKey: s.scheduleSlotKey ?? undefined,
      presentCount: s.presentCount ?? undefined,
      ...(token ? { token } : {}),
    };
  });
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
    case "SUPERSEDED":
      return "Closed automatically (new QR started on another class)";
    default:
      return reason;
  }
}
