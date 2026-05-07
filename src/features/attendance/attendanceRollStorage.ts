/**
 * Browser-local attendance roll: keyed by course + session (meeting id).
 * Same-origin localStorage syncs across tabs via the `storage` event (not across devices).
 * Replace with server API when available.
 */
export type AttendanceRollEntry = {
  checkedAt: string;
  email: string;
  fullName?: string;
};

const ROLL_KEY = "eduhub_attendance_roll_v1";
export const ATTENDANCE_ROLL_STORAGE_KEY = ROLL_KEY;
export const ATTENDANCE_ROLL_CHANGED = "eduhub-attendance-roll-changed";

/** Same-origin live sync between tabs/windows (more reliable than `storage` alone on some browsers). */
export const ATTENDANCE_ROLL_BROADCAST = "eduhub-attendance-roll-sync";

let broadcastSender: BroadcastChannel | null = null;

function broadcastCheckIn(courseId: string, sessionId: string) {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    if (!broadcastSender) broadcastSender = new BroadcastChannel(ATTENDANCE_ROLL_BROADCAST);
    broadcastSender.postMessage({ type: "check-in", courseId, sessionId } as const);
  } catch {
    /* ignore */
  }
}

type RollStore = Record<string, Record<string, Record<string, AttendanceRollEntry>>>;

function readStore(): RollStore {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(ROLL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as RollStore;
  } catch {
    return {};
  }
}

function writeStore(store: RollStore) {
  if (typeof localStorage === "undefined" || typeof window === "undefined") return;
  try {
    localStorage.setItem(ROLL_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("[attendance] Could not save roll to localStorage", e);
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ courseId?: string; sessionId?: string }>(ATTENDANCE_ROLL_CHANGED, {
      detail: {},
    }),
  );
}

export function recordAttendanceCheckIn(
  courseId: string,
  sessionId: string,
  studentKey: string,
  email: string,
  fullName?: string,
) {
  if (!courseId || !sessionId || !studentKey || !email) return;
  const store = readStore();
  const byCourse = store[courseId] ?? {};
  const bySession = { ...(byCourse[sessionId] ?? {}) };
  const entry: AttendanceRollEntry = {
    checkedAt: new Date().toISOString(),
    email: email.trim(),
    fullName: fullName?.trim() || undefined,
  };
  bySession[studentKey] = entry;
  const emailNorm = `email:${email.trim().toLowerCase()}`;
  if (emailNorm !== studentKey) {
    bySession[emailNorm] = entry;
  }
  store[courseId] = { ...byCourse, [sessionId]: bySession };
  writeStore(store);
  broadcastCheckIn(courseId, sessionId);
}

export function getRollForSession(courseId: string, sessionId: string): Record<string, AttendanceRollEntry> {
  if (!courseId || !sessionId) return {};
  return readStore()[courseId]?.[sessionId] ?? {};
}

/** Match roster student to roll by id, then by email. */
export function getPresentForStudent(
  courseId: string,
  sessionId: string,
  studentId: string,
  studentEmail: string,
): AttendanceRollEntry | undefined {
  const roll = getRollForSession(courseId, sessionId);
  const byId = roll[studentId];
  if (byId) return byId;
  const target = studentEmail.trim().toLowerCase();
  const byEmailKey = roll[`email:${target}`];
  if (byEmailKey) return byEmailKey;
  for (const entry of Object.values(roll)) {
    if (entry.email.trim().toLowerCase() === target) return entry;
  }
  return undefined;
}

export function countPresentForSession(courseId: string, sessionId: string): number {
  const roll = getRollForSession(courseId, sessionId);
  const seen = new Set<string>();
  for (const entry of Object.values(roll)) {
    seen.add(entry.email.trim().toLowerCase());
  }
  return seen.size;
}

/** Distinct meeting sessions the student has checked into (local roll only; same limits as other roll helpers). */
export function countSessionsStudentAttended(courseId: string, studentId: string, studentEmail: string): number {
  const byCourse = readStore()[courseId];
  if (!byCourse) return 0;
  let n = 0;
  for (const sessionId of Object.keys(byCourse)) {
    if (getPresentForStudent(courseId, sessionId, studentId, studentEmail)) n++;
  }
  return n;
}
