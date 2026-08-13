/** Odd = Mon/Wed/Fri; Even = Tue/Thu/Sat (admin schedule day-pattern picker). */

export type ScheduleDayPattern = "odd" | "even";

const STORAGE_KEY = "eduhub-schedule-day-pattern";

function parseLocalDateInput(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isOddWeekday(day: number): boolean {
  return day === 1 || day === 3 || day === 5;
}

function isEvenWeekday(day: number): boolean {
  return day === 2 || day === 4 || day === 6;
}

/** Infer Odd/Even from session dates when every dated session matches one pattern. */
export function inferScheduleDayPattern(
  sessionDates: Array<string | undefined | null>,
): ScheduleDayPattern | null {
  const weekdays: number[] = [];
  for (const raw of sessionDates) {
    const d = parseLocalDateInput(raw);
    if (!d) continue;
    const day = d.getDay();
    if (day === 0) return null;
    weekdays.push(day);
  }
  if (weekdays.length < 2) return null;
  if (weekdays.every(isOddWeekday)) return "odd";
  if (weekdays.every(isEvenWeekday)) return "even";
  return null;
}

function readAll(): Record<string, ScheduleDayPattern> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, ScheduleDayPattern> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (value === "odd" || value === "even") out[id] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function getStoredScheduleDayPattern(courseId: string): ScheduleDayPattern | null {
  if (!courseId) return null;
  return readAll()[courseId] ?? null;
}

export function setStoredScheduleDayPattern(courseId: string, pattern: ScheduleDayPattern): void {
  if (!courseId || typeof window === "undefined") return;
  try {
    const all = readAll();
    all[courseId] = pattern;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("eduhub-schedule-day-pattern-changed", { detail: { courseId } }));
  } catch {
    // Ignore quota / private mode.
  }
}

/** Prefer admin-saved selection; fall back to inferring from session dates. */
export function resolveScheduleDayPattern(
  courseId: string,
  sessionDates: Array<string | undefined | null>,
): ScheduleDayPattern | null {
  return getStoredScheduleDayPattern(courseId) ?? inferScheduleDayPattern(sessionDates);
}
