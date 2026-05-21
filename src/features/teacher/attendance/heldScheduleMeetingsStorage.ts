/** Matches a class schedule row across attendance QR and enrollment (date + time + title). */
export function scheduleSlotKeyFromParts(parts: {
  sessionDate?: string;
  sessionTime?: string;
  title?: string;
}): string {
  const date = (parts.sessionDate ?? "").trim().slice(0, 10);
  const time = (parts.sessionTime ?? "").trim();
  const title = (parts.title ?? "").trim();
  return `${date}|${time}|${title}`;
}

type StoredState = {
  held: string[];
  active: string[];
};

const STORAGE_PREFIX = "eduhub_held_schedule_meetings_v2:";

export const HELD_SCHEDULE_MEETINGS_CHANGED = "eduhub-held-schedule-meetings-changed";

function storageKey(courseId: string): string {
  return `${STORAGE_PREFIX}${courseId}`;
}

function emitChanged(courseId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ courseId: string }>(HELD_SCHEDULE_MEETINGS_CHANGED, { detail: { courseId } }),
  );
}

function loadState(courseId: string): StoredState {
  if (!courseId || typeof localStorage === "undefined") {
    return { held: [], active: [] };
  }
  try {
    const raw = localStorage.getItem(storageKey(courseId));
    if (!raw) return { held: [], active: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return { held: [], active: [] };
    }
    if (!parsed || typeof parsed !== "object") return { held: [], active: [] };
    const o = parsed as Record<string, unknown>;
    const held = Array.isArray(o.held)
      ? o.held.filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
    const active = Array.isArray(o.active)
      ? o.active.filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
    return { held, active };
  } catch {
    return { held: [], active: [] };
  }
}

function saveState(courseId: string, state: StoredState) {
  if (!courseId || typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey(courseId), JSON.stringify(state));
  emitChanged(courseId);
}

export function getScheduleAttendanceState(courseId: string): {
  heldSlotKeys: Set<string>;
  activeSlotKeys: Set<string>;
} {
  const { held, active } = loadState(courseId);
  return { heldSlotKeys: new Set(held), activeSlotKeys: new Set(active) };
}

/** QR is live for this schedule row — enrollment shows In progress. */
export function markScheduleSlotActive(courseId: string, slotKey: string): void {
  const key = slotKey.trim();
  if (!key || key === "||") return;
  const state = loadState(courseId);
  const active = state.active.includes(key) ? state.active : [...state.active, key];
  saveState(courseId, { held: state.held, active });
}

/** Instructor ended QR — row is held (Finished for enrollment). */
export function markScheduleSlotHeld(courseId: string, slotKey: string): void {
  const key = slotKey.trim();
  if (!key || key === "||") return;
  const state = loadState(courseId);
  const held = state.held.includes(key) ? state.held : [...state.held, key];
  const active = state.active.filter((k) => k !== key);
  saveState(courseId, { held, active });
}

/** @deprecated Use slot keys; kept for callers that only have 1-based index. */
export function markScheduleMeetingHeld(courseId: string, meetingNumber: number): void {
  void courseId;
  void meetingNumber;
}
