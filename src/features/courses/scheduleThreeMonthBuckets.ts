/** Shared helpers: split a flat session list into month buckets (admin editor + instructor review). */

export type ScheduleSlotRow = {
  title?: string;
  sessionDate?: string;
  sessionTime?: string;
  durationMinutes?: number;
};

export type MonthSessions = [ScheduleSlotRow[], ScheduleSlotRow[], ScheduleSlotRow[]];
export type FlexibleMonthSessions = ScheduleSlotRow[][];

function ordinalMonthLabel(monthIndex: number): string {
  const n = monthIndex + 1;
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

export function adminScheduleMonthHeading(monthIndex: number): string {
  return `Sessions in ${ordinalMonthLabel(monthIndex)} month`;
}

export function adminScheduleMonthBlurb(monthIndex: number, isLastMonth: boolean): string {
  if (monthIndex === 0) {
    return "Planned sessions for the first month of the class window. The instructor will confirm the full schedule.";
  }
  if (isLastMonth) {
    return "Planned sessions for this month. When loading an existing plan, sessions dated after earlier months are grouped in the last month shown.";
  }
  return `Planned sessions for the ${ordinalMonthLabel(monthIndex)} month. Optional dates/times below feed the same class schedule.`;
}

export function padScheduleSlots(n: number, raw?: ScheduleSlotRow[]): ScheduleSlotRow[] {
  const base = Array.isArray(raw)
    ? raw.map((s) => ({
        title: s.title ?? "",
        sessionDate: s.sessionDate ?? "",
        sessionTime: s.sessionTime ?? "",
        durationMinutes: s.durationMinutes,
      }))
    : [];
  const out = base.slice(0, Math.max(0, n));
  while (out.length < n) {
    out.push({ title: "", sessionDate: "", sessionTime: "", durationMinutes: undefined });
  }
  return out;
}

function yearMonthKey(sessionDate: string | undefined): string | null {
  if (!sessionDate?.trim()) return null;
  const d = new Date(sessionDate.trim());
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** By calendar month when dates exist; otherwise split evenly by index. */
export function distributeSessionsIntoThreeMonths(
  paddedFlat: ScheduleSlotRow[],
  options?: { emptyEditorDefaults?: boolean },
): {
  counts: [number, number, number];
  buckets: MonthSessions;
} {
  const total = paddedFlat.length;
  if (total === 0) {
    if (options?.emptyEditorDefaults) {
      return {
        counts: [1, 1, 1],
        buckets: [padScheduleSlots(1, []), padScheduleSlots(1, []), padScheduleSlots(1, [])],
      };
    }
    return {
      counts: [0, 0, 0],
      buckets: [[], [], []],
    };
  }

  const sorted = [...paddedFlat].sort((a, b) => {
    const da = a.sessionDate?.trim() ? new Date(a.sessionDate.trim()).getTime() : NaN;
    const db = b.sessionDate?.trim() ? new Date(b.sessionDate.trim()).getTime() : NaN;
    if (Number.isNaN(da) && Number.isNaN(db)) return 0;
    if (Number.isNaN(da)) return 1;
    if (Number.isNaN(db)) return -1;
    return da - db;
  });

  const keysOrdered: string[] = [];
  const seen = new Set<string>();
  for (const s of sorted) {
    const k = yearMonthKey(s.sessionDate);
    if (k && !seen.has(k)) {
      seen.add(k);
      keysOrdered.push(k);
    }
  }

  const b0: ScheduleSlotRow[] = [];
  const b1: ScheduleSlotRow[] = [];
  const b2: ScheduleSlotRow[] = [];

  if (keysOrdered.length === 0) {
    const n0 = Math.ceil(total / 3);
    const n1 = Math.ceil((total - n0) / 2);
    const n2 = Math.max(0, total - n0 - n1);
    return {
      counts: [n0, n1, n2],
      buckets: [
        padScheduleSlots(n0, paddedFlat.slice(0, n0)),
        padScheduleSlots(n1, paddedFlat.slice(n0, n0 + n1)),
        padScheduleSlots(n2, paddedFlat.slice(n0 + n1)),
      ],
    };
  }

  for (const s of sorted) {
    const k = yearMonthKey(s.sessionDate);
    if (!k) {
      b0.push(s);
      continue;
    }
    const idx = keysOrdered.indexOf(k);
    if (idx <= 0) b0.push(s);
    else if (idx === 1) b1.push(s);
    else b2.push(s);
  }

  return {
    counts: [b0.length, b1.length, b2.length],
    buckets: [padScheduleSlots(b0.length, b0), padScheduleSlots(b1.length, b1), padScheduleSlots(b2.length, b2)],
  };
}

/** Calendar month per bucket when dates exist; otherwise same 3-way split as legacy editor. */
export function distributeSessionsIntoMonths(
  paddedFlat: ScheduleSlotRow[],
  options?: { emptyEditorDefaults?: boolean },
): { counts: number[]; buckets: FlexibleMonthSessions } {
  const total = paddedFlat.length;
  if (total === 0) {
    if (options?.emptyEditorDefaults) {
      return {
        counts: [4],
        buckets: [padScheduleSlots(4, [])],
      };
    }
    return { counts: [], buckets: [] };
  }

  const sorted = [...paddedFlat].sort((a, b) => {
    const da = a.sessionDate?.trim() ? new Date(a.sessionDate.trim()).getTime() : NaN;
    const db = b.sessionDate?.trim() ? new Date(b.sessionDate.trim()).getTime() : NaN;
    if (Number.isNaN(da) && Number.isNaN(db)) return 0;
    if (Number.isNaN(da)) return 1;
    if (Number.isNaN(db)) return -1;
    return da - db;
  });

  const keysOrdered: string[] = [];
  const seen = new Set<string>();
  for (const s of sorted) {
    const k = yearMonthKey(s.sessionDate);
    if (k && !seen.has(k)) {
      seen.add(k);
      keysOrdered.push(k);
    }
  }

  if (keysOrdered.length === 0) {
    const legacy = distributeSessionsIntoThreeMonths(paddedFlat);
    return {
      counts: [...legacy.counts],
      buckets: legacy.buckets.map((b) => [...b]),
    };
  }

  const buckets: ScheduleSlotRow[][] = keysOrdered.map(() => []);
  for (const s of sorted) {
    const k = yearMonthKey(s.sessionDate);
    if (!k) {
      buckets[0].push(s);
      continue;
    }
    const idx = keysOrdered.indexOf(k);
    buckets[idx].push(s);
  }

  const counts = buckets.map((b) => b.length);
  return {
    counts,
    buckets: buckets.map((b, i) => padScheduleSlots(counts[i], b)),
  };
}

export type ScheduleMonthSection = { heading: string; blurb: string };

export const ADMIN_SCHEDULE_MONTH_SECTIONS: ScheduleMonthSection[] = [
  {
    heading: "Sessions in 1st month",
    blurb: "Planned sessions for the first month of the 6‑month window. The instructor will confirm the full schedule.",
  },
  {
    heading: "Sessions in 2nd month",
    blurb: "Planned sessions for the second month. Optional dates/times below feed the same class schedule.",
  },
  {
    heading: "Sessions in 3rd month",
    blurb: "Planned sessions for the third month and later (any session dated after the second calendar month is grouped here when loading).",
  },
];

export const TEACHER_SCHEDULE_MONTH_SECTIONS: ScheduleMonthSection[] = [
  {
    heading: "Sessions in 1st month",
    blurb: "Sessions planned for the first month of the 6‑month window.",
  },
  {
    heading: "Sessions in 2nd month",
    blurb: "Sessions planned for the second month.",
  },
  {
    heading: "Sessions in 3rd month",
    blurb: "Sessions planned for the third month and later (sessions after the second calendar month are grouped here).",
  },
];
