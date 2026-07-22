import { eduhubAttendance } from "@/api/eduhubClient";
import type { AttendanceSessionResponse } from "@/api/eduhubTypes";

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

export const HELD_SCHEDULE_MEETINGS_CHANGED = "eduhub-held-schedule-meetings-changed";

type CachedState = {
  heldSlotKeys: Set<string>;
  activeSlotKeys: Set<string>;
};

const EMPTY_STATE: CachedState = { heldSlotKeys: new Set(), activeSlotKeys: new Set() };

/** Backend attendance sessions are the source of truth: a schedule row is "held" once its QR
 * session is CLOSED (instructor stopped it, or the check-in window elapsed) and "active" while
 * its QR session is still OPEN. Cache is in-memory only — refreshed from the API, never localStorage. */
const cache = new Map<string, CachedState>();
const inflight = new Map<string, Promise<CachedState>>();

function emitChanged(courseId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ courseId: string }>(HELD_SCHEDULE_MEETINGS_CHANGED, { detail: { courseId } }),
  );
}

function computeState(sessions: AttendanceSessionResponse[]): CachedState {
  const held = new Set<string>();
  const active = new Set<string>();
  for (const session of sessions) {
    const key = session.scheduleSlotKey?.trim();
    if (!key) continue;
    if (session.status === "CLOSED") {
      held.add(key);
      active.delete(key);
    } else if (session.status === "OPEN" && !held.has(key)) {
      active.add(key);
    }
  }
  return { heldSlotKeys: held, activeSlotKeys: active };
}

/** Synchronous read of the last-fetched state; empty until `refreshScheduleAttendanceState` resolves once. */
export function getScheduleAttendanceState(courseId: string): {
  heldSlotKeys: Set<string>;
  activeSlotKeys: Set<string>;
} {
  if (!courseId) return EMPTY_STATE;
  return cache.get(courseId) ?? EMPTY_STATE;
}

/** Fetches live attendance sessions for the course and refreshes the cache. Safe to call repeatedly;
 * concurrent calls for the same course share one in-flight request. Never rejects — on a network/API
 * failure it falls back to whatever was last cached (or empty sets), the same graceful degradation
 * the old localStorage-backed version had by construction, since callers (dashboard fetches, render
 * paths) must not break just because the attendance API is briefly unavailable. */
export async function refreshScheduleAttendanceState(courseId: string): Promise<{
  heldSlotKeys: Set<string>;
  activeSlotKeys: Set<string>;
}> {
  if (!courseId) return EMPTY_STATE;
  const existing = inflight.get(courseId);
  if (existing) return existing;

  const request = eduhubAttendance
    .listSessions(courseId)
    .then((sessions) => {
      const state = computeState(sessions);
      cache.set(courseId, state);
      emitChanged(courseId);
      return state;
    })
    .catch(() => cache.get(courseId) ?? EMPTY_STATE)
    .finally(() => {
      inflight.delete(courseId);
    });
  inflight.set(courseId, request);
  return request;
}
