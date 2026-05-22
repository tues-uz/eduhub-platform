const STORAGE_KEY = "eduhub_attendance_session_logs_v1";
export const MAX_ATTENDANCE_SESSION_LOGS = 200;
export const ATTENDANCE_SESSION_LOGS_CHANGED = "eduhub-attendance-session-logs-changed";

export type AttendanceSessionEndReason = "max_duration" | "new_session" | "course_changed" | "manual_stop";

export type AttendanceSessionLogEntry = {
  id: string;
  courseId: string;
  courseTitle: string;
  sessionId: string;
  meetingName: string;
  instructorId?: string;
  instructorEmail: string;
  instructorName: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  endReason?: AttendanceSessionEndReason;
};

function emitChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ATTENDANCE_SESSION_LOGS_CHANGED));
}

function load(): AttendanceSessionLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is AttendanceSessionLogEntry => !!x && typeof x === "object");
  } catch {
    return [];
  }
}

function save(rows: AttendanceSessionLogEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  emitChanged();
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

export function endReasonLabel(reason: AttendanceSessionEndReason): string {
  switch (reason) {
    case "max_duration":
      return "2h 15m window ended";
    case "new_session":
      return "New QR / next meeting";
    case "course_changed":
      return "Switched class";
    case "manual_stop":
      return "Stopped by instructor";
    default:
      return String(reason);
  }
}

export function startSessionLog(params: {
  courseId: string;
  courseTitle: string;
  sessionId: string;
  meetingName: string;
  instructorId?: string;
  instructorEmail: string;
  instructorName: string;
}): AttendanceSessionLogEntry {
  const entry: AttendanceSessionLogEntry = {
    id: crypto.randomUUID(),
    courseId: params.courseId,
    courseTitle: params.courseTitle,
    sessionId: params.sessionId,
    meetingName: params.meetingName,
    instructorId: params.instructorId,
    instructorEmail: params.instructorEmail.trim(),
    instructorName: params.instructorName.trim(),
    startedAt: new Date().toISOString(),
  };
  const all = load();
  all.unshift(entry);
  save(all.slice(0, MAX_ATTENDANCE_SESSION_LOGS));
  return entry;
}

export function finalizeSessionLog(params: {
  courseId: string;
  sessionId: string;
  endReason: AttendanceSessionEndReason;
  endedAt?: string;
}): AttendanceSessionLogEntry | null {
  const endedAt = params.endedAt ?? new Date().toISOString();
  const all = load();
  const idx = all.findIndex(
    (x) => x.courseId === params.courseId && x.sessionId === params.sessionId && !x.endedAt,
  );
  if (idx === -1) return null;
  const row = all[idx];
  const startMs = new Date(row.startedAt).getTime();
  const endMs = new Date(endedAt).getTime();
  const durationMs = Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(0, endMs - startMs) : 0;
  const updated: AttendanceSessionLogEntry = {
    ...row,
    endedAt,
    durationMs,
    endReason: params.endReason,
  };
  all[idx] = updated;
  save(all);
  return updated;
}

/**
 * When no session log row exists (e.g. meeting created before logging), create a completed row
 * so Stop / timers still record duration. Skips if any row already exists for this course+session.
 */
export function backfillCompletedSessionLog(params: {
  courseId: string;
  courseTitle: string;
  sessionId: string;
  meetingName: string;
  instructorId?: string;
  instructorEmail: string;
  instructorName: string;
  /** Should match QR `createdAt` / student link `startedAt`. */
  sessionStartedAtIso: string;
  endReason: AttendanceSessionEndReason;
}): AttendanceSessionLogEntry | null {
  const all = load();
  if (all.some((x) => x.courseId === params.courseId && x.sessionId === params.sessionId)) {
    return null;
  }
  const endedAt = new Date().toISOString();
  const startMs = new Date(params.sessionStartedAtIso).getTime();
  const endMs = new Date(endedAt).getTime();
  const durationMs = Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(0, endMs - startMs) : 0;
  const entry: AttendanceSessionLogEntry = {
    id: crypto.randomUUID(),
    courseId: params.courseId,
    courseTitle: params.courseTitle,
    sessionId: params.sessionId,
    meetingName: params.meetingName,
    instructorId: params.instructorId,
    instructorEmail: params.instructorEmail.trim(),
    instructorName: params.instructorName.trim(),
    startedAt: params.sessionStartedAtIso,
    endedAt,
    durationMs,
    endReason: params.endReason,
  };
  all.unshift(entry);
  save(all.slice(0, MAX_ATTENDANCE_SESSION_LOGS));
  return entry;
}

/** Ends every session for this class that is still open (e.g. instructor switched course in the dropdown). */
export function finalizeOpenSessionsForCourse(
  courseId: string,
  endReason: AttendanceSessionEndReason,
): AttendanceSessionLogEntry[] {
  const now = new Date().toISOString();
  const all = load();
  const out: AttendanceSessionLogEntry[] = [];
  let changed = false;
  const next = all.map((row) => {
    if (row.courseId === courseId && !row.endedAt) {
      changed = true;
      const startMs = new Date(row.startedAt).getTime();
      const endMs = new Date(now).getTime();
      const durationMs = Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(0, endMs - startMs) : 0;
      const updated = { ...row, endedAt: now, durationMs, endReason };
      out.push(updated);
      return updated;
    }
    return row;
  });
  if (changed) save(next);
  return out;
}

export function listAttendanceSessionLogs(): AttendanceSessionLogEntry[] {
  return load();
}

export function listAttendanceSessionLogsForInstructor(emailNorm: string, instructorName?: string): AttendanceSessionLogEntry[] {
  const e = emailNorm.trim().toLowerCase();
  const name = instructorName?.trim().toLowerCase() ?? "";
  return load().filter((row) => {
    const emailMatch = row.instructorEmail.trim().toLowerCase() === e && e.length > 0;
    const nameMatch =
      name.length > 0 && row.instructorName.trim().toLowerCase() === name && (!e || !row.instructorEmail.trim());
    return emailMatch || nameMatch;
  });
}
